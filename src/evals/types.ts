import { z } from 'zod';

import { claimEventSchema } from '@/domain/events';
import { claimFailureCodeSchema } from '@/domain/failures';
import { claimInputSchema, triageResultSchema } from '@/domain/types';

export const citationGoldSchema = z.object({
  clause: z.string().min(1),
  excerptMustContain: z.string().min(1),
});

export const evalGroundTruthSchema = z.object({
  classification: z.enum([
    'likely_covered',
    'needs_review',
    'insufficient_information',
  ]).optional(),
  failureCode: z.string().optional(),
  citations: z.array(citationGoldSchema).default([]),
  forbiddenCitations: z.array(z.string()).default([]),
  requiredAgents: z.array(z.string()),
  requiredTools: z.array(z.string()),
  forbiddenTools: z.array(z.string()),
  requiresApproval: z.boolean(),
});

export const evalCaseSchema = z.object({
  id: z.string(),
  input: claimInputSchema,
  expected: evalGroundTruthSchema,
});

export const claimEvalOutputSchema = z.object({
  events: z.array(claimEventSchema),
  result: triageResultSchema.optional(),
  failureCode: claimFailureCodeSchema.optional(),
});

export type EvalCase = z.infer<typeof evalCaseSchema>;
export type EvalGroundTruth = z.infer<typeof evalGroundTruthSchema>;
export type ClaimEvalOutput = z.infer<typeof claimEvalOutputSchema>;

export interface Score {
  name: string;
  passed: boolean;
  detail: string;
}

export interface EvalResult {
  id: string;
  passed: boolean;
  scores: Score[];
}

export const MUST_PASS_SCORER_IDS = [
  'classification',
  'failure',
  'required-agents',
  'required-tools',
  'forbidden-tools',
  'approval',
  'pii-leak',
  'agent-tool-boundary',
  'citation-verbatim',
  'no-adjudication-language',
] as const;
