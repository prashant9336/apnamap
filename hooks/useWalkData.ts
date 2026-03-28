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

        // 1) Fetch localities directly from DB
        const { data: locData, error: locErr } = await supabase
          .from("localities")
          .select("*, city:cities(*)")
          .order("priority");

        if (locErr) {
          setError(locErr.message);
          setLoading(false);
          return;
        }

        // 2) Fetch shops from API (not direct broken join query)
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

        if (!locData) {
          setLocalities([]);
          setLoading(false);
          return;
        }

        // Map localities by id for fallback
        const localityMetaMap = new Map<string, any>();
        locData.forEach((loc: any) => {
          localityMetaMap.set(loc.id, loc);
        });

        // Group shops by locality_id
        const localityMap = new Map<string, WalkShop[]>();

        rawShops.forEach((shop: any) => {
          const dist =
            typeof shop.distance_m === "number"
              ? shop.distance_m
              : getDistanceMetres(lat, lng, shop.lat, shop.lng);

          if (dist > radiusM) return;

          const fallbackLocality = localityMetaMap.get(shop.locality_id) ?? null;

          const walkShop: WalkShop = {
            ...shop,
            locality: shop.locality ?? fallbackLocality,
            distance_m: dist,
            is_open:
              shop.open_time && shop.close_time
                ? isShopOpen(shop.open_time, shop.close_time, shop.open_days)
                : false,
            top_offer:
              Array.isArray(shop.offers) && shop.offers.length > 0
                ? shop.offers.find((o: any) => o.is_active) ?? shop.offers[0]
                : null,
          };

          if (!localityMap.has(shop.locality_id)) {
            localityMap.set(shop.locality_id, []);
          }

          localityMap.get(shop.locality_id)!.push(walkShop);
        });

        const CROWD = [
          { count: 47, label: "people here now", badge: "hot" as const },
          { count: 42, label: "people here now", badge: "busy" as const },
          { count: 19, label: "people here now", badge: "quiet" as const },
          { count: 31, label: "people here now", badge: "busy" as const },
          { count: 12, label: "people here now", badge: "quiet" as const },
        ];

        const walkLocs: WalkLocality[] = locData
          .map((loc: any, idx: number) => {
            const locShops = (localityMap.get(loc.id) ?? []).sort(
              (a: any, b: any) => a.distance_m - b.distance_m
            );

            const crowd = CROWD[idx % CROWD.length];

            return {
              ...loc,
              city: loc.city ?? undefined,
              shops: locShops,
              crowd_count: crowd.count + Math.floor(Math.random() * 10),
              crowd_label: crowd.label,
              crowd_badge: crowd.badge,
            };
          })
          .filter((l: any) => l.shops.length > 0);

        setLocalities(walkLocs);
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