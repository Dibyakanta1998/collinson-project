import { describe, expect, it } from 'vitest';

import { getHealthStatus } from './health';

describe('getHealthStatus', () => {
  it('returns a stable service status', () => {
    expect(getHealthStatus()).toEqual({
      service: 'claimlens-ai',
      status: 'ok',
    });
  });
});
