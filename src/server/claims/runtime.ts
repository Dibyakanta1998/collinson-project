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
  return process.env.CLAIMLENS_AGENT_MODE === 'live';
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
