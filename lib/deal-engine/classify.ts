import type { Offer } from "@/types";
import type { DealEngineType } from "./types";

/**
 * Classify a single offer into one of four engine deal types.
 *
 * Priority order (first match wins):
 *   1. mystery  — offer.is_mystery flag
 *   2. flash    — ends_at within 6 hours
 *   3. big_deal — tier=1 OR ≥30 % discount
 *   4. new_deal — fallback
 */
export function classifyDealEngineType(
  offer: Offer,
  now: number = Date.now()
): DealEngineType {
  // 1. Explicitly marked mystery
  if ((offer as Offer & { is_mystery?: boolean }).is_mystery) return "mystery";

  // 2. Flash: active ends_at within 6 hours (360 min)
  if (offer.ends_at) {
    const minsLeft = (new Date(offer.ends_at).getTime() - now) / 60_000;
    if (minsLeft > 0 && minsLeft < 360) return "flash_deal";
  }

  // 3. Big deal: tier-1 or strong discount
  const pct = offer.discount_type === "percent" ? (offer.discount_value ?? 0) : 0;
  if (offer.tier === 1 || pct >= 30) return "big_deal";

  // 4. Default
  return "new_deal";
}
