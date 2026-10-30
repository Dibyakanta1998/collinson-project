import { nowIso, type ClaimEvent } from '@/domain/events';
import { ClaimFailure } from '@/domain/failures';
import { triageResultSchema, type TriageResult } from '@/domain/types';

type StreamChunk = { type: string; payload?: Record<string, unknown> };

const TOOL_IDS: Record<string, string> = {
  buildCaseBrief: 'build-case-brief',
  publishTriage: 'publish-triage',
  reviewEvidence: 'review-evidence',
};

const AGENT_IDS: Record<string, string> = {
  coverageAnalyst: 'coverage-analyst',
  evidenceReviewer: 'evidence-reviewer',
  triageSpecialist: 'triage-specialist',
  claimSupervisor: 'claim-supervisor',
  'coverage-analyst': 'coverage-analyst',
  'evidence-reviewer': 'evidence-reviewer',
  'triage-specialist': 'triage-specialist',
  'claim-supervisor': 'claim-supervisor',
};

export class MastraTraceMapper {
  private agentId = 'claim-supervisor';

  map(chunk: StreamChunk): ClaimEvent | null {
    if (chunk.type.startsWith('agent-execution-event-')) {
      const nested = asChunk(chunk.payload);
      return nested ? this.map(nested) : null;
    }

    const occurredAt = nowIso();
    const agentId = this.readAgentId(chunk) ?? this.agentId;

    if (chunk.type === 'agent-execution-start') {
      this.agentId = agentId;
      return { type: 'agent_status', agentId, status: 'running', occurredAt };
    }
    if (chunk.type === 'agent-execution-end') {
      const completed = { type: 'agent_status' as const, agentId, status: 'completed' as const, occurredAt };
      this.agentId = 'claim-supervisor';
      return completed;
    }
    if (chunk.type === 'tool-call' || chunk.type === 'tool-execution-start') {
      return this.mapTool(chunk, agentId, 'started', occurredAt);
    }
    if (chunk.type === 'tool-result' || chunk.type === 'tool-execution-end') {
      return this.mapTool(chunk, agentId, 'completed', occurredAt);
    }
    return null;
  }

  private mapTool(
    chunk: StreamChunk,
    agentId: string,
    status: 'started' | 'completed',
    occurredAt: string,
  ): ClaimEvent {
    const toolId = this.readToolId(chunk);
    const delegated = delegatedAgent(toolId);
    if (delegated) {
      this.agentId = status === 'started' ? delegated : 'claim-supervisor';
      return { type: 'agent_status', agentId: delegated, status: status === 'started' ? 'running' : 'completed', occurredAt };
    }
    return { type: 'tool_call', agentId, toolId, status, occurredAt };
  }

  private readAgentId(chunk: StreamChunk) {
    const payload = chunk.payload;
    const args = asRecord(payload?.args);
    return normalizeAgentId(
      readString(payload, 'agentId')
        ?? readString(args, 'primitiveId')
        ?? readString(asRecord(chunk.payload?.metadata), 'agentId'),
    );
  }

  private readToolId(chunk: StreamChunk) {
    const payload = chunk.payload;
    const args = asRecord(payload?.args);
    return normalizeToolId(
      readString(payload, 'toolName') ?? readString(args, 'toolName') ?? readString(payload, 'task'),
    );
  }
}

export function mapMastraChunk(chunk: StreamChunk): ClaimEvent | null {
  return new MastraTraceMapper().map(chunk);
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

function normalizeAgentId(value?: string) {
  if (!value) return undefined;
  const trimmed = value.replace(/^agent-/, '');
  return AGENT_IDS[trimmed] ?? AGENT_IDS[value] ?? kebab(trimmed);
}

function normalizeToolId(value?: string) {
  if (!value) return 'unknown-tool';
  return TOOL_IDS[value] ?? value;
}

function delegatedAgent(toolId: string) {
  return AGENT_IDS[toolId.replace(/^agent-/, '')];
}

function kebab(value: string) {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function asChunk(value: unknown): StreamChunk | undefined {
  const record = asRecord(value);
  return typeof record?.type === 'string' ? { type: record.type, payload: asRecord(record.payload) } : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

function readString(record: Record<string, unknown> | undefined, key: string) {
  const value = record?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
