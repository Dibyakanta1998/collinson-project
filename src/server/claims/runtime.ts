import { getPool } from '@/server/db/pool';
import { PgClaimsRepository } from '@/server/db/claims-repository';

import { DeterministicClaimRunner } from './deterministic-runner';
import { MastraClaimRunner } from './mastra-runner';
import { MemoryClaimsRepository } from './memory-repository';
import { ClaimService } from './service';

declare global {
  var claimLensService: ClaimService | undefined;
}

export function usesLiveAgents() {
  if (process.env.CLAIMLENS_AGENT_MODE !== 'live') return false;
  if (!process.env.OLLAMA_API_KEY || !process.env.OLLAMA_MODEL) {
    throw new Error('Live mode requires OLLAMA_API_KEY and OLLAMA_MODEL.');
  }
  return true;
}

export function getClaimService(): ClaimService {
  if (global.claimLensService) return global.claimLensService;

  const runner = usesLiveAgents()
    ? new MastraClaimRunner()
    : new DeterministicClaimRunner();
  const repository = process.env.DATABASE_URL
    ? new PgClaimsRepository(getPool())
    : new MemoryClaimsRepository();
  global.claimLensService = new ClaimService(repository, runner);
  return global.claimLensService;
}

export function setClaimServiceForTests(service: ClaimService) {
  global.claimLensService = service;
}
