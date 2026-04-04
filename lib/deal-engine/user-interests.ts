/**
 * lib/deal-engine/user-interests.ts
 *
 * Lightweight localStorage-based user interest tracker.
 * Records which categories a user interacts with and uses
 * that signal to personalise deal scoring in V2.
 *
 * Design goals:
 *   - No backend required — all client-side, zero latency
 *   - Time-decay: interests halve every 7 days
 *   - Max 20 entries to stay under localStorage budget
 *   - SSR-safe (typeof window guards throughout)
 */

const STORAGE_KEY = "de_interests_v2";
const MAX_ENTRIES = 20;
const HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface InterestEntry {
  raw: number;   // accumulated raw score (before decay)
  ts:  number;   // timestamp of last interaction
}
type InterestMap = Record<string, InterestEntry>;

/* ── Read / write ────────────────────────────────────────────── */
function readMap(): InterestMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as InterestMap;
  } catch {
    return {};
  }
}

function writeMap(map: InterestMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch { /* storage quota */ }
}

/* ── Decay helper ────────────────────────────────────────────── */
function decayedScore(entry: InterestEntry, now: number): number {
  const ageMs = now - entry.ts;
  // Exponential decay: score halves every HALF_LIFE_MS
  const decayFactor = Math.pow(0.5, ageMs / HALF_LIFE_MS);
  return entry.raw * decayFactor;
}

/* ── Public API ──────────────────────────────────────────────── */

/**
 * Record a user interaction with a category.
 * weight: 1 for impressions, 3 for clicks, 5 for deep engagement.
 */
export function recordCategoryInteraction(
  categorySlug: string,
  weight: 1 | 3 | 5 = 1
): void {
  if (typeof window === "undefined") return;
  if (!categorySlug) return;

  const now = Date.now();
  const map = readMap();
  const existing = map[categorySlug];

  if (existing) {
    // Add weight on top of already-decayed score so recent activity dominates
    map[categorySlug] = {
      raw: decayedScore(existing, now) + weight,
      ts:  now,
    };
  } else {
    map[categorySlug] = { raw: weight, ts: now };
  }

  // Trim to MAX_ENTRIES — evict the least-recently-interacted entry
  const entries = Object.entries(map);
  if (entries.length > MAX_ENTRIES) {
    entries.sort((a, b) => b[1].ts - a[1].ts);    // most recent first
    const trimmed: InterestMap = {};
    entries.slice(0, MAX_ENTRIES).forEach(([k, v]) => { trimmed[k] = v; });
    writeMap(trimmed);
  } else {
    writeMap(map);
  }
}

/**
 * Get the interest bonus (0–15) for a category.
 * Returned as a flat additive score for scoreOfferV2.
 */
export function getCategoryInterest(categorySlug: string): number {
  if (typeof window === "undefined" || !categorySlug) return 0;
  const map = readMap();
  const entry = map[categorySlug];
  if (!entry) return 0;

  const now = Date.now();
  const score = decayedScore(entry, now);

  // Map [0, 20+] → [0, 15] with soft cap
  return Math.min(15, score * 0.75);
}

/**
 * Returns the full interest map with decayed scores.
 * Used for debugging / admin visibility.
 */
export function getAllInterests(): Record<string, number> {
  if (typeof window === "undefined") return {};
  const now = Date.now();
  const map = readMap();
  const result: Record<string, number> = {};
  Object.entries(map).forEach(([slug, entry]) => {
    const score = decayedScore(entry, now);
    if (score > 0.1) result[slug] = Math.round(score * 10) / 10;
  });
  return result;
}

/** Clear all interests (e.g. on sign-out). */
export function clearInterests(): void {
  if (typeof window !== "undefined") {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* */ }
  }
}
