"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDistanceMetres, isShopOpen } from "@/lib/utils/cn";
import type { WalkLocality, WalkShop, Offer } from "@/types";

// Minimum coordinate delta that triggers a data re-fetch.
// ~100 m in degrees — prevents GPS accuracy micro-updates from hammering the DB.
const MIN_REFETCH_DISTANCE_M = 100;

function getLiveCrowd(h: number) {
  if (h >= 9  && h <= 12) return { base: 20, label: "morning rush",  badge: "busy"  as const };
  if (h >= 13 && h <= 16) return { base: 35, label: "afternoon peak", badge: "hot"   as const };
  if (h >= 17 && h <= 21) return { base: 50, label: "evening rush",  badge: "hot"   as const };
  return                         { base: 10, label: "quiet hours",   badge: "quiet" as const };
}

interface UseWalkDataResult {
  localities:         WalkLocality[];
  nearestLocalityIdx: number;   // index in localities[] closest to user GPS
  gpsLocalityName:    string;   // nearest locality by GPS distance, ignoring shop filter
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
  const [gpsLocalityName,     setGpsLocalityName]     = useState("");
  const [loading,             setLoading]             = useState(true);
  const [error,               setError]               = useState<string | null>(null);

  // Track last-fetched coords — skip refetch if user moved < MIN_REFETCH_DISTANCE_M.
  // This prevents micro-GPS accuracy updates from cascading into redundant DB hits.
  const lastFetched = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (lastFetched.current) {
      const moved = getDistanceMetres(lat, lng, lastFetched.current.lat, lastFetched.current.lng);
      if (moved < MIN_REFETCH_DISTANCE_M) return;
    }
    lastFetched.current = { lat, lng };

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
          fetch(`/api/shops?lat=${lat}&lng=${lng}&radius=${radiusM}`),
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
            const nearestShopDist = Math.min(...locShops.map((s: WalkShop) => s.distance_m));
            const crowd = {
              count: live.base + Math.floor(Math.random() * 15) + locShops.length * 2,
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
              nearest_distance:  nearestShopDist,
              locality_distance: distToUser,
            };
          })
          .filter(Boolean)
          // Sort by nearest shop distance — locality with closest shop to user comes first
          .sort((a: any, b: any) => a.nearest_distance - b.nearest_distance);

        // Nearest locality by GPS from ALL localities (no shop filter)
        const nearestAll = [...allLocalities]
          .sort((a: any, b: any) => (locDistMap.get(a.id) ?? Infinity) - (locDistMap.get(b.id) ?? Infinity))[0];
        setGpsLocalityName(nearestAll?.name ?? "");

        setLocalities(walkLocs as WalkLocality[]);
        setNearestLocalityIdx(0); // index 0 = nearest after sort
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || "Something went wrong");
        setLoading(false);
      }
    }

    load();
  }, [lat, lng, radiusM]);

  return { localities, nearestLocalityIdx, gpsLocalityName, loading, error };
}
