// @vitest-environment node

import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { createPolicyMcpClient, getPolicyTools } from './policy-client';

describe('policy MCP client', () => {
  const client = createPolicyMcpClient(
    path.join(process.cwd(), 'fixtures', 'policies'),
  );

  afterAll(async () => {
    await client.disconnect();
  });

  it('exposes only policy-reading tools', async () => {
    const tools = await getPolicyTools(client);
    const names = Object.keys(tools);

    expect(names).toEqual(
      expect.arrayContaining([
        'policy_read_text_file',
        'policy_list_directory',
        'policy_search_files',
      ]),
    );
    expect(names.some((name) => /write|move|create|edit/i.test(name))).toBe(false);
  });
});
