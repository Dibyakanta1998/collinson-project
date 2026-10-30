import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import {
  evidenceFindingSchema,
  evidenceTypeSchema,
  type EvidenceFinding,
} from '@/domain/types';

const requiredEvidence = evidenceTypeSchema.options;

export function reviewEvidence(
  present: Array<(typeof requiredEvidence)[number]>,
): EvidenceFinding {
  const presentSet = new Set(present);
  const missing = requiredEvidence.filter((item) => !presentSet.has(item));

  return {
    status: missing.length === 0 ? 'complete' : 'incomplete',
    present: requiredEvidence.filter((item) => presentSet.has(item)),
    missing,
  };
}

export const reviewEvidenceTool = createTool({
  id: 'review-evidence',
  description: 'Compare submitted evidence metadata with policy evidence requirements.',
  inputSchema: z.object({
    evidence: z.array(evidenceTypeSchema),
  }),
  outputSchema: evidenceFindingSchema,
  execute: async ({ evidence }) => reviewEvidence(evidence),
});
