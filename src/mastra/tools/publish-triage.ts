import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import {
  approvalDecisionSchema,
  triageResultSchema,
} from '@/domain/types';

const suspendedTriageSchema = z.object({
  reason: z.string(),
  triage: triageResultSchema,
});

export const publishTriageTool = createTool({
  id: 'publish-triage',
  description:
    'Suspend a provisional triage result for human approval before publication.',
  inputSchema: triageResultSchema,
  suspendSchema: suspendedTriageSchema,
  resumeSchema: approvalDecisionSchema,
  outputSchema: approvalDecisionSchema,
  execute: async (triage, context) => {
    const agent = context?.agent;
    if (!agent) throw new Error('Human approval requires an active agent run.');

    return agent.suspend({
      reason: `Human review required for ${triage.classification}.`,
      triage,
    });
  },
});
