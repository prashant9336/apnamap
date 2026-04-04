import type { WalkLocality, WalkShop } from "@/types";
import { scoreOffer }              from "./score";
import { classifyDealEngineType }  from "./classify";
import { rotatedOffers }           from "./rotate";

export type { DealEngineType, ScoredOffer } from "./types";
export { classifyDealEngineType }           from "./classify";
export { scoreOffer }                       from "./score";
export { trackDealView, trackDealClick }    from "./track";
export { markDealSeen }                     from "./rotate";

/* ── Haversine distance (km) ─────────────────────────────────────── */
function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ── RankedShop ──────────────────────────────────────────────────── */
export interface RankedShop extends WalkShop {
  dealScore: number;
}

/* ── rankLocalities ──────────────────────────────────────────────── */
/**
 * Re-orders shops within every locality by deal score (descending).
 *
 * - Shops with live deals surface first.
 * - Open shops rank above closed ones at equal score.
 * - Pure client-side: no extra fetch, uses data already in memory.
 */
export function rankLocalities(
  localities: WalkLocality[],
  userLat: number,
  userLng: number
): (WalkLocality & { shops: RankedShop[] })[] {
  const now = Date.now();

  return localities.map(loc => {
    const rankedShops: RankedShop[] = loc.shops.map(shop => {
      const distKm =
        userLat && userLng
          ? haversineKm(userLat, userLng, shop.lat, shop.lng)
          : (shop.distance_m ?? 500) / 1000;

      const dealScore = shop.top_offer
        ? scoreOffer(shop.top_offer, distKm, now)
        : 0;

      return { ...shop, dealScore };
    });

    rankedShops.sort((a, b) => {
      if (b.dealScore !== a.dealScore) return b.dealScore - a.dealScore;
      // Tiebreak: open before closed
      if (a.is_open !== b.is_open) return a.is_open ? -1 : 1;
      return 0;
    });

    // Visibility rule: real estate max 2 per locality, always shown last.
    // Prevents property listings from crowding out active shop deals.
    const RE_SLUG = "real-estate-property";
    const reShops   = rankedShops.filter(s => s.category?.slug === RE_SLUG).slice(0, 2);
    const restShops = rankedShops.filter(s => s.category?.slug !== RE_SLUG);

    return { ...loc, shops: [...restShops, ...reShops] };
  });
}

/* ── topOffersAcrossLocalities ───────────────────────────────────── */
/**
 * Returns the highest-scored unique offers across all localities,
 * with session-based rotation so the same deal doesn't dominate.
 */
export function topOffersAcrossLocalities(
  localities: WalkLocality[],
  userLat: number,
  userLng: number,
  maxResults = 5
) {
  const now = Date.now();
  const scored = localities.flatMap(loc =>
    loc.shops
      .filter(s => s.top_offer)
      .map(shop => {
        const distKm = haversineKm(userLat, userLng, shop.lat, shop.lng);
        const offer  = shop.top_offer!;
        return {
          offer,
          score:    scoreOffer(offer, distKm, now),
          dealType: classifyDealEngineType(offer, now),
        };
      })
  );

  scored.sort((a, b) => b.score - a.score);
  return rotatedOffers(scored).slice(0, maxResults);
}
