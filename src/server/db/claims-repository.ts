import { randomUUID } from 'node:crypto';

import type { Pool } from 'pg';

import {
  approvalDecisionSchema,
  claimInputSchema,
  type ApprovalDecision,
  type ClaimInput,
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
  approvals: StoredApproval[];
  createdAt: string;
  updatedAt: string;
}

const decisionStatus: Record<ApprovalDecision['decision'], ClaimStatus> = {
  approve: 'approved',
  request_changes: 'changes_requested',
  decline: 'declined',
};

export class PgClaimsRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: ClaimInput): Promise<StoredClaim> {
    const validInput = claimInputSchema.parse(input);
    const id = randomUUID();
    await this.pool.query(
      `INSERT INTO claims (id, input, status)
       VALUES ($1, $2::jsonb, 'received')`,
      [id, JSON.stringify(validInput)],
    );

    const claim = await this.get(id);
    if (!claim) throw new Error('Claim was not persisted.');
    return claim;
  }

  async suspend(id: string, runId: string): Promise<void> {
    const result = await this.pool.query(
      `UPDATE claims
       SET status = 'suspended', run_id = $2, updated_at = NOW()
       WHERE id = $1`,
      [id, runId],
    );
    if (result.rowCount !== 1) throw new Error(`Claim ${id} was not found.`);
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
        throw new Error(`Claim ${id} is not awaiting approval.`);
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

    const row = result.rows[0] as {
      id: string;
      input: unknown;
      status: ClaimStatus;
      run_id: string | null;
      created_at: Date;
      updated_at: Date;
      approvals: Array<{
        id: string;
        decision: ApprovalDecision['decision'];
        note: string;
        created_at: string;
      }>;
    };

    return {
      id: row.id,
      input: claimInputSchema.parse(row.input),
      status: row.status,
      runId: row.run_id,
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
}
