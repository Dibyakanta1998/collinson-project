import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { claimInputSchema } from '@/domain/types';
import { getClaimService } from '@/server/claims/runtime';
import { problemResponse } from '@/server/http/problems';
import { readIdempotencyKey, readJsonBody, readRequestId } from '@/server/http/request';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const requestId = readRequestId(request);
  const parsed = claimInputSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return invalidClaim(requestId, parsed.error);
  }

  const claim = await getClaimService().submit(parsed.data, readIdempotencyKey(request));
  return NextResponse.json(
    {
      id: claim.id,
      status: claim.status,
      eventsUrl: `/api/claims/${claim.id}/events`,
    },
    {
      status: 202,
      headers: { 'x-request-id': requestId },
    },
  );
}

function invalidClaim(requestId: string, error: ZodError) {
  return problemResponse({
    type: 'https://claimlens.dev/problems/invalid-claim',
    title: 'Invalid claim',
    status: 400,
    detail: error.issues.map((issue) => issue.message).join('; '),
    requestId,
  });
}
