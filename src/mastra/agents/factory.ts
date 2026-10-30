import { Agent, type AgentConfig, type ToolsInput } from '@mastra/core/agent';
import {
  RegexFilterProcessor,
  TokenLimiterProcessor,
} from '@mastra/core/processors';
import type { Memory } from '@mastra/memory';

import { buildCaseBriefTool } from '@/mastra/tools/case-brief';
import { reviewEvidenceTool } from '@/mastra/tools/evidence';

import { AGENT_PROMPTS } from './prompts';

type AgentModel = AgentConfig['model'];

interface ClaimAgentOptions {
  model: AgentModel;
  policyTools: ToolsInput;
  memory?: Memory;
}

const createInputProcessors = () => [
  new RegexFilterProcessor({
    presets: ['pii', 'secrets'],
    strategy: 'redact',
    phase: 'input',
  }),
  new TokenLimiterProcessor({
    limit: 8_000,
    strategy: 'truncate',
    countMode: 'cumulative',
  }),
];

export function buildAgentToolAccess(policyTools: ToolsInput) {
  return {
    coverageAnalyst: policyTools,
    evidenceReviewer: { reviewEvidence: reviewEvidenceTool },
    triageSpecialist: {},
    supervisor: { buildCaseBrief: buildCaseBriefTool },
  } satisfies Record<string, ToolsInput>;
}

export function createClaimAgents({
  model,
  policyTools,
  memory,
}: ClaimAgentOptions) {
  const access = buildAgentToolAccess(policyTools);
  const coverageAnalyst = new Agent({
    id: 'coverage-analyst',
    name: 'Coverage Analyst',
    description: 'Reads policy clauses and returns cited coverage findings.',
    instructions: AGENT_PROMPTS.coverage,
    model,
    tools: access.coverageAnalyst,
    inputProcessors: createInputProcessors(),
  });
  const evidenceReviewer = new Agent({
    id: 'evidence-reviewer',
    name: 'Evidence Reviewer',
    description: 'Checks submitted evidence metadata without reading policy files.',
    instructions: AGENT_PROMPTS.evidence,
    model,
    tools: access.evidenceReviewer,
    inputProcessors: createInputProcessors(),
  });
  const triageSpecialist = new Agent({
    id: 'triage-specialist',
    name: 'Triage Specialist',
    description: 'Reconciles coverage and evidence into provisional triage.',
    instructions: AGENT_PROMPTS.triage,
    model,
    tools: access.triageSpecialist,
    inputProcessors: createInputProcessors(),
  });
  const supervisor = new Agent({
    id: 'claim-supervisor',
    name: 'Claim Supervisor',
    description: 'Delegates delayed-baggage claim analysis to specialists.',
    instructions: AGENT_PROMPTS.supervisor,
    model,
    tools: access.supervisor,
    agents: { coverageAnalyst, evidenceReviewer, triageSpecialist },
    memory,
    inputProcessors: createInputProcessors(),
  });

  return { supervisor, coverageAnalyst, evidenceReviewer, triageSpecialist };
}
