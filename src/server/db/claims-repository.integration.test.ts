import { randomUUID } from 'node:crypto';

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runMigrations } from './migrate';
import { PgClaimsRepository } from './claims-repository';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase('PgClaimsRepository', () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new PgClaimsRepository(pool);

  beforeAll(async () => {
    await runMigrations(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('persists a suspended claim and its approval audit', async () => {
    const claim = await repository.create({
      policyNumber: `CL-${randomUUID()}`,
      incidentDate: '2026-10-20',
      delayHours: 14,
      reason: 'airline_delay',
      evidence: ['baggage_report', 'travel_itinerary', 'expense_receipts'],
    });

    await repository.suspend(claim.id, 'run-123', {
      classification: 'likely_covered',
      confidence: 0.92,
      summary: 'Claim meets the provisional requirements.',
      nextActions: ['Await human approval.'],
      citations: [{ clause: '4.2', excerpt: 'Delayed more than six hours.' }],
      requiresApproval: true,
    });
    await repository.recordApproval(claim.id, {
      decision: 'approve',
      note: 'Coverage and evidence reviewed.',
    });

    const restored = await repository.get(claim.id);
    expect(restored?.status).toBe('approved');
    expect(restored?.runId).toBe('run-123');
    expect(restored?.result?.classification).toBe('likely_covered');
    expect(restored?.approvals).toHaveLength(1);
  });
});
