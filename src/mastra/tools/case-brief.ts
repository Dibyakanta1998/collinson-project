import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { claimInputSchema, type ClaimInput } from '@/domain/types';

export const caseBriefSchema = z.object({
  policyReference: z.string(),
  incidentDate: z.iso.date(),
  delayHours: z.number().int().nonnegative(),
  reason: claimInputSchema.shape.reason,
  evidence: claimInputSchema.shape.evidence,
  sanitizedNotes: z.string().max(1_000),
});

export function buildCaseBrief(claim: ClaimInput) {
  const input = claimInputSchema.parse(claim);
  return caseBriefSchema.parse({
    policyReference: input.policyNumber,
    incidentDate: input.incidentDate,
    delayHours: input.delayHours,
    reason: input.reason,
    evidence: input.evidence,
    sanitizedNotes: input.notes?.trim() ?? '',
  });
}

export const buildCaseBriefTool = createTool({
  id: 'build-case-brief',
  description: 'Create a compact structured claim brief for specialist delegation.',
  inputSchema: claimInputSchema,
  outputSchema: caseBriefSchema,
  execute: async (claim) => buildCaseBrief(claim),
});
