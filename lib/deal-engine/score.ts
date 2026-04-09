import type { Offer } from "@/types";
import { classifyDealEngineType } from "./classify";

/**
 * Score an offer on a 0–100+ scale.
 *
 * Components:
 *   type_weight   0–40  (big > flash > mystery > new)
 *   offer_strength 0–25  (discount depth)
 *   freshness      0–20  (exponential decay, peaks in first 12 h)
 *   distance       0–15  (closer = more points)
 *   engagement     0–12  (CTR + log-click bonus)
 *   flash_urgency  0–10  (last 2 h of flash deal)
 *   featured       0–8   (is_featured flag)
 */
export function scoreOffer(
  offer: Offer,
  distanceKm: number,
  now: number = Date.now()
): number {
  let score = 0;

  /* 1. Type base weight */
  const TYPE_BASE: Record<string, number> = {
    big_deal:  40,
    flash_deal: 35,
    mystery:   20,
    new_deal:  10,
  };
  score += TYPE_BASE[classifyDealEngineType(offer, now)] ?? 10;

  /* 2. Offer strength (0–25) */
  if (offer.discount_type === "percent" && offer.discount_value) {
    score += Math.min(25, offer.discount_value * 0.42);   // 60 % → ~25 pts
  } else if (offer.discount_type === "flat" && offer.discount_value) {
    score += Math.min(18, offer.discount_value / 55);     // ₹990 → ~18 pts
  } else if (offer.discount_type === "bogo") {
    score += 15;
  } else if (offer.discount_type === "free") {
    score += 18;
  }

  /* 3. Freshness — exponential decay over 18 h half-life (0–20) */
  const ageHours = (now - new Date(offer.created_at).getTime()) / 3_600_000;
  score += Math.max(0, 20 * Math.exp(-ageHours / 18));

  /* 4. Distance — closer is better (0–15) */
  score += Math.max(0, 15 - distanceKm * 4);

  /* 5. Engagement: CTR + log-click bonus (0–12) */
  if (offer.view_count > 0) {
    const ctr = Math.min(1, offer.click_count / offer.view_count);
    score += ctr * 8;
  }
  score += Math.min(4, Math.log1p(offer.click_count));

  /* 6. Flash urgency: amps up in last 2 h (0–10) */
  if (offer.ends_at) {
    const minsLeft = (new Date(offer.ends_at).getTime() - now) / 60_000;
    if (minsLeft > 0 && minsLeft < 120) {
      score += Math.max(0, 10 * (1 - minsLeft / 120));
    }
  }

  /* 7. Featured boost */
  if (offer.is_featured) score += 8;

  /* 8. Admin-forced labels */
  if (offer.is_big_deal)  score += 15;
  if (offer.is_flash)     score += 12;
  if (offer.is_recommended) score += 6;

  /* 9. Manual priority: each point is worth ~5 score units */
  score += (offer.manual_priority ?? 0) * 5;

  return Math.round(score * 10) / 10;
}

/**
 * scoreOfferV2 — extends scoreOffer with three V2 layers:
 *
 * 8. User interest    0–15   Category the user has clicked before gets a bonus.
 *                            Injected as a function to keep this module pure.
 * 9. Auto-boost       0–5    High-CTR deals (>25 % with 10+ views) get amplified.
 * 10. Auto-fade      –10     Stale deals (>48 h) with cold CTR (<5 % with 20+ views)
 *                            are de-ranked to clear space for fresh inventory.
 *
 * final_score = scoreOffer(v1) + user_interest + auto_boost − auto_fade
 */
export function scoreOfferV2(
  offer: Offer,
  distanceKm: number,
  now: number,
  categorySlug: string,
  getCategoryInterest: (slug: string) => number
): number {
  let score = scoreOffer(offer, distanceKm, now);

  /* 8. User interest bonus (0–15) */
  score += getCategoryInterest(categorySlug);

  /* 9. Auto-boost: high engagement deals surface faster */
  if (offer.view_count > 10) {
    const ctr = offer.click_count / offer.view_count;
    if (ctr > 0.25) score += 5;
  }

  /* 10. Auto-fade: deprioritise stale cold deals to create room for new ones */
  const ageHours = (now - new Date(offer.created_at).getTime()) / 3_600_000;
  if (
    ageHours > 48 &&
    offer.view_count > 20 &&
    offer.click_count / offer.view_count < 0.05
  ) {
    score -= 10;
  }

  return Math.max(0, Math.round(score * 10) / 10);
}
