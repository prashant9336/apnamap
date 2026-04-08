"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDistanceMetres, isShopOpen } from "@/lib/utils/cn";
import type { WalkLocality, WalkShop } from "@/types";

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
            .select("id, name, slug, lat, lng, type, zone, priority, city:cities(id, name, slug)")
            .order("priority"),
          fetch(`/api/shops?lat=${lat}&lng=${lng}&radius=${radiusM}`, { cache: "no-store" }),
        ]);

        if (locResult.error) {
          setError(locResult.error.message);
          setLoading(false);
          return;
        }

        const json = await shopsRes.json();
        if (!shopsRes.ok) {
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

          const walkShop: WalkShop = {
            ...shop,
            locality:    shop.locality ?? localityMetaMap.get(shop.locality_id) ?? null,
            distance_m:  dist,
            is_open:
              shop.open_time && shop.close_time
                ? isShopOpen(shop.open_time, shop.close_time, shop.open_days)
                : false,
            top_offer:   shop.top_offer ?? null,
            is_trending: (shop.top_offer?.tier ?? 5) <= 2 && Math.random() > 0.5,
            is_busy:     dist < 2000 && Math.random() > 0.4,
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
              .sort((a: any, b: any) => a.distance_m - b.distance_m);

            if (locShops.length === 0) return null;

            const distToUser = locDistMap.get(loc.id) ?? Infinity;
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
  }, [lat, lng, radiusM]);

  return { localities, nearestLocalityIdx, loading, error };
}
