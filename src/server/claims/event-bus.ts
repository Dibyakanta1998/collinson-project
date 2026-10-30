import type { ClaimEvent } from '@/domain/events';

type Listener = (event: ClaimEvent) => void;

export class ClaimEventBus {
  private readonly listeners = new Map<string, Set<Listener>>();

  publish(claimId: string, event: ClaimEvent) {
    for (const listener of this.listeners.get(claimId) ?? []) listener(event);
  }

  subscribe(claimId: string, listener: Listener): () => void {
    const group = this.listeners.get(claimId) ?? new Set<Listener>();
    group.add(listener);
    this.listeners.set(claimId, group);
    return () => {
      group.delete(listener);
      if (group.size === 0) this.listeners.delete(claimId);
    };
  }
}
