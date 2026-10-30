import { describe, expect, it } from 'vitest';

import { buildCaseBrief } from './case-brief';

describe('buildCaseBrief', () => {
  it('creates a bounded role-neutral claim summary', () => {
    const brief = buildCaseBrief({
      policyNumber: 'CL-DEMO-001',
      incidentDate: '2026-10-20',
      delayHours: 14,
      reason: 'airline_delay',
      evidence: ['baggage_report', 'travel_itinerary'],
      notes: '  Baggage arrived the following morning.  ',
    });

    expect(brief).toEqual({
      policyReference: 'CL-DEMO-001',
      incidentDate: '2026-10-20',
      delayHours: 14,
      reason: 'airline_delay',
      evidence: ['baggage_report', 'travel_itinerary'],
      sanitizedNotes: 'Baggage arrived the following morning.',
    });
  });
});
