/**
 * Client-side deal tracking helpers.
 *
 * Each offer ID is tracked at most once per event type per browser session.
 * Tracking calls are fire-and-forget (non-blocking, non-critical).
 * Also records category interactions in user-interests for V2 personalisation.
 */
import { recordCategoryInteraction } from "./user-interests";

const TRACKED_KEY = "de_tracked_v1";
type TrackedState = "view" | "click" | "both";

function getTracked(): Record<string, TrackedState> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(TRACKED_KEY) ?? "{}") as Record<string, TrackedState>;
  } catch {
    return {};
  }
}

function setTracked(data: Record<string, TrackedState>): void {
  try { sessionStorage.setItem(TRACKED_KEY, JSON.stringify(data)); } catch { /* quota */ }
}

async function post(offerId: string, event: "view" | "click"): Promise<void> {
  try {
    await fetch("/api/deals/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId, event }),
    });
  } catch { /* non-critical */ }
}

/** Record a deal impression. No-op if already tracked this session. */
export async function trackDealView(offerId: string): Promise<void> {
  if (typeof window === "undefined") return;
  const tracked = getTracked();
  if (tracked[offerId]) return;          // view or click already recorded
  tracked[offerId] = "view";
  setTracked(tracked);
  await post(offerId, "view");
}

/**
 * Record a deal click. No-op if click already tracked this session.
 * Also fires a category interest update (weight=3) so the V2 scorer
 * knows this user is interested in deals from this shop's category.
 */
export async function trackDealClick(
  offerId: string,
  categorySlug?: string
): Promise<void> {
  if (typeof window === "undefined") return;
  const tracked = getTracked();
  const prev = tracked[offerId];
  if (prev === "click" || prev === "both") return;
  tracked[offerId] = prev === "view" ? "both" : "click";
  setTracked(tracked);
  // Record category interest for personalisation (fire-and-forget, sync)
  if (categorySlug) {
    recordCategoryInteraction(categorySlug, 3);
  }
  await post(offerId, "click");
}
