import type { ClaimEvent } from '@/domain/events';
import type { ApprovalDecision, ClaimInput } from '@/domain/types';
import type { StoredClaim } from '@/server/db/claims-repository';

export interface CreatedClaim {
  id: string;
  status: string;
  eventsUrl: string;
}

export async function createClaim(input: ClaimInput): Promise<CreatedClaim> {
  const response = await fetch('/api/claims', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.detail ?? 'Claim submission failed.');
  return body as CreatedClaim;
}

export async function getClaim(id: string): Promise<StoredClaim> {
  const response = await fetch(`/api/claims/${id}`);
  const body = await response.json();
  if (!response.ok) throw new Error(body.detail ?? 'Claim lookup failed.');
  return body as StoredClaim;
}

export async function submitApproval(id: string, decision: ApprovalDecision): Promise<StoredClaim> {
  const response = await fetch(`/api/claims/${id}/approval`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(decision),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.detail ?? 'Approval failed.');
  return body as StoredClaim;
}

export function subscribeToClaimEvents(
  id: string,
  onEvent: (event: ClaimEvent) => void,
): () => void {
  const source = new EventSource(`/api/claims/${id}/events`);
  source.onmessage = (message) => {
    try {
      onEvent(JSON.parse(message.data) as ClaimEvent);
    } catch {
      // Ignore malformed stream frames.
    }
  };
  return () => source.close();
}
