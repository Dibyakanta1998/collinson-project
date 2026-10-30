// @vitest-environment node

import { describe, expect, it } from 'vitest';

import {
  createTestClaimService,
  likelyCoveredClaim,
  missingReceiptsClaim,
  waitForClaim,
} from './test-harness';

describe('ClaimService', () => {
  it('suspends a covered claim for human approval', async () => {
    const service = createTestClaimService();
    const created = await service.submit(likelyCoveredClaim);
    const claim = await waitForClaim(service, created.id, 'suspended');

    expect(claim.result?.classification).toBe('likely_covered');
    expect(claim.runId).toBeTruthy();
  });

  it('marks missing receipts as needs review instead of a denial', async () => {
    const service = createTestClaimService();
    const created = await service.submit(missingReceiptsClaim);
    const claim = await waitForClaim(service, created.id, 'suspended');

    expect(claim.result?.classification).toBe('needs_review');
  });

  it('records an approval and rejects a duplicate decision', async () => {
    const service = createTestClaimService();
    const created = await service.submit(likelyCoveredClaim);
    await waitForClaim(service, created.id, 'suspended');

    const approved = await service.approve(created.id, {
      decision: 'approve',
      note: 'Coverage and evidence reviewed.',
    });
    expect(approved.status).toBe('approved');

    await expect(
      service.approve(created.id, {
        decision: 'decline',
        note: 'Second decision should not apply.',
      }),
    ).rejects.toThrow('not awaiting approval');
  });

  it.each([
    ['timeout', 'model_timeout'],
    ['malformed', 'malformed_model_output'],
    ['mcp', 'mcp_unavailable'],
  ] as const)('maps %s into a typed failure', async (token, code) => {
    const service = createTestClaimService();
    const created = await service.submit({
      ...likelyCoveredClaim,
      policyNumber: `CL-${token.toUpperCase()}`,
    });
    const claim = await waitForClaim(service, created.id, 'failed');

    expect(claim.lastError?.code).toBe(code);
  });

  it('reuses an idempotency key instead of creating a second claim', async () => {
    const service = createTestClaimService();
    const first = await service.submit(likelyCoveredClaim, 'demo-key');
    const second = await service.submit(missingReceiptsClaim, 'demo-key');

    expect(second.id).toBe(first.id);
  });
});
