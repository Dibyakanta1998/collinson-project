import { nowIso, type ClaimEvent } from '@/domain/events';
import { ClaimConflictError, ClaimFailure } from '@/domain/failures';
import type { ApprovalDecision, ClaimInput } from '@/domain/types';
import type { ClaimsRepository, StoredClaim } from '@/server/db/claims-repository';

import { ClaimEventBus } from './event-bus';
import type { ClaimRunner } from './runner';

export class ClaimService {
  constructor(
    private readonly repository: ClaimsRepository,
    private readonly runner: ClaimRunner,
    private readonly events = new ClaimEventBus(),
  ) {}

  subscribe(claimId: string, listener: (event: ClaimEvent) => void) {
    return this.events.subscribe(claimId, listener);
  }

  listEvents(claimId: string) {
    return this.repository.listEvents(claimId);
  }

  get(id: string) {
    return this.repository.get(id);
  }

  async submit(input: ClaimInput, idempotencyKey?: string): Promise<StoredClaim> {
    const claim = await this.repository.create(input, idempotencyKey);
    if (claim.status === 'received') {
      void this.execute(claim.id, input);
    }
    return claim;
  }

  async approve(id: string, decision: ApprovalDecision): Promise<StoredClaim> {
    const claim = await this.require(id);
    if (!claim.runId) throw new ClaimFailure('internal_failure', 'Claim has no run to resume.');

    await this.repository.recordApproval(id, decision);
    await this.emit(id, {
      type: 'approval_recorded',
      decision: decision.decision,
      occurredAt: nowIso(),
    });

    if (decision.decision === 'approve') {
      await this.runner.resume?.(claim.runId, decision.note);
    }

    const status =
      decision.decision === 'approve'
        ? 'approved'
        : decision.decision === 'decline'
          ? 'declined'
          : 'changes_requested';
    await this.emit(id, { type: 'completed', status, occurredAt: nowIso() });
    return this.require(id);
  }

  private async execute(claimId: string, input: ClaimInput) {
    const runId = crypto.randomUUID();
    try {
      await this.repository.markRunning(claimId, runId);
      const outcome = await this.runner.run({
        claimId,
        input,
        abortSignal: AbortSignal.timeout(60_000),
        emit: (event) => this.emit(claimId, event),
      });
      if (!outcome.result) {
        throw new ClaimFailure('malformed_model_output', 'Triage completed without a result.');
      }
      await this.repository.suspend(claimId, outcome.runId, outcome.result);
      await this.emit(claimId, { type: 'completed', status: 'suspended', occurredAt: nowIso() });
    } catch (error) {
      const failure = toFailure(error);
      await this.repository.fail(claimId, {
        code: failure.code,
        message: failure.message,
      });
      await this.emit(claimId, {
        type: 'error',
        code: failure.code,
        message: failure.message,
        occurredAt: nowIso(),
      });
      await this.emit(claimId, { type: 'completed', status: 'failed', occurredAt: nowIso() });
    }
  }

  private async emit(claimId: string, event: ClaimEvent) {
    await this.repository.appendEvent(claimId, event);
    this.events.publish(claimId, event);
  }

  private async require(id: string): Promise<StoredClaim> {
    const claim = await this.repository.get(id);
    if (!claim) throw new ClaimFailure('invalid_input', `Claim ${id} was not found.`);
    return claim;
  }
}

export { ClaimConflictError };

function toFailure(error: unknown): ClaimFailure {
  if (error instanceof ClaimFailure) return error;
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return new ClaimFailure('model_timeout', 'The model timed out before triage completed.');
  }
  return new ClaimFailure(
    'internal_failure',
    error instanceof Error ? error.message : 'Unexpected claim failure.',
  );
}
