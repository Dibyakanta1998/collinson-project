import { describe, expect, it } from 'vitest';

import { extractSuspendedTriage, mapMastraChunk } from './stream-events';

describe('stream event mapping', () => {
  it('keeps tool and agent lifecycle events and drops model text', () => {
    expect(mapMastraChunk({ type: 'text-delta', payload: { text: 'hidden' } })).toBeNull();
    expect(
      mapMastraChunk({
        type: 'tool-call',
        payload: { agentId: 'coverage-analyst', toolName: 'policy_read_text_file' },
      }),
    ).toMatchObject({
      type: 'tool_call',
      agentId: 'coverage-analyst',
      toolId: 'policy_read_text_file',
      status: 'started',
    });
  });

  it('reads triage from a nested suspend payload', () => {
    const triage = extractSuspendedTriage({
      suspendPayload: {
        reason: 'Human review required',
        triage: {
          classification: 'likely_covered',
          confidence: 0.9,
          summary: 'Eligible delay with complete evidence.',
          nextActions: ['Await approval.'],
          citations: [{ clause: '4.2', excerpt: 'more than six hours' }],
          requiresApproval: true,
        },
      },
    });

    expect(triage.classification).toBe('likely_covered');
  });
});
