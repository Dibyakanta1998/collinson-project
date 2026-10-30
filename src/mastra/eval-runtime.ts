import { Mastra } from '@mastra/core/mastra';
import { InMemoryStore } from '@mastra/core/storage';

import { claimLensScorers } from './scorers';
import { getMastraStore } from './storage';
import { claimTriageEvalWorkflow } from './workflows/claim-triage-eval';

export function createClaimLensEvalRuntime() {
  return new Mastra({
    storage: process.env.DATABASE_URL ? getMastraStore() : new InMemoryStore(),
    scorers: claimLensScorers,
    workflows: {
      claimTriageEval: claimTriageEvalWorkflow,
    },
  });
}

export const mastra = createClaimLensEvalRuntime();
