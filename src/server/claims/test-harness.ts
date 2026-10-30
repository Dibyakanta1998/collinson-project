import likelyCovered from '../../../fixtures/claims/likely-covered.json';
import missingReceipts from '../../../fixtures/claims/missing-receipts.json';

import type { ClaimInput } from '@/domain/types';
import { MemoryClaimsRepository } from '@/server/claims/memory-repository';
import { DeterministicClaimRunner } from '@/server/claims/deterministic-runner';
import { ClaimService } from '@/server/claims/service';
import type { ClaimStatus, StoredClaim } from '@/server/db/claims-repository';

export const likelyCoveredClaim = likelyCovered as ClaimInput;
export const missingReceiptsClaim = missingReceipts as ClaimInput;

export function createTestClaimService() {
  return new ClaimService(new MemoryClaimsRepository(), new DeterministicClaimRunner());
}

export async function waitForClaim(
  service: ClaimService,
  id: string,
  status: ClaimStatus,
): Promise<StoredClaim> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const claim = await service.get(id);
    if (claim?.status === status) return claim;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  const latest = await service.get(id);
  throw new Error(`Timed out waiting for ${status}; last status was ${latest?.status}.`);
}
