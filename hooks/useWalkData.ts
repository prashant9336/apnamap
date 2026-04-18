"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDistanceMetres, isShopOpen } from "@/lib/utils/cn";
import { matchLocality } from "@/lib/geo/locality-match";
import type { WalkLocality, WalkShop, Offer, LocalityMatch } from "@/types";

function getLiveCrowd(h: number) {
  if (h >= 9  && h <= 12) return { base: 20, label: "morning rush",  badge: "busy"  as const };
  if (h >= 13 && h <= 16) return { base: 35, label: "afternoon peak", badge: "hot"   as const };
  if (h >= 17 && h <= 21) return { base: 50, label: "evening rush",  badge: "hot"   as const };
  return                         { base: 10, label: "quiet hours",   badge: "quiet" as const };
}

interface UseWalkDataResult {
  localities:         WalkLocality[];
  nearestLocalityIdx: number;        // index in localities[] for GPS-nearest locality (-1 = not yet confirmed)
  localityMatch:      LocalityMatch | null; // confidence-based match result for display + debug
  loading:            boolean;
  error:              string | null;
}

// Below this accuracy we still use GPS for sorting/matching, but confidence is
// capped at "medium" so the label shows "Near Jhalwa" rather than "Jhalwa".
// Above this (e.g. network/IP fix at 2000m+) we fall back to DB priority order.
const GPS_ACCURACY_THRESHOLD_M = 500;

// Beyond this accuracy we don't trust the fix at all for ANY geo logic.
const GPS_UNUSABLE_THRESHOLD_M = 3000;

export function useWalkData(
  lat: number,
  lng: number,
  radiusM: number = 50000,
  gpsConfirmed: boolean = false,
  gpsAccuracy?: number | null,
): UseWalkDataResult {
  const [localities,         setLocalities]         = useState<WalkLocality[]>([]);
  const [nearestLocalityIdx, setNearestLocalityIdx] = useState(-1);
  const [localityMatch,      setLocalityMatch]      = useState<LocalityMatch | null>(null);
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState<string | null>(null);

  // Round to 3 decimal places ≈ 111 m grid — prevents re-fetch on sub-100m GPS jitter
  const stableLat = Math.round(lat * 1000) / 1000;
  const stableLng = Math.round(lng * 1000) / 1000;

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const supabase = createClient();

        // ── Fetch localities + shops in parallel ──────────────────────────
        const [locResult, shopsRes] = await Promise.all([
          supabase
            .from("localities")
            .select("*, city:cities(id, name, slug)")
            .order("priority"),
          fetch(`/api/shops?lat=${stableLat}&lng=${stableLng}&radius=${radiusM}`, { cache: "no-store" }),
        ]);

        if (locResult.error) {
          console.error("[useWalkData] localities fetch error:", locResult.error.message);
          setError(locResult.error.message);
          setLoading(false);
          return;
        }

        const json = await shopsRes.json();
        if (!shopsRes.ok) {
          console.error("[useWalkData] shops fetch error:", json?.error);
          setError(json?.error || "Failed to load shops");
          setLoading(false);
          return;
        }

        const allLocalities = locResult.data ?? [];
        const rawShops      = json?.shops ?? [];

        // ── Distance from user to each locality centre ────────────────────
        const locDistMap = new Map<string, number>();
        allLocalities.forEach((loc: any) => {
          locDistMap.set(
            loc.id,
            getDistanceMetres(lat, lng, parseFloat(loc.lat), parseFloat(loc.lng))
          );
        });

        // ── Index localities by id ────────────────────────────────────────
        const localityMetaMap = new Map<string, any>();
        allLocalities.forEach((loc: any) => localityMetaMap.set(loc.id, loc));

        // ── Bucket shops into their locality ──────────────────────────────
        const localityShopMap = new Map<string, WalkShop[]>();

        rawShops.forEach((shop: any) => {
          const dist =
            typeof shop.distance_m === "number"
              ? shop.distance_m
              : getDistanceMetres(lat, lng, shop.lat, shop.lng);

          if (dist > radiusM) return;

          const now = Date.now();
          const activeOffers: Offer[] = Array.isArray(shop.offers)
            ? shop.offers.filter((o: Offer) =>
                o.is_active && (!o.ends_at || new Date(o.ends_at).getTime() > now)
              )
            : [];

          const walkShop: WalkShop = {
            ...shop,
            locality:      shop.locality ?? localityMetaMap.get(shop.locality_id) ?? null,
            distance_m:    dist,
            is_open:
              shop.open_time && shop.close_time
                ? isShopOpen(shop.open_time, shop.close_time, shop.open_days)
                : false,
            top_offer:     shop.top_offer ?? activeOffers[0] ?? null,
            active_offers: activeOffers,
            is_trending: shop.is_trending ?? ((shop.top_offer?.tier ?? 5) <= 1),
            is_busy:     dist < 2000 && (shop.view_count ?? 0) > 10,
          };

          if (!localityShopMap.has(shop.locality_id)) {
            localityShopMap.set(shop.locality_id, []);
          }
          localityShopMap.get(shop.locality_id)!.push(walkShop);
        });

        // ── Time-based crowd labels ───────────────────────────────────────
        const hour = new Date().getHours();
        const live = getLiveCrowd(hour);

        // GPS is usable for distance-based sorting when confirmed and accuracy is not unusable.
        // Even poor-accuracy fixes (500–3000m) sort better than DB priority order.
        const poorAccuracy = gpsAccuracy != null && gpsAccuracy > GPS_ACCURACY_THRESHOLD_M;
        const gpsReliable  = gpsConfirmed && (gpsAccuracy == null || gpsAccuracy <= GPS_UNUSABLE_THRESHOLD_M);

        // ── Build WalkLocality[], skip localities with no shops ────────────
        const walkLocs: WalkLocality[] = allLocalities
          .map((loc: any) => {
            const locShops = (localityShopMap.get(loc.id) ?? [])
              .sort((a: WalkShop, b: WalkShop) => {
                const aBoost = (a.is_boosted ? 100_000 : 0) + (a.manual_priority ?? 0) * 10_000;
                const bBoost = (b.is_boosted ? 100_000 : 0) + (b.manual_priority ?? 0) * 10_000;
                if (aBoost !== bBoost) return bBoost - aBoost;
                return a.distance_m - b.distance_m;
              });

            if (locShops.length === 0) return null;

            const distToUser = locDistMap.get(loc.id) ?? Infinity;

            const totalViews = locShops.reduce(
              (sum: number, s: WalkShop) => sum + (s.view_count ?? 0),
              0
            );
            const crowd = {
              count: Math.min(
                live.base + locShops.length * 3 + Math.floor(totalViews / 12),
                500
              ),
              label: live.label,
              badge: live.badge,
            };

            return {
              ...loc,
              city:              loc.city ?? undefined,
              shops:             locShops,
              crowd_count:       crowd.count,
              crowd_label:       crowd.label,
              crowd_badge:       crowd.badge,
              nearest_distance:  locShops[0].distance_m,
              locality_distance: distToUser,
            };
          })
          .filter(Boolean)
          // Sort by distance when GPS is confirmed (any accuracy up to GPS_UNUSABLE_THRESHOLD_M).
          // Even a 600m-accuracy fix places Jhalwa correctly vs. sorting by DB priority (29).
          // Only fall back to DB priority when GPS is unconfirmed or completely unusable.
          .sort((a: any, b: any) =>
            gpsReliable
              ? a.locality_distance - b.locality_distance
              : a.priority - b.priority
          );

        // ── Confidence-based locality match ──────────────────────────────
        // Always match against ApnaMap localities when GPS is confirmed (any accuracy).
        // poorAccuracy caps confidence at "medium" → shows "Near Jhalwa" not "Jhalwa".
        // This prevents Nominatim labels like "Bamrauli" from leaking into the display.
        let match: LocalityMatch | null = null;
        if (gpsReliable && walkLocs.length > 0) {
          match = matchLocality(lat, lng, walkLocs, poorAccuracy);
        }

        // nearestLocalityIdx: find the matched locality's position in the walk list
        let nearestIdx = -1;
        if (match && walkLocs.length > 0) {
          const matchedId = match.locality.id;
          nearestIdx = (walkLocs as any[]).findIndex((l: any) => l.id === matchedId);
          // If matched locality has no shops (filtered out), fall back to index 0
          if (nearestIdx === -1) nearestIdx = 0;
        }

        if (process.env.NODE_ENV !== "production") {
          console.debug(
            `[locality] confirmed=${gpsConfirmed} accuracy=${gpsAccuracy != null ? Math.round(gpsAccuracy) + "m" : "null"} poor=${poorAccuracy} reliable=${gpsReliable}` +
            (match
              ? ` → "${match.locality.name}" (${match.confidence}, ${Math.round(match.locality.distanceM)}m away)` +
                (match.candidates[1] ? ` | 2nd: "${match.candidates[1].name}" ${Math.round(match.candidates[1].distanceM)}m` : "")
              : " → no match")
          );
        }

        setLocalities(walkLocs as WalkLocality[]);
        setNearestLocalityIdx(nearestIdx);
        setLocalityMatch(match);
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || "Something went wrong");
        setLoading(false);
      }
    }

    load();
  // stableLat/stableLng rounded to 3dp — only re-fetch when user moves >~111m.
  // gpsConfirmed triggers exactly once after mount (when GPS gives its first reading).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableLat, stableLng, radiusM, gpsConfirmed]);

  return { localities, nearestLocalityIdx, localityMatch, loading, error };
}
