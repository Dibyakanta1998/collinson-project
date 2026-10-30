import { describe, expect, it } from 'vitest';

import { normalizeUsage } from './usage';

describe('normalizeUsage', () => {
  it('normalizes provider usage into trace metrics', () => {
    expect(
      normalizeUsage('coverage-analyst', 125, {
        inputTokens: 40,
        outputTokens: 12,
      }),
    ).toEqual({
      agentId: 'coverage-analyst',
      inputTokens: 40,
      outputTokens: 12,
      totalTokens: 52,
      latencyMs: 125,
    });
  });

  it('uses safe zeroes when a provider omits usage', () => {
    expect(normalizeUsage('triage-specialist', 20)).toMatchObject({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    });
  });
});
