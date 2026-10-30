import { createTool } from '@mastra/core/tools';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { buildAgentToolAccess } from './factory';

const policyReadTool = createTool({
  id: 'policy-read',
  description: 'Read policy text.',
  inputSchema: z.object({ path: z.string() }),
  outputSchema: z.object({ text: z.string() }),
  execute: async () => ({ text: 'fixture' }),
});

describe('buildAgentToolAccess', () => {
  it('limits policy tools to the coverage analyst', () => {
    const access = buildAgentToolAccess({ policy_read_text_file: policyReadTool });

    expect(Object.keys(access.coverageAnalyst)).toContain('policy_read_text_file');
    expect(Object.keys(access.evidenceReviewer)).toEqual(['reviewEvidence']);
    expect(Object.keys(access.triageSpecialist)).toEqual([]);
    expect(Object.keys(access.supervisor)).toEqual([
      'buildCaseBrief',
      'publishTriage',
    ]);
  });
});
