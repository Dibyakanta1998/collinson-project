// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { POST as approveClaim } from './[id]/approval/route';
import { GET as getClaimEvents } from './[id]/events/route';
import { GET as getClaim } from './[id]/route';
import { POST as createClaim } from './route';
import {
  createTestClaimService,
  likelyCoveredClaim,
  waitForClaim,
} from '@/server/claims/test-harness';
import { setClaimServiceForTests } from '@/server/claims/runtime';

describe('claims API', () => {
  const service = createTestClaimService();

  beforeEach(() => {
    setClaimServiceForTests(service);
  });

  afterEach(() => {
    setClaimServiceForTests(service);
  });

  it('returns a typed validation problem for an invalid claim', async () => {
    const request = new Request('http://localhost/api/claims', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'request-123',
      },
      body: JSON.stringify({ delayHours: -1 }),
    });

    const response = await createClaim(request);
    const problem = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(problem).toMatchObject({
      type: 'https://claimlens.dev/problems/invalid-claim',
      requestId: 'request-123',
    });
  });

  it('creates, streams, approves, and then rejects a duplicate approval', async () => {
    const created = await createClaim(
      new Request('http://localhost/api/claims', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(likelyCoveredClaim),
      }),
    );
    const body = await created.json() as { id: string };
    expect(created.status).toBe(202);

    await waitForClaim(service, body.id, 'suspended');

    const eventsResponse = await getClaimEvents(
      new Request(`http://localhost/api/claims/${body.id}/events`),
      { params: Promise.resolve({ id: body.id }) },
    );
    expect(eventsResponse.headers.get('content-type')).toContain('text/event-stream');
    const payload = await readSseUntil(eventsResponse, 'approval_required');
    expect(payload).toContain('approval_required');

    const approved = await approveClaim(
      new Request(`http://localhost/api/claims/${body.id}/approval`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          decision: 'approve',
          note: 'Handler reviewed coverage and evidence.',
        }),
      }),
      { params: Promise.resolve({ id: body.id }) },
    );
    expect(approved.status).toBe(200);

    const duplicate = await approveClaim(
      new Request(`http://localhost/api/claims/${body.id}/approval`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          decision: 'decline',
          note: 'Duplicate decisions must be rejected.',
        }),
      }),
      { params: Promise.resolve({ id: body.id }) },
    );
    expect(duplicate.status).toBe(409);

    const fetched = await getClaim(
      new Request(`http://localhost/api/claims/${body.id}`),
      { params: Promise.resolve({ id: body.id }) },
    );
    const claim = await fetched.json();
    expect(claim.status).toBe('approved');
  });
});

async function readSseUntil(response: Response, eventType: string) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Event stream was empty.');

  const decoder = new TextDecoder();
  let payload = '';
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const chunk = await reader.read();
    payload += decoder.decode(chunk.value, { stream: true });
    if (payload.includes(eventType) || chunk.done) break;
  }
  await reader.cancel();
  return payload;
}
