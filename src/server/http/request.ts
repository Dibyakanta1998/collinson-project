import { randomUUID } from 'node:crypto';

export function readRequestId(request: Request): string {
  return request.headers.get('x-request-id')?.trim() || randomUUID();
}

export function readIdempotencyKey(request: Request): string | undefined {
  const key = request.headers.get('idempotency-key')?.trim();
  return key || undefined;
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
