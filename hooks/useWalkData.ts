"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDistanceMetres, isShopOpen } from "@/lib/utils/cn";
import type { WalkLocality, WalkShop } from "@/types";

interface UseWalkDataResult {
  localities: WalkLocality[];
  loading: boolean;
  error: string | null;
}

export function useWalkData(
  lat: number,
  lng: number,
  radiusM: number = 10000
): UseWalkDataResult {
  const [localities, setLocalities] = useState<WalkLocality[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const supabase = createClient();

        // ✅ Fetch localities
        const { data: locData, error: locErr } = await supabase
          .from("localities")
          .select("*, city:cities(*)")
          .order("priority");

        if (locErr) {
          setError(locErr.message);
          setLoading(false);
          return;
        }

        // ✅ Fetch shops
        const res = await fetch(
          `/api/shops?lat=${lat}&lng=${lng}&radius=${radiusM}`,
          { cache: "no-store" }
        );

        const json = await res.json();

        if (!res.ok) {
          setError(json?.error || "Failed to load shops");
          setLoading(false);
          return;
        }

        const rawShops = json?.shops ?? [];

        const localityMetaMap = new Map<string, any>();
        locData?.forEach((loc: any) => {
          localityMetaMap.set(loc.id, loc);
        });

        const localityMap = new Map<string, WalkShop[]>();

        rawShops.forEach((shop: any) => {
          const dist =
            typeof shop.distance_m === "number"
              ? shop.distance_m
              : getDistanceMetres(lat, lng, shop.lat, shop.lng);

          if (dist > radiusM) return;

          const fallbackLocality =
            localityMetaMap.get(shop.locality_id) ?? null;

          const walkShop: WalkShop = {
            ...shop,
            locality: shop.locality ?? fallbackLocality,
            distance_m: dist,

            is_open:
              shop.open_time && shop.close_time
                ? isShopOpen(shop.open_time, shop.close_time, shop.open_days)
                : false,

            top_offer: shop.top_offer ?? null,

            // 🔥 LIVE FEEL FLAGS (NO UI CHANGE)
            is_trending:
              (shop.top_offer?.tier ?? 5) <= 2 &&
              Math.random() > 0.5,

            is_busy:
              dist < 2000 && Math.random() > 0.4,
          };

          if (!localityMap.has(shop.locality_id)) {
            localityMap.set(shop.locality_id, []);
          }

          localityMap.get(shop.locality_id)!.push(walkShop);
        });

        // 🔥 TIME-BASED CROWD ENGINE
        const getLiveCrowd = (hour: number) => {
          if (hour >= 9 && hour <= 12)
            return { base: 20, label: "morning rush", badge: "busy" as const };

          if (hour >= 13 && hour <= 16)
            return { base: 35, label: "afternoon peak", badge: "hot" as const };

          if (hour >= 17 && hour <= 21)
            return { base: 50, label: "evening rush", badge: "hot" as const };

          return { base: 10, label: "quiet hours", badge: "quiet" as const };
        };

        const hour = new Date().getHours();

        const walkLocs: WalkLocality[] = (locData ?? [])
          .map((loc: any, idx: number) => {
            const locShops = (localityMap.get(loc.id) ?? []).sort(
              (a: any, b: any) => a.distance_m - b.distance_m
            );

            if (locShops.length === 0) return null;

            const live = getLiveCrowd(hour);

            const crowd = {
              count:
                live.base +
                Math.floor(Math.random() * 15) +
                locShops.length * 2,
              label: live.label,
              badge: live.badge,
            };

            return {
              ...loc,
              city: loc.city ?? undefined,
              shops: locShops,

              crowd_count: crowd.count,
              crowd_label: crowd.label,
              crowd_badge: crowd.badge,

              nearest_distance: locShops[0].distance_m,
            };
          })
          .filter(Boolean)
          .sort((a: any, b: any) => {
            // 🔥 SMART PRIORITY SORT
            const scoreA = a.crowd_count * 2 - a.nearest_distance / 100;
            const scoreB = b.crowd_count * 2 - b.nearest_distance / 100;

            return scoreB - scoreA;
          });

        setLocalities(walkLocs as WalkLocality[]);
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || "Something went wrong");
        setLoading(false);
      }
    }

    load();
  }, [lat, lng, radiusM]);

  return { localities, loading, error };
}