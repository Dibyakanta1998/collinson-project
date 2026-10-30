import { randomUUID } from 'node:crypto';

import type { Pool } from 'pg';

import { claimEventSchema, type ClaimEvent } from '@/domain/events';
import { ClaimConflictError, type ClaimFailure } from '@/domain/failures';
import {
  approvalDecisionSchema,
  claimInputSchema,
  triageResultSchema,
  type ApprovalDecision,
  type ClaimInput,
  type TriageResult,
} from '@/domain/types';

export type ClaimStatus =
  | 'received'
  | 'running'
  | 'suspended'
  | 'approved'
  | 'changes_requested'
  | 'declined'
  | 'failed';

export interface StoredApproval extends ApprovalDecision {
  id: string;
  createdAt: string;
}

export interface StoredClaim {
  id: string;
  input: ClaimInput;
  status: ClaimStatus;
  runId: string | null;
  result: TriageResult | null;
  lastError: { code: string; message: string } | null;
  idempotencyKey: string | null;
  approvals: StoredApproval[];
  createdAt: string;
  updatedAt: string;
}

export interface ClaimsRepository {
  create(input: ClaimInput, idempotencyKey?: string): Promise<StoredClaim>;
  get(id: string): Promise<StoredClaim | null>;
  markRunning(id: string, runId: string): Promise<void>;
  suspend(id: string, runId: string, result: TriageResult): Promise<void>;
  recordApproval(id: string, decision: ApprovalDecision): Promise<void>;
  fail(id: string, error: Pick<ClaimFailure, 'code' | 'message'>): Promise<void>;
  appendEvent(id: string, event: ClaimEvent): Promise<void>;
  listEvents(id: string): Promise<ClaimEvent[]>;
}

const decisionStatus: Record<ApprovalDecision['decision'], ClaimStatus> = {
  approve: 'approved',
  request_changes: 'changes_requested',
  decline: 'declined',
};

interface ClaimRow {
  id: string;
  input: unknown;
  status: ClaimStatus;
  run_id: string | null;
  result: unknown;
  last_error: { code: string; message: string } | null;
  idempotency_key: string | null;
  created_at: Date;
  updated_at: Date;
  approvals: Array<{
    id: string;
    decision: ApprovalDecision['decision'];
    note: string;
    created_at: string;
  }>;
}

function mapClaim(row: ClaimRow): StoredClaim {
  return {
    id: row.id,
    input: claimInputSchema.parse(row.input),
    status: row.status,
    runId: row.run_id,
    result: row.result ? triageResultSchema.parse(row.result) : null,
    lastError: row.last_error,
    idempotencyKey: row.idempotency_key,
    approvals: row.approvals.map((approval) => ({
      id: approval.id,
      decision: approval.decision,
      note: approval.note,
      createdAt: new Date(approval.created_at).toISOString(),
    })),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class PgClaimsRepository implements ClaimsRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: ClaimInput, idempotencyKey?: string): Promise<StoredClaim> {
    const validInput = claimInputSchema.parse(input);
    if (idempotencyKey) {
      const existing = await this.pool.query(
        'SELECT id FROM claims WHERE idempotency_key = $1',
        [idempotencyKey],
      );
      if (existing.rowCount === 1) {
        const claim = await this.get(existing.rows[0].id as string);
        if (!claim) throw new Error('Idempotent claim was not persisted.');
        return claim;
      }
    }

    const id = randomUUID();
    try {
      await this.pool.query(
        `INSERT INTO claims (id, input, status, idempotency_key)
         VALUES ($1, $2::jsonb, 'received', $3)`,
        [id, JSON.stringify(validInput), idempotencyKey ?? null],
      );
    } catch (error) {
      if (idempotencyKey && isUniqueViolation(error)) {
        return this.create(validInput, idempotencyKey);
      }
      throw error;
    }

    const claim = await this.get(id);
    if (!claim) throw new Error('Claim was not persisted.');
    return claim;
  }

  async markRunning(id: string, runId: string): Promise<void> {
    const updated = await this.pool.query(
      `UPDATE claims
       SET status = 'running', run_id = $2, updated_at = NOW()
       WHERE id = $1`,
      [id, runId],
    );
    if (updated.rowCount !== 1) throw new Error(`Claim ${id} was not found.`);
  }

  async suspend(id: string, runId: string, result: TriageResult): Promise<void> {
    const validResult = triageResultSchema.parse(result);
    const updated = await this.pool.query(
      `UPDATE claims
       SET status = 'suspended', run_id = $2, result = $3::jsonb, updated_at = NOW()
       WHERE id = $1`,
      [id, runId, JSON.stringify(validResult)],
    );
    if (updated.rowCount !== 1) throw new Error(`Claim ${id} was not found.`);
  }

  async recordApproval(id: string, decision: ApprovalDecision): Promise<void> {
    const validDecision = approvalDecisionSchema.parse(decision);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const updated = await client.query(
        `UPDATE claims SET status = $2, updated_at = NOW()
         WHERE id = $1 AND status = 'suspended'`,
        [id, decisionStatus[validDecision.decision]],
      );
      if (updated.rowCount !== 1) {
        throw new ClaimConflictError(`Claim ${id} is not awaiting approval.`);
      }
      await client.query(
        `INSERT INTO approval_events (id, claim_id, decision, note)
         VALUES ($1, $2, $3, $4)`,
        [randomUUID(), id, validDecision.decision, validDecision.note],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async fail(id: string, error: Pick<ClaimFailure, 'code' | 'message'>): Promise<void> {
    const updated = await this.pool.query(
      `UPDATE claims
       SET status = 'failed', last_error = $2::jsonb, updated_at = NOW()
       WHERE id = $1`,
      [id, JSON.stringify({ code: error.code, message: error.message })],
    );
    if (updated.rowCount !== 1) throw new Error(`Claim ${id} was not found.`);
  }

  async appendEvent(id: string, event: ClaimEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO audit_events (id, claim_id, event_type, payload)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [randomUUID(), id, event.type, JSON.stringify(event)],
    );
  }

  async listEvents(id: string): Promise<ClaimEvent[]> {
    const result = await this.pool.query(
      `SELECT payload FROM audit_events
       WHERE claim_id = $1
       ORDER BY created_at ASC`,
      [id],
    );
    return result.rows.map((row) => claimEventSchema.parse(row.payload));
  }

  async get(id: string): Promise<StoredClaim | null> {
    const result = await this.pool.query(
      `SELECT c.*, COALESCE(
         json_agg(a ORDER BY a.created_at) FILTER (WHERE a.id IS NOT NULL),
         '[]'::json
       ) AS approvals
       FROM claims c
       LEFT JOIN approval_events a ON a.claim_id = c.id
       WHERE c.id = $1
       GROUP BY c.id`,
      [id],
    );
    if (result.rowCount !== 1) return null;
    return mapClaim(result.rows[0] as ClaimRow);
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}
