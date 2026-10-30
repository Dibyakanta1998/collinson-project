import { nowIso, type ClaimEvent } from '@/domain/events';
import { ClaimFailure } from '@/domain/failures';
import { triageResultSchema, type TriageResult } from '@/domain/types';

export function mapMastraChunk(chunk: { type: string; payload?: Record<string, unknown> }): ClaimEvent | null {
  const occurredAt = nowIso();
  const agentId = readString(chunk.payload, 'agentId') ?? 'claim-supervisor';

  if (chunk.type === 'agent-execution-start') {
    return { type: 'agent_status', agentId, status: 'running', occurredAt };
  }
  if (chunk.type === 'agent-execution-end') {
    return { type: 'agent_status', agentId, status: 'completed', occurredAt };
  }
  if (chunk.type === 'tool-call') {
    return {
      type: 'tool_call',
      agentId,
      toolId: readString(chunk.payload, 'toolName') ?? 'unknown-tool',
      status: 'started',
      occurredAt,
    };
  }
  if (chunk.type === 'tool-result') {
    return {
      type: 'tool_call',
      agentId,
      toolId: readString(chunk.payload, 'toolName') ?? 'unknown-tool',
      status: 'completed',
      occurredAt,
    };
  }
  return null;
}

export function extractSuspendedTriage(payload: unknown): TriageResult {
  const record = asRecord(payload);
  const nested = asRecord(record?.suspendPayload);
  const candidate = record?.triage ?? nested?.triage ?? nested ?? record;
  const parsed = triageResultSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new ClaimFailure('malformed_model_output', 'Suspended triage payload was invalid.');
  }
  return parsed.data;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

function readString(record: Record<string, unknown> | undefined, key: string) {
  const value = record?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
