import { Memory } from '@mastra/memory';
import { PostgresStore } from '@mastra/pg';

declare global {
  var claimLensMastraStore: PostgresStore | undefined;
  var claimLensMemory: Memory | undefined;
}

export function getMastraStore(): PostgresStore {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required.');

  global.claimLensMastraStore ??= new PostgresStore({
    id: 'claimlens-storage',
    connectionString,
    ssl: process.env.DATABASE_SSL === 'true'
      ? { rejectUnauthorized: false }
      : false,
  });

  return global.claimLensMastraStore;
}

export function getClaimMemory(): Memory {
  global.claimLensMemory ??= new Memory({
    storage: getMastraStore(),
    options: {
      lastMessages: 12,
      workingMemory: {
        enabled: true,
        scope: 'resource',
      },
    },
  });

  return global.claimLensMemory;
}
