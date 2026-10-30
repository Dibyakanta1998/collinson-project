import { usageSchema, type Usage } from '@/domain/types';

interface ProviderUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export function normalizeUsage(
  agentId: string,
  latencyMs: number,
  usage?: ProviderUsage,
): Usage {
  const inputTokens = usage?.inputTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? 0;

  return usageSchema.parse({
    agentId,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    latencyMs: Math.max(0, Math.round(latencyMs)),
  });
}
