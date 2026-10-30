import { z } from 'zod';

export const evidenceTypeSchema = z.enum([
  'baggage_report',
  'travel_itinerary',
  'expense_receipts',
]);

export const claimInputSchema = z.object({
  policyNumber: z.string().trim().min(3).max(64),
  incidentDate: z.iso.date(),
  delayHours: z.number().int().min(0).max(720),
  reason: z.enum(['airline_delay', 'misrouting', 'unknown', 'other']),
  evidence: z.array(evidenceTypeSchema).max(3),
  notes: z.string().trim().max(1_000).optional(),
});

export const citationSchema = z.object({
  clause: z.string().min(1),
  excerpt: z.string().min(1),
});

export const coverageFindingSchema = z.object({
  status: z.enum(['eligible', 'excluded', 'unclear', 'unavailable']),
  confidence: z.number().min(0).max(1),
  citations: z.array(citationSchema),
  rationale: z.string().min(1),
});

export const evidenceFindingSchema = z.object({
  status: z.enum(['complete', 'incomplete']),
  present: z.array(evidenceTypeSchema),
  missing: z.array(evidenceTypeSchema),
});

export const triageResultSchema = z.object({
  classification: z.enum([
    'likely_covered',
    'needs_review',
    'insufficient_information',
  ]),
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1),
  nextActions: z.array(z.string().min(1)),
  citations: z.array(citationSchema),
  requiresApproval: z.boolean(),
});

export const approvalDecisionSchema = z.object({
  decision: z.enum(['approve', 'request_changes', 'decline']),
  note: z.string().trim().min(3).max(1_000),
});

export const usageSchema = z.object({
  agentId: z.string().min(1),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  latencyMs: z.number().int().nonnegative(),
});

export type ClaimInput = z.infer<typeof claimInputSchema>;
export type CoverageFinding = z.infer<typeof coverageFindingSchema>;
export type EvidenceFinding = z.infer<typeof evidenceFindingSchema>;
export type TriageResult = z.infer<typeof triageResultSchema>;
export type ApprovalDecision = z.infer<typeof approvalDecisionSchema>;
export type Usage = z.infer<typeof usageSchema>;
