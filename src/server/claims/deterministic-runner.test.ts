import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { ClaimInput } from '@/domain/types';

import { DeterministicClaimRunner } from './deterministic-runner';

async function triage(input: ClaimInput) {
  const outcome = await new DeterministicClaimRunner().run({
    claimId: randomUUID(),
    input,
    abortSignal: new AbortController().signal,
    emit: async () => undefined,
  });
  return outcome.result;
}

const complete: Pick<ClaimInput, 'policyNumber' | 'incidentDate' | 'evidence'> = {
  policyNumber: 'CL-DEMO-001',
  incidentDate: '2026-10-20',
  evidence: ['baggage_report', 'travel_itinerary', 'expense_receipts'],
};

describe('DeterministicClaimRunner coverage oracle', () => {
  it('treats a six-hour delay as not eligible and cites 4.2', async () => {
    const result = await triage({
      ...complete,
      delayHours: 6,
      reason: 'airline_delay',
    });

    expect(result?.classification).toBe('needs_review');
    expect(result?.citations.map((item) => item.clause)).toEqual(['4.2']);
  });

  it('cites 4.2 for a short delay without treating it as customs', async () => {
    const result = await triage({
      ...complete,
      delayHours: 5,
      reason: 'airline_delay',
    });

    expect(result?.classification).toBe('needs_review');
    expect(result?.citations.map((item) => item.clause)).toEqual(['4.2']);
  });

  it('cites 4.4 when notes describe a customs detention', async () => {
    const result = await triage({
      ...complete,
      delayHours: 14,
      reason: 'airline_delay',
      notes: 'Bags were detained by customs overnight.',
    });

    expect(result?.classification).toBe('needs_review');
    expect(result?.citations.map((item) => item.clause)).toEqual(['4.4']);
  });

  it('keeps a 14-hour airline delay with full evidence as likely covered', async () => {
    const result = await triage({
      ...complete,
      delayHours: 14,
      reason: 'airline_delay',
    });

    expect(result?.classification).toBe('likely_covered');
    expect(result?.citations.map((item) => item.clause)).toEqual(['4.2']);
  });
});
