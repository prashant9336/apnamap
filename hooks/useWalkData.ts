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

// GPS accuracy must be better than this to trust it for distance-based sorting.
// Network/IP/cell-tower fixes are often 500–2000m off — sorting by those coords
// would push the user's real locality far down the feed behind wrong-area results.
const GPS_SORT_THRESHOLD_M = 500;

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

  // Boolean dep: re-run the effect only when GPS crosses the reliable/unreliable boundary,
  // not on every minor accuracy reading change (e.g. 480→460→440m during satellite lock-on).
  const gpsReliableDep =
    gpsConfirmed &&
    gpsAccuracy != null &&
    gpsAccuracy <= GPS_SORT_THRESHOLD_M;

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

        // Use the component-scope flag (computed before the effect) for sorting + matching.
        const gpsReliable = gpsReliableDep;

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
          // Sort by GPS distance only when confirmed AND accuracy is within threshold.
          // Poor-accuracy GPS (network/cell fix, typically 500–2000m off) would sort the
          // feed around the wrong location — e.g. Airport area instead of Jhalwa — burying
          // the user's real locality far down the list. Fall back to DB priority in that case.
          .sort((a: any, b: any) =>
            gpsReliable
              ? a.locality_distance - b.locality_distance
              : a.priority - b.priority
          );

        // ── Confidence-based locality match ──────────────────────────────
        // Match against walkLocs (localities that have shops in the feed), NOT allLocalities.
        // This ensures the display label always corresponds to a locality the user can see,
        // preventing "Near Bamrauli" appearing while the feed shows Jhalwa/Civil Lines shops.
        // Skip matching when GPS accuracy is poor — the coordinates are too unreliable.
        let match: LocalityMatch | null = null;
        if (gpsReliable && walkLocs.length > 0) {
          match = matchLocality(lat, lng, walkLocs);
        }

        // nearestLocalityIdx: find the matched locality's position in the walk list
        let nearestIdx = -1;
        if (match && walkLocs.length > 0) {
          const matchedId = match.locality.id;
          nearestIdx = (walkLocs as any[]).findIndex((l: any) => l.id === matchedId);
          // If matched locality has no shops (filtered out), fall back to index 0
          if (nearestIdx === -1) nearestIdx = 0;
        }

        // Debug log
        if (process.env.NODE_ENV !== "production") {
          console.debug(
            `[locality] gpsConfirmed=${gpsConfirmed} accuracy=${gpsAccuracy != null ? Math.round(gpsAccuracy) + "m" : "null"} gpsReliable=${gpsReliable}` +
            (match
              ? ` → "${match.locality.name}" (${match.confidence}, ${Math.round(match.locality.distanceM)}m)` +
                (match.candidates[1] ? ` | 2nd: "${match.candidates[1].name}" ${Math.round(match.candidates[1].distanceM)}m` : "")
              : " → no match (poor accuracy or unconfirmed)")
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
  // gpsReliableDep is a boolean — re-runs only when GPS crosses the reliable threshold.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableLat, stableLng, radiusM, gpsReliableDep]);

  return { localities, nearestLocalityIdx, localityMatch, loading, error };
}
