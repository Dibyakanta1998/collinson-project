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
  const service = getClaimService();
  const claim = await service.get(id);
  if (!claim) {
    return problemResponse({
      type: 'https://claimlens.dev/problems/claim-not-found',
      title: 'Claim not found',
      status: 404,
      detail: `No claim exists for ${id}.`,
      requestId,
    });
  }

  let unsubscribe = () => {};
  let keepAlive: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          unsubscribe();
        }
      };

      for (const event of await service.listEvents(id)) send(event);
      unsubscribe = service.subscribe(id, send);
      keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        } catch {
          unsubscribe();
        }
      }, 15_000);
      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        unsubscribe();
      }, { once: true });
    },
    cancel() {
      clearInterval(keepAlive);
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-request-id': requestId,
    },
  });
}
