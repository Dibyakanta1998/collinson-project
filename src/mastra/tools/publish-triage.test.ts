import { describe, expect, it, vi } from 'vitest';

import { publishTriageTool } from './publish-triage';

describe('publishTriageTool', () => {
  it('suspends the run with the provisional triage result', async () => {
    const suspend = vi.fn().mockResolvedValue({ decision: 'approve', note: 'ok' });
    const triage = {
      classification: 'likely_covered' as const,
      confidence: 0.91,
      summary: 'Eligible delay.',
      nextActions: ['Await approval.'],
      citations: [{ clause: '4.2', excerpt: 'more than six hours' }],
      requiresApproval: true,
    };

    await publishTriageTool.execute?.(triage, { agent: { suspend } } as never);

    expect(suspend.mock.calls[0]?.[0]).toEqual({
      reason: 'Human review required for likely_covered.',
      triage,
    });
  });
});
