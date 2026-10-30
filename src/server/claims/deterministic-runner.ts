import { randomUUID } from 'node:crypto';

import { nowIso, type ClaimEvent } from '@/domain/events';
import { ClaimFailure } from '@/domain/failures';
import { decideTriage } from '@/domain/triage';
import type { ClaimInput, CoverageFinding, TriageResult } from '@/domain/types';
import { reviewEvidence } from '@/mastra/tools/evidence';

import type { ClaimRunContext, ClaimRunOutcome, ClaimRunner } from './runner';

export class DeterministicClaimRunner implements ClaimRunner {
  async run({ input, abortSignal, emit }: ClaimRunContext): Promise<ClaimRunOutcome> {
    const runId = randomUUID();
    await emit({ type: 'run_started', runId, occurredAt: nowIso() });
    throwIfAborted(abortSignal);

    if (isScenario(input, 'timeout')) {
      throw new ClaimFailure('model_timeout', 'The model timed out before triage completed.');
    }
    if (isScenario(input, 'malformed')) {
      throw new ClaimFailure('malformed_model_output', 'Model output remained invalid after repair.');
    }
    if (isScenario(input, 'mcp')) {
      throw new ClaimFailure('mcp_unavailable', 'Policy verification is currently unavailable.');
    }

    await emitTimeline(emit, 'claim-supervisor', 'build-case-brief');
    await emitTimeline(emit, 'coverage-analyst', 'policy_read_text_file');
    await emitTimeline(emit, 'evidence-reviewer', 'review-evidence');
    await emitTimeline(emit, 'triage-specialist');

    const result = buildDeterministicResult(input);
    await emit({ type: 'result', result, occurredAt: nowIso() });
    await emitTimeline(emit, 'claim-supervisor', 'publish-triage');
    await emit({
      type: 'approval_required',
      runId,
      reason: `Human review required for ${result.classification}.`,
      occurredAt: nowIso(),
    });

    return { runId, result };
  }
}

function isScenario(input: ClaimInput, token: string) {
  const haystack = `${input.policyNumber} ${input.notes ?? ''}`.toLowerCase();
  return haystack.includes(token);
}

function buildDeterministicResult(input: ClaimInput): TriageResult {
  const evidence = reviewEvidence(input.evidence);
  const coverage = coverageFor(input);
  return decideTriage(coverage, evidence);
}

function coverageFor(input: ClaimInput): CoverageFinding {
  if (isCustomsExclusion(input)) {
    return {
      status: 'excluded',
      confidence: 0.88,
      citations: [{
        clause: '4.4',
        excerpt: 'Cover does not apply when the delay resulted from baggage being detained by customs',
      }],
      rationale: 'The delay appears to fall under a public-authority exclusion.',
    };
  }

  if (input.delayHours <= 6) {
    return {
      status: 'excluded',
      confidence: 0.88,
      citations: [{
        clause: '4.2',
        excerpt: 'Delayed for more than six consecutive hours after the traveller reaches their scheduled destination.',
      }],
      rationale: 'The delay does not meet the more-than-six-hours threshold.',
    };
  }

  if (input.reason === 'unknown') {
    return {
      status: 'unclear',
      confidence: 0.34,
      citations: [],
      rationale: 'The delay reason is too ambiguous to cite a clause.',
    };
  }

  if (input.reason !== 'airline_delay' && input.reason !== 'misrouting') {
    return {
      status: 'excluded',
      confidence: 0.72,
      citations: [],
      rationale: 'The submitted reason is not a covered delay cause.',
    };
  }

  return {
    status: 'eligible',
    confidence: 0.93,
    citations: [{
      clause: '4.2',
      excerpt: 'Delayed for more than six consecutive hours after the traveller reaches their scheduled destination.',
    }],
    rationale: 'Delay exceeds the six-hour threshold.',
  };
}

function isCustomsExclusion(input: ClaimInput) {
  return /customs|public authority/i.test(input.notes ?? '');
}

async function emitTimeline(
  emit: (event: ClaimEvent) => Promise<void>,
  agentId: string,
  toolId?: string,
) {
  await emit({ type: 'agent_status', agentId, status: 'running', occurredAt: nowIso() });
  if (toolId) {
    await emit({ type: 'tool_call', agentId, toolId, status: 'started', occurredAt: nowIso() });
    await emit({ type: 'tool_call', agentId, toolId, status: 'completed', occurredAt: nowIso() });
  }
  await emit({
    type: 'usage',
    usage: {
      agentId,
      inputTokens: 40,
      outputTokens: 12,
      totalTokens: 52,
      latencyMs: 18,
    },
    occurredAt: nowIso(),
  });
  await emit({ type: 'agent_status', agentId, status: 'completed', occurredAt: nowIso() });
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) {
    throw new ClaimFailure('internal_failure', 'The claim run was aborted.');
  }
}
