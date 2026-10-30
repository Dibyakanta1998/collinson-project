import { getClaimService } from '@/server/claims/runtime';
import { problemResponse } from '@/server/http/problems';
import { readRequestId } from '@/server/http/request';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = readRequestId(request);
  const { id } = await context.params;
  const claim = await getClaimService().get(id);
  if (!claim) {
    return problemResponse({
      type: 'https://claimlens.dev/problems/claim-not-found',
      title: 'Claim not found',
      status: 404,
      detail: `No claim exists for ${id}.`,
      requestId,
    });
  }

  return Response.json(claim, { headers: { 'x-request-id': requestId } });
}
