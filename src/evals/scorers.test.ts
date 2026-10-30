import { describe, expect, it } from 'vitest';

import { runEvaluations } from './run';

describe('evaluations', () => {
  it('passes the deterministic behavioral suite', async () => {
    const results = await runEvaluations();
    const failed = results.filter((result) => !result.passed);

    expect(failed, JSON.stringify(failed, null, 2)).toEqual([]);
  });
});
