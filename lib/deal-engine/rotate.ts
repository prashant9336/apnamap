import type { ScoredOffer } from "./types";

const SEEN_KEY = "de_seen_v1";
const MAX_SEEN = 60; // max IDs to keep in session storage

/* ── Seen-deal registry ─────────────────────────────────────────── */

export function getSeenIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function markDealSeen(offerId: string): void {
  if (typeof window === "undefined") return;
  const seen = getSeenIds();
  seen.add(offerId);
  const trimmed = Array.from(seen).slice(-MAX_SEEN);
  try { sessionStorage.setItem(SEEN_KEY, JSON.stringify(trimmed)); } catch { /* quota */ }
}

/* ── Rotation ───────────────────────────────────────────────────── */

/**
 * Re-order a pre-scored list so:
 *   - Unseen deals surface before seen ones.
 *   - Within the top 5 unseen, add ±15 % jitter to prevent deterministic order
 *     becoming repetitive across page reloads.
 *   - Seen deals are preserved at the end (sorted by score) as fallback.
 */
export function rotatedOffers(scored: ScoredOffer[]): ScoredOffer[] {
  const seen = getSeenIds();

  const unseen = scored.filter(o => !seen.has(o.offer.id));
  const seenList = scored.filter(o => seen.has(o.offer.id));

  // Jitter top-5 unseen only — stable sort for the rest
  const jittered = unseen.map((o, i) => ({
    o,
    sortKey: i < 5 ? o.score + (Math.random() - 0.5) * o.score * 0.15 : o.score,
  }));
  jittered.sort((a, b) => b.sortKey - a.sortKey);

  return [...jittered.map(j => j.o), ...seenList];
}
