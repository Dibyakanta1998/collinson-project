import { describe, expect, it } from 'vitest';

import { reviewEvidence } from './evidence';

describe('reviewEvidence', () => {
  it('reports required evidence that is missing', () => {
    expect(reviewEvidence(['baggage_report', 'travel_itinerary'])).toEqual({
      status: 'incomplete',
      present: ['baggage_report', 'travel_itinerary'],
      missing: ['expense_receipts'],
    });
  });

  it('accepts a complete evidence set', () => {
    expect(
      reviewEvidence([
        'baggage_report',
        'travel_itinerary',
        'expense_receipts',
      ]).status,
    ).toBe('complete');
  });
});
