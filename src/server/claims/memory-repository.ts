import { randomUUID } from 'node:crypto';

import { ClaimConflictError } from '@/domain/failures';
import type { ClaimEvent } from '@/domain/events';
import {
  approvalDecisionSchema,
  claimInputSchema,
  triageResultSchema,
  type ApprovalDecision,
  type ClaimInput,
  type TriageResult,
} from '@/domain/types';

import type {
  ClaimsRepository,
  ClaimStatus,
  StoredApproval,
  StoredClaim,
} from '@/server/db/claims-repository';

const decisionStatus: Record<ApprovalDecision['decision'], ClaimStatus> = {
  approve: 'approved',
  request_changes: 'changes_requested',
  decline: 'declined',
};

interface MemoryRecord {
  claim: StoredClaim;
  events: ClaimEvent[];
}

export class MemoryClaimsRepository implements ClaimsRepository {
  private readonly records = new Map<string, MemoryRecord>();
  private readonly idempotency = new Map<string, string>();

  async create(input: ClaimInput, idempotencyKey?: string): Promise<StoredClaim> {
    const validInput = claimInputSchema.parse(input);
    if (idempotencyKey && this.idempotency.has(idempotencyKey)) {
      return this.getRequired(this.idempotency.get(idempotencyKey)!);
    }

    const now = new Date().toISOString();
    const claim: StoredClaim = {
      id: randomUUID(),
      input: validInput,
      status: 'received',
      runId: null,
      result: null,
      lastError: null,
      idempotencyKey: idempotencyKey ?? null,
      approvals: [],
      createdAt: now,
      updatedAt: now,
    };
    this.records.set(claim.id, { claim, events: [] });
    if (idempotencyKey) this.idempotency.set(idempotencyKey, claim.id);
    return structuredClone(claim);
  }

  async get(id: string): Promise<StoredClaim | null> {
    const record = this.records.get(id);
    return record ? structuredClone(record.claim) : null;
  }

  async markRunning(id: string, runId: string): Promise<void> {
    const record = this.require(id);
    record.claim.status = 'running';
    record.claim.runId = runId;
    record.claim.updatedAt = new Date().toISOString();
  }

  async suspend(id: string, runId: string, result: TriageResult): Promise<void> {
    const record = this.require(id);
    record.claim.status = 'suspended';
    record.claim.runId = runId;
    record.claim.result = triageResultSchema.parse(result);
    record.claim.updatedAt = new Date().toISOString();
  }

  async recordApproval(id: string, decision: ApprovalDecision): Promise<void> {
    const record = this.require(id);
    const validDecision = approvalDecisionSchema.parse(decision);
    if (record.claim.status !== 'suspended') {
      throw new ClaimConflictError(`Claim ${id} is not awaiting approval.`);
    }

    const approval: StoredApproval = {
      id: randomUUID(),
      ...validDecision,
      createdAt: new Date().toISOString(),
    };
    record.claim.status = decisionStatus[validDecision.decision];
    record.claim.approvals.push(approval);
    record.claim.updatedAt = approval.createdAt;
  }

  async fail(id: string, error: { code: string; message: string }): Promise<void> {
    const record = this.require(id);
    record.claim.status = 'failed';
    record.claim.lastError = { code: error.code, message: error.message };
    record.claim.updatedAt = new Date().toISOString();
  }

  async appendEvent(id: string, event: ClaimEvent): Promise<void> {
    this.require(id).events.push(event);
  }

  async listEvents(id: string): Promise<ClaimEvent[]> {
    return structuredClone(this.require(id).events);
  }

  private require(id: string): MemoryRecord {
    const record = this.records.get(id);
    if (!record) throw new Error(`Claim ${id} was not found.`);
    return record;
  }

  private async getRequired(id: string): Promise<StoredClaim> {
    const claim = await this.get(id);
    if (!claim) throw new Error(`Claim ${id} was not found.`);
    return claim;
  }
}
