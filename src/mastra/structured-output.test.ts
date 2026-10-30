import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { parseWithSingleRepair } from './structured-output';

const schema = z.object({ status: z.literal('ok') });

describe('parseWithSingleRepair', () => {
  it('repairs one malformed model response', async () => {
    const repair = vi.fn().mockResolvedValue('{"status":"ok"}');

    await expect(parseWithSingleRepair('not-json', schema, repair)).resolves.toEqual({
      status: 'ok',
    });
    expect(repair).toHaveBeenCalledOnce();
  });

  it('fails safely when the repair is also invalid', async () => {
    await expect(
      parseWithSingleRepair('not-json', schema, async () => '{}'),
    ).rejects.toThrow('Model output remained invalid after one repair attempt.');
  });
});
