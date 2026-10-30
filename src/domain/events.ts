import { z } from 'zod';

import { claimFailureCodeSchema } from './failures';
import { approvalDecisionSchema, triageResultSchema, usageSchema } from './types';

export const claimEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('run_started'),
    runId: z.string().uuid(),
    occurredAt: z.iso.datetime(),
  }),
  z.object({
    type: z.literal('agent_status'),
    agentId: z.string().min(1),
    status: z.enum(['queued', 'running', 'completed', 'failed']),
    occurredAt: z.iso.datetime(),
  }),
  z.object({
    type: z.literal('tool_call'),
    agentId: z.string().min(1),
    toolId: z.string().min(1),
    status: z.enum(['started', 'completed', 'failed']),
    occurredAt: z.iso.datetime(),
  }),
  z.object({
    type: z.literal('usage'),
    usage: usageSchema,
    occurredAt: z.iso.datetime(),
  }),
  z.object({
    type: z.literal('result'),
    result: triageResultSchema,
    occurredAt: z.iso.datetime(),
  }),
  z.object({
    type: z.literal('approval_required'),
    runId: z.string().uuid(),
    reason: z.string().min(1),
    occurredAt: z.iso.datetime(),
  }),
  z.object({
    type: z.literal('approval_recorded'),
    decision: approvalDecisionSchema.shape.decision,
    occurredAt: z.iso.datetime(),
  }),
  z.object({
    type: z.literal('error'),
    code: claimFailureCodeSchema,
    message: z.string().min(1),
    occurredAt: z.iso.datetime(),
  }),
  z.object({
    type: z.literal('completed'),
    status: z.enum(['suspended', 'approved', 'changes_requested', 'declined', 'failed']),
    occurredAt: z.iso.datetime(),
  }),
]);

export type ClaimEvent = z.infer<typeof claimEventSchema>;

export const nowIso = () => new Date().toISOString();
