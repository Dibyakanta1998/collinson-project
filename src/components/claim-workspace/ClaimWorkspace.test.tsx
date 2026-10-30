import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { WORKSPACE_CONTENT as copy } from '@/content/workspace';

import { ClaimWorkspace } from './ClaimWorkspace';

vi.mock('@/lib/claims-api', () => ({
  createClaim: vi.fn(async () => ({ id: 'claim-1', status: 'received', eventsUrl: '/x' })),
  getClaim: vi.fn(async () => ({
    id: 'claim-1',
    status: 'suspended',
    runId: 'run-1',
    result: {
      classification: 'likely_covered',
      confidence: 0.9,
      summary: 'The claim appears to meet the policy and evidence requirements.',
      nextActions: ['Submit the provisional result for claims-handler approval.'],
      citations: [{ clause: '4.2', excerpt: 'more than six hours' }],
      requiresApproval: true,
    },
    lastError: null,
    idempotencyKey: null,
    approvals: [],
    input: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  submitApproval: vi.fn(async () => ({
    id: 'claim-1',
    status: 'approved',
    runId: 'run-1',
    result: {
      classification: 'likely_covered',
      confidence: 0.9,
      summary: 'The claim appears to meet the policy and evidence requirements.',
      nextActions: ['Submit the provisional result for claims-handler approval.'],
      citations: [{ clause: '4.2', excerpt: 'more than six hours' }],
      requiresApproval: true,
    },
    lastError: null,
    idempotencyKey: null,
    approvals: [],
    input: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  subscribeToClaimEvents: vi.fn(() => () => undefined),
}));

describe('ClaimWorkspace', () => {
  it('submits a claim and exposes approval controls', async () => {
    const user = userEvent.setup();
    render(<ClaimWorkspace />);

    await user.click(screen.getByRole('button', { name: copy.submit }));

    expect(await screen.findByText(copy.classifications.likely_covered)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: copy.approve })).toBeEnabled();
    expect(screen.getByLabelText(copy.policyNumber)).toHaveAccessibleName(copy.policyNumber);
  });
});
