import { describe, expect, it } from 'vitest';

import { decideTriage } from './triage';
import type { CoverageFinding, EvidenceFinding } from './types';

const eligibleCoverage: CoverageFinding = {
  status: 'eligible',
  confidence: 0.92,
  citations: [{ clause: '4.2', excerpt: 'Baggage delayed for more than 6 hours.' }],
  rationale: 'Delay meets the policy threshold.',
};

const completeEvidence: EvidenceFinding = {
  status: 'complete',
  present: ['baggage_report', 'travel_itinerary', 'expense_receipts'],
  missing: [],
};

describe('decideTriage', () => {
  it('marks an eligible claim with complete evidence as likely covered', () => {
    expect(decideTriage(eligibleCoverage, completeEvidence).classification).toBe(
      'likely_covered',
    );
  });

  it('requires review when receipts are missing', () => {
    const evidence: EvidenceFinding = {
      status: 'incomplete',
      present: ['baggage_report', 'travel_itinerary'],
      missing: ['expense_receipts'],
    };

    expect(decideTriage(eligibleCoverage, evidence).classification).toBe('needs_review');
  });

  it('does not turn an unavailable policy lookup into a denial', () => {
    const unavailable: CoverageFinding = {
      status: 'unavailable',
      confidence: 0,
      citations: [],
      rationale: 'Policy service unavailable.',
    };

    expect(decideTriage(unavailable, completeEvidence).classification).toBe(
      'insufficient_information',
    );
  });
});
