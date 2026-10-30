import { ZodError } from 'zod';

import { ClaimFailure } from '@/domain/failures';
import { approvalDecisionSchema } from '@/domain/types';
import { ClaimConflictError } from '@/server/claims/service';
import { getClaimService } from '@/server/claims/runtime';
import { problemResponse } from '@/server/http/problems';
import { readJsonBody, readRequestId } from '@/server/http/request';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = readRequestId(request);
  const { id } = await context.params;
  const parsed = approvalDecisionSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return invalidApproval(requestId, parsed.error);
  }

  try {
    const claim = await getClaimService().approve(id, parsed.data);
    return Response.json(claim, { headers: { 'x-request-id': requestId } });
  } catch (error) {
    if (error instanceof ClaimConflictError) {
      return problemResponse({
        type: 'https://claimlens.dev/problems/approval-conflict',
        title: 'Claim is not awaiting approval',
        status: 409,
        detail: error.message,
        requestId,
      });
    }
    if (error instanceof ClaimFailure && error.code === 'invalid_input') {
      return problemResponse({
        type: 'https://claimlens.dev/problems/claim-not-found',
        title: 'Claim not found',
        status: 404,
        detail: error.message,
        requestId,
      });
    }
    throw error;
  }
}

function invalidApproval(requestId: string, error: ZodError) {
  return problemResponse({
    type: 'https://claimlens.dev/problems/invalid-approval',
    title: 'Invalid approval',
    status: 400,
    detail: error.issues.map((issue) => issue.message).join('; '),
    requestId,
  });
}
