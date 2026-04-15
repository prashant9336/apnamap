"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDistanceMetres, isShopOpen } from "@/lib/utils/cn";
import type { WalkLocality, WalkShop, Offer } from "@/types";

function getLiveCrowd(h: number) {
  if (h >= 9  && h <= 12) return { base: 20, label: "morning rush",  badge: "busy"  as const };
  if (h >= 13 && h <= 16) return { base: 35, label: "afternoon peak", badge: "hot"   as const };
  if (h >= 17 && h <= 21) return { base: 50, label: "evening rush",  badge: "hot"   as const };
  return                         { base: 10, label: "quiet hours",   badge: "quiet" as const };
}

interface UseWalkDataResult {
  localities:         WalkLocality[];
  nearestLocalityIdx: number;   // index in localities[] closest to user GPS
  loading:            boolean;
  error:              string | null;
}

export function useWalkData(
  lat: number,
  lng: number,
  radiusM: number = 50000
): UseWalkDataResult {
  const [localities,          setLocalities]          = useState<WalkLocality[]>([]);
  const [nearestLocalityIdx,  setNearestLocalityIdx]  = useState(0);
  const [loading,             setLoading]             = useState(true);
  const [error,               setError]               = useState<string | null>(null);

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
            // Use DB is_trending flag; fall back to tier signal (no random)
            is_trending: shop.is_trending ?? ((shop.top_offer?.tier ?? 5) <= 1),
            // Busy = nearby + has real engagement
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

        // ── Build WalkLocality[], skip localities with no shops ────────────
        const walkLocs: WalkLocality[] = allLocalities
          .map((loc: any) => {
            const locShops = (localityShopMap.get(loc.id) ?? [])
              .sort((a: WalkShop, b: WalkShop) => {
                // Boosted / prioritised shops float to the top within their locality
                const aBoost = (a.is_boosted ? 100_000 : 0) + (a.manual_priority ?? 0) * 10_000;
                const bBoost = (b.is_boosted ? 100_000 : 0) + (b.manual_priority ?? 0) * 10_000;
                if (aBoost !== bBoost) return bBoost - aBoost;
                return a.distance_m - b.distance_m;
              });

            if (locShops.length === 0) return null;

            const distToUser = locDistMap.get(loc.id) ?? Infinity;

            // Crowd count grows with real platform activity:
            //   • locShops.length * 3  — each approved vendor/shop adds weight
            //   • totalViews / 12      — each shop page visit (user activity) adds weight
            // Both signals accumulate naturally over time; no manual seeding needed.
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
              locality_distance: distToUser,  // distance to locality centre
            };
          })
          .filter(Boolean)
          // ── PRIMARY SORT: distance from user to locality centre ───────────
          .sort((a: any, b: any) => a.locality_distance - b.locality_distance);

        setLocalities(walkLocs as WalkLocality[]);
        setNearestLocalityIdx(0); // index 0 = nearest after sort
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || "Something went wrong");
        setLoading(false);
      }
    }

    load();
  // stableLat/stableLng are rounded to 3dp — only re-fetch when user moves >~111m
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableLat, stableLng, radiusM]);

  return { localities, nearestLocalityIdx, loading, error };
}
