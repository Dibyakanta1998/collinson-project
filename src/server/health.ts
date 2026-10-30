import { getPool } from './db/pool';
import { runMigrations } from './db/migrate';

declare global {
  var claimLensMigrated: boolean | undefined;
}

export const getHealthStatus = () => ({
  service: 'claimlens-ai',
  status: 'ok',
} as const);

export async function getReadyStatus() {
  if (!process.env.DATABASE_URL) {
    return {
      service: 'claimlens-ai',
      status: 'ok',
      persistence: 'memory',
    } as const;
  }

  await getPool().query('SELECT 1');
  if (!global.claimLensMigrated) {
    await runMigrations(getPool());
    global.claimLensMigrated = true;
  }

  return {
    service: 'claimlens-ai',
    status: 'ok',
    persistence: 'postgres',
  } as const;
}
