import { z } from 'zod';

import { claimInputSchema } from '@/domain/types';

export const evalCaseSchema = z.object({
  id: z.string(),
  input: claimInputSchema,
  expected: z.object({
    classification: z.enum([
      'likely_covered',
      'needs_review',
      'insufficient_information',
    ]).optional(),
    failureCode: z.string().optional(),
    requiredAgents: z.array(z.string()),
    requiredTools: z.array(z.string()),
    forbiddenTools: z.array(z.string()),
    requiresApproval: z.boolean(),
  }),
});

export type EvalCase = z.infer<typeof evalCaseSchema>;

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
