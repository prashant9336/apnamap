"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDistanceMetres, isShopOpen } from "@/lib/utils/cn";
import type { WalkLocality, WalkShop } from "@/types";

interface UseWalkDataResult {
  localities: WalkLocality[];
  loading: boolean;
  error: string | null;
}

const CROWD = [
  { count: 47, label: "people here now", badge: "hot" as const },
  { count: 42, label: "people here now", badge: "busy" as const },
  { count: 19, label: "people here now", badge: "quiet" as const },
  { count: 31, label: "people here now", badge: "busy" as const },
  { count: 12, label: "people here now", badge: "quiet" as const },
];

export function useWalkData(
  lat: number,
  lng: number,
  radiusM: number = 10000
): UseWalkDataResult {
  const [localities, setLocalities] = useState<WalkLocality[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          if (!cancelled) {
            setLocalities([]);
            setError("Invalid location coordinates");
            setLoading(false);
          }
          return;
        }

        setLoading(true);
        setError(null);

        const supabase = createClient();

        const { data: locData, error: locErr } = await supabase
          .from("localities")
          .select("*, city:cities(*)")
          .order("priority", { ascending: true });

        if (locErr) {
          if (!cancelled) {
            setLocalities([]);
            setError(locErr.message || "Failed to load localities");
            setLoading(false);
          }
          return;
        }

        const res = await fetch(
          `/api/shops?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(
            lng
          )}&radius=${encodeURIComponent(radiusM)}`,
          { cache: "no-store" }
        );

        let json: any = null;

        try {
          json = await res.json();
        } catch {
          json = null;
        }

        if (!res.ok) {
          if (!cancelled) {
            setLocalities([]);
            setError(json?.error || "Failed to load shops");
            setLoading(false);
          }
          return;
        }

        const rawShops = Array.isArray(json?.shops) ? json.shops : [];
        const safeLocData = Array.isArray(locData) ? locData : [];

        if (safeLocData.length === 0) {
          if (!cancelled) {
            setLocalities([]);
            setLoading(false);
          }
          return;
        }

        const localityMetaMap = new Map<string, any>();
        for (const loc of safeLocData) {
          localityMetaMap.set(loc.id, loc);
        }

        const localityMap = new Map<string, WalkShop[]>();

        for (const shop of rawShops) {
          if (
            !shop ||
            !shop.locality_id ||
            typeof shop.lat !== "number" ||
            typeof shop.lng !== "number"
          ) {
            continue;
          }

          const dist =
            typeof shop.distance_m === "number"
              ? shop.distance_m
              : getDistanceMetres(lat, lng, shop.lat, shop.lng);

          if (!Number.isFinite(dist) || dist > radiusM) {
            continue;
          }

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
                ? shop.offers.find((o: any) => o?.is_active) ?? shop.offers[0]
                : null,
          };

          if (!localityMap.has(shop.locality_id)) {
            localityMap.set(shop.locality_id, []);
          }

          localityMap.get(shop.locality_id)!.push(walkShop);
        }

        const walkLocs: WalkLocality[] = safeLocData
          .map((loc: any, idx: number) => {
            const locShops = [...(localityMap.get(loc.id) ?? [])].sort(
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
          .filter((loc: any) => Array.isArray(loc.shops) && loc.shops.length > 0);

        if (!cancelled) {
          setLocalities(walkLocs);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setLocalities([]);
          setError(err?.message || "Something went wrong");
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [lat, lng, radiusM]);

  return { localities, loading, error };
}