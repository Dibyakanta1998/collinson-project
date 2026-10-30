import { nowIso } from '@/domain/events';
import { ClaimFailure } from '@/domain/failures';
import type { Usage } from '@/domain/types';
import { createClaimLensRuntime } from '@/mastra/product-runtime';
import { normalizeUsage } from '@/mastra/usage';

import type { ClaimRunContext, ClaimRunOutcome, ClaimRunner } from './runner';
import { extractSuspendedTriage, mapMastraChunk } from './stream-events';

const runTimeoutMs = 60_000;

export class MastraClaimRunner implements ClaimRunner {
  async run({ claimId, input, abortSignal, emit }: ClaimRunContext): Promise<ClaimRunOutcome> {
    const runtime = await createClaimLensRuntime();
    const timeout = AbortSignal.timeout(runTimeoutMs);
    const signal = AbortSignal.any([abortSignal, timeout]);
    const startedAt = Date.now();

    try {
      const stream = await runtime.agents.supervisor.stream(JSON.stringify(input), {
        maxSteps: 12,
        abortSignal: signal,
        memory: {
          thread: claimId,
          resource: `claim:${claimId}`,
        },
      });

      for await (const chunk of stream.fullStream) {
        const event = mapMastraChunk(chunk as { type: string; payload?: Record<string, unknown> });
        if (event) await emit(event);
      }

      const output = await stream.getFullOutput();
      const runId = output.runId ?? crypto.randomUUID();
      await emit({ type: 'run_started', runId, occurredAt: nowIso() });
      await emitUsage(emit, output.totalUsage, Date.now() - startedAt);

      if (timeout.aborted) {
        throw new ClaimFailure('model_timeout', 'The model timed out before triage completed.');
      }
      if (output.finishReason === 'suspended') {
        const result = extractSuspendedTriage(output.suspendPayload);
        await emit({ type: 'result', result, occurredAt: nowIso() });
        await emit({
          type: 'approval_required',
          runId,
          reason: `Human review required for ${result.classification}.`,
          occurredAt: nowIso(),
        });
        return { runId, result };
      }

      throw new ClaimFailure(
        'malformed_model_output',
        'The supervisor finished without requesting human approval.',
      );
    } catch (error) {
      throw toClaimFailure(error);
    }
  }

  async resume(runId: string, note: string): Promise<void> {
    const runtime = await createClaimLensRuntime();
    try {
      await runtime.agents.supervisor.resumeGenerate(
        { decision: 'approve', note },
        { runId },
      );
    } catch (error) {
      throw toClaimFailure(error);
    }
  }
}

async function emitUsage(
  emit: ClaimRunContext['emit'],
  usage: { inputTokens?: { total?: number } | number; outputTokens?: { total?: number } | number } | undefined,
  latencyMs: number,
) {
  const normalized = normalizeUsage(
    'claim-supervisor',
    latencyMs,
    {
      inputTokens: readTokenCount(usage?.inputTokens),
      outputTokens: readTokenCount(usage?.outputTokens),
    },
  ) satisfies Usage;
  await emit({ type: 'usage', usage: normalized, occurredAt: nowIso() });
}

function readTokenCount(value: { total?: number } | number | undefined) {
  if (typeof value === 'number') return value;
  return value?.total ?? 0;
}

function toClaimFailure(error: unknown) {
  if (error instanceof ClaimFailure) return error;
  const message = error instanceof Error ? error.message : 'Unexpected agent failure.';
  if (/timeout/i.test(message)) {
    return new ClaimFailure('model_timeout', message);
  }
  if (/mcp|policy|connect/i.test(message)) {
    return new ClaimFailure('mcp_unavailable', 'Policy verification is currently unavailable.');
  }
  return new ClaimFailure('internal_failure', message);
}
