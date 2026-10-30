import path from 'node:path';

import { Mastra } from '@mastra/core/mastra';

import { createClaimAgents } from './agents/factory';
import { createPolicyMcpClient, getPolicyTools } from './mcp/policy-client';
import { createOllamaModel } from './model';
import { getClaimMemory, getMastraStore } from './storage';

type ClaimLensRuntime = Awaited<ReturnType<typeof buildClaimLensRuntime>>;

declare global {
  var claimLensRuntime: Promise<ClaimLensRuntime> | undefined;
}

async function buildClaimLensRuntime() {
  const policyRoot =
    process.env.POLICY_ROOT ??
    path.join(process.cwd(), 'fixtures', 'policies');
  const policyClient = createPolicyMcpClient(policyRoot);

  try {
    const policyTools = await getPolicyTools(policyClient);
    const agents = createClaimAgents({
      model: createOllamaModel(),
      policyTools,
      memory: getClaimMemory(),
    });
    const mastra = new Mastra({
      agents,
      storage: getMastraStore(),
    });

    return { mastra, policyClient, agents };
  } catch (error) {
    await policyClient.disconnect();
    throw error;
  }
}

export function createClaimLensRuntime() {
  global.claimLensRuntime ??= buildClaimLensRuntime();
  return global.claimLensRuntime;
}
