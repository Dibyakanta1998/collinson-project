import { randomUUID } from 'node:crypto';

import { createStep, createWorkflow } from '@mastra/core/workflows';

import { nowIso, type ClaimEvent } from '@/domain/events';
import { ClaimFailure } from '@/domain/failures';
import { claimInputSchema } from '@/domain/types';
import { claimEvalOutputSchema, type ClaimEvalOutput } from '@/evals/types';
import { DeterministicClaimRunner } from '@/server/claims/deterministic-runner';
import { MastraClaimRunner } from '@/server/claims/mastra-runner';
import { usesLiveAgents } from '@/server/claims/runtime';
import type { ClaimRunner } from '@/server/claims/runner';

const runClaim = createStep({
  id: 'run-claim',
  inputSchema: claimInputSchema,
  outputSchema: claimEvalOutputSchema,
  execute: async ({ inputData }): Promise<ClaimEvalOutput> => {
    const events: ClaimEvent[] = [];
    const runner = getEvalRunner();
    try {
      const outcome = await runner.run({
        claimId: randomUUID(),
        input: inputData,
        abortSignal: new AbortController().signal,
        emit: async (event) => {
          events.push(event);
        },
      });
      return { events, result: outcome.result };
    } catch (error) {
      const failureCode = error instanceof ClaimFailure ? error.code : 'internal_failure';
      events.push({
        type: 'error',
        code: failureCode,
        message: error instanceof Error ? error.message : 'Claim evaluation failed.',
        occurredAt: nowIso(),
      });
      return { events, failureCode };
    }
  },
});

export const claimTriageEvalWorkflow = createWorkflow({
  id: 'claim-triage-eval',
  inputSchema: claimInputSchema,
  outputSchema: claimEvalOutputSchema,
})
  .then(runClaim)
  .commit();

function getEvalRunner(): ClaimRunner {
  return usesLiveAgents() ? new MastraClaimRunner() : new DeterministicClaimRunner();
}
