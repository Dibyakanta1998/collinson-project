import type { ClaimInput } from '@/domain/types';

export const coveredExample: ClaimInput = {
  policyNumber: 'CL-DEMO-001',
  incidentDate: '2026-10-20',
  delayHours: 14,
  reason: 'airline_delay',
  evidence: ['baggage_report', 'travel_itinerary', 'expense_receipts'],
  notes: 'Baggage arrived the following morning.',
};

export const missingReceiptsExample: ClaimInput = {
  policyNumber: 'CL-DEMO-002',
  incidentDate: '2026-10-21',
  delayHours: 9,
  reason: 'misrouting',
  evidence: ['baggage_report', 'travel_itinerary'],
  notes: 'Essential items were purchased but the receipts were misplaced.',
};
