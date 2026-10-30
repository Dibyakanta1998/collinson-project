const windowMs = 60_000;
const maxHits = 30;
const hits = new Map<string, number[]>();

export function consumeRateLimit(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
  if (recent.length >= maxHits) return false;
  recent.push(now);
  hits.set(key, recent);
  return true;
}
