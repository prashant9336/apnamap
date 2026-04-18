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

// Two separate thresholds — sorting and matching have different sensitivity needs:
//
// GPS_SORT_THRESHOLD_M (500m): Only sort localities by GPS distance when accuracy is
//   this good. A 600m fix can point to the wrong area (airport vs Jhalwa). Sorting
//   by wrong coords is worse than DB priority order.
//
// GPS_MATCH_THRESHOLD_M (2000m): Still try to NAME the user's locality up to 2km
//   accuracy — just cap confidence at "medium" so the UI shows "Near [Locality]"
//   rather than a confirmed label. Between 500–2000m GPS is approximately right.
const GPS_SORT_THRESHOLD_M  = 500;
const GPS_MATCH_THRESHOLD_M = 2000;

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

        // gpsReliable: true only for ≤500m — used for distance-based locality SORTING.
        // A 600m fix can point to the wrong area (airport vs Jhalwa); sorting by those
        // coords puts Bamrauli first, which is worse than DB priority order.
        const gpsReliable  = gpsConfirmed && (gpsAccuracy == null || gpsAccuracy <= GPS_SORT_THRESHOLD_M);
        // gpsMatchable: true up to 2000m — used for locality NAME resolution.
        // Between 500–2000m GPS is approximately right; RPC/client match still returns
        // a useful "Near [Locality]" label with medium confidence instead of nothing.
        const gpsMatchable = gpsConfirmed && (gpsAccuracy == null || gpsAccuracy <= GPS_MATCH_THRESHOLD_M);

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
          // Sort by distance when GPS is good enough for ordering (≤2000m).
          // Jhalwa vs Bamrauli are 15km apart — 1500m accuracy still orders them correctly.
          // Fall back to DB priority only when GPS is unconfirmed or very inaccurate.
          .sort((a: any, b: any) =>
            gpsReliable
              ? a.locality_distance - b.locality_distance
              : a.priority - b.priority
          );

        // ── Confidence-based locality match ──────────────────────────────
        // Attempt locality NAME resolution when GPS accuracy ≤2000m (gpsMatchable).
        // Uses server-side RPC (migration 025) as canonical resolver; falls back to
        // client matchLocality if RPC unavailable. Between 500–2000m the RPC still
        // returns a result but confidence will be capped at "medium" → "Near [Locality]".
        let match: LocalityMatch | null = null;
        if (gpsMatchable && walkLocs.length > 0) {
          try {
            const res = await fetch(
              `/api/locality/resolve?lat=${lat}&lng=${lng}`,
              { cache: "no-store" }
            );
            if (res.ok) {
              const { locality: resolved } = await res.json();
              if (resolved && resolved.confidence !== "low") {
                // Map server result into the LocalityMatch shape the UI expects
                const candidate = walkLocs.find((l: any) => l.id === resolved.id)
                  ?? walkLocs.find((l: any) => l.slug === resolved.slug);
                if (candidate) {
                  match = {
                    locality:    { id: resolved.id, name: resolved.name, slug: resolved.slug,
                                   lat: parseFloat(resolved.lat), lng: parseFloat(resolved.lng),
                                   radius_m: resolved.radius_m, distanceM: resolved.distance_m },
                    confidence:  resolved.confidence,
                    displayName: resolved.displayName,
                    candidates:  [],
                  };
                }
              }
            }
          } catch {
            // Server resolve failed — fall through to client-side matching
          }
          // Client-side fallback (also used when server result had no matching walkLoc)
          if (!match) match = matchLocality(lat, lng, walkLocs);
        }

        // nearestLocalityIdx: find the matched locality's position in the walk list
        let nearestIdx = -1;
        if (match && walkLocs.length > 0) {
          const matchedId = match.locality.id;
          nearestIdx = (walkLocs as any[]).findIndex((l: any) => l.id === matchedId);
          if (nearestIdx === -1) nearestIdx = 0;
        }

        if (process.env.NODE_ENV !== "production") {
          const acc = gpsAccuracy != null ? Math.round(gpsAccuracy) + "m" : "null";
          console.debug(
            `[locality] confirmed=${gpsConfirmed} accuracy=${acc} sortable=${gpsReliable} matchable=${gpsReliable}` +
            (match
              ? ` → "${match.locality.name}" (${match.confidence}, ${Math.round(match.locality.distanceM)}m away)` +
                (match.candidates[1] ? ` | 2nd: "${match.candidates[1].name}" ${Math.round(match.candidates[1].distanceM)}m` : "")
              : " → no label (GPS accuracy too low for name match)")
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
  // Re-run when coords change, GPS confirms, or accuracy crosses either threshold.
  // Bucketing avoids re-runs on minor jitter but triggers at the two meaningful lines:
  //   ≤500m  → enables distance sorting ("good")
  //   ≤2000m → enables locality name matching ("approx")
  //   >2000m → no sort, no match ("poor")
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableLat, stableLng, radiusM, gpsConfirmed,
      gpsAccuracy == null ? "unknown"
        : gpsAccuracy <= GPS_SORT_THRESHOLD_M  ? "good"
        : gpsAccuracy <= GPS_MATCH_THRESHOLD_M ? "approx"
        : "poor"]);

  return { localities, nearestLocalityIdx, localityMatch, loading, error };
}
