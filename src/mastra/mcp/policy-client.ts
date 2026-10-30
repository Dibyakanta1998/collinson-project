import path from 'node:path';

import { MCPClient } from '@mastra/mcp';

const readOnlyToolSuffixes = new Set([
  'read_text_file',
  'read_media_file',
  'read_multiple_files',
  'list_directory',
  'list_directory_with_sizes',
  'directory_tree',
  'search_files',
  'get_file_info',
  'list_allowed_directories',
]);

export function createPolicyMcpClient(policyRoot: string): MCPClient {
  const serverPath = path.join(
    process.cwd(),
    'node_modules',
    '@modelcontextprotocol',
    'server-filesystem',
    'dist',
    'index.js',
  );

  return new MCPClient({
    id: 'claimlens-policy-client',
    servers: {
      policy: {
        command: process.execPath,
        args: [serverPath, policyRoot],
      },
    },
    timeout: 10_000,
  });
}

export async function getPolicyTools(client: MCPClient) {
  const tools = await client.listTools();
  return Object.fromEntries(
    Object.entries(tools).filter(([name]) => {
      const suffix = name.replace(/^policy_/, '');
      return readOnlyToolSuffixes.has(suffix);
    }),
  ) as typeof tools;
}
