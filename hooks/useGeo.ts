"use client";

import { useState, useCallback, useEffect } from "react";
import { reverseGeocode } from "@/lib/geo/distance";
import type { GeoState } from "@/types";

const CACHE_KEY   = "apnamap_geo_v2";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min — use as optimistic seed while fresh GPS loads

interface CachedGeo {
  lat: number;
  lng: number;
  locality: string;
  ts: number;
}

function loadCache(): CachedGeo | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: CachedGeo = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(lat: number, lng: number, locality: string) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ lat, lng, locality, ts: Date.now() }));
  } catch {}
}

const DEFAULT_LAT = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? "25.4358");
const DEFAULT_LNG = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? "81.8463");

const DEFAULT_LOCALITY =
  process.env.NEXT_PUBLIC_DEFAULT_CITY ?? "Nearby";

const DEFAULT: GeoState = {
  lat:          DEFAULT_LAT,
  lng:          DEFAULT_LNG,
  accuracy:     null,
  loading:      true,
  gpsConfirmed: false,
  error:        null,
  locality:     DEFAULT_LOCALITY,
};

export function useGeo() {
  const [geo, setGeo] = useState<GeoState>(DEFAULT);

  useEffect(() => {
    // Step 1: seed with cache immediately (fast, optimistic)
    const cached = loadCache();
    if (cached) {
      setGeo({
        lat:          cached.lat,
        lng:          cached.lng,
        accuracy:     null,
        loading:      true,        // still loading = true; fresh GPS request is in flight
        gpsConfirmed: false,
        error:        null,
        locality:     cached.locality,
      });
    }

    // Step 2: always request fresh GPS in background, even if cache was available
    if (!navigator?.geolocation) {
      setGeo(g => ({
        ...g,
        loading:      false,
        gpsConfirmed: true,
        error:        "GPS not available on this device.",
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        const locality = await reverseGeocode(lat, lng);
        if (accuracy <= 500) saveCache(lat, lng, locality);
        setGeo({ lat, lng, accuracy, loading: false, gpsConfirmed: true, error: null, locality });
      },
      (err) => {
        // GPS denied or failed — keep cached/default coords but stop spinner
        const errMsg = err.code === 1
          ? "Location access denied."
          : "Could not get location.";
        setGeo(g => ({
          ...g,
          loading:      false,
          gpsConfirmed: true,
          error:        g.lat === DEFAULT_LAT ? errMsg : null,
        }));
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  }, []); // runs once on mount

  /** Manual re-detect */
  const detect = useCallback(async () => {
    if (!navigator.geolocation) {
      setGeo(g => ({ ...g, error: "GPS not available on this device.", gpsConfirmed: true }));
      return;
    }

    setGeo(g => ({ ...g, loading: true, error: null, gpsConfirmed: false }));

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        const locality = await reverseGeocode(lat, lng);
        if (accuracy <= 500) saveCache(lat, lng, locality);
        setGeo({ lat, lng, accuracy, loading: false, gpsConfirmed: true, error: null, locality });
      },
      (err) => {
        setGeo(g => ({
          ...g,
          loading:      false,
          gpsConfirmed: true,
          error:
            err.code === 1
              ? "Location access denied. Showing nearest area."
              : "Could not get location.",
        }));
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  }, []);

  return { geo, detect };
}
