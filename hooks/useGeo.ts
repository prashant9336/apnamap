"use client";

import { useState, useCallback, useEffect } from "react";
import { reverseGeocode } from "@/lib/geo/distance";
import type { GeoState } from "@/types";

const CACHE_KEY   = "apnamap_geo";
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
  process.env.NEXT_PUBLIC_DEFAULT_CITY ?? "Nearby";   // no hardcoded "Prayagraj"

const DEFAULT: GeoState = {
  lat: DEFAULT_LAT,
  lng: DEFAULT_LNG,
  accuracy: null,
  loading: true,  // start as loading — we will always try GPS
  error: null,
  locality: DEFAULT_LOCALITY,
};

export function useGeo() {
  const [geo, setGeo] = useState<GeoState>(DEFAULT);

  useEffect(() => {
    // Step 1: seed with cache immediately (fast, optimistic)
    const cached = loadCache();
    if (cached) {
      setGeo({
        lat:      cached.lat,
        lng:      cached.lng,
        accuracy: null,
        loading:  true,        // still loading = true; fresh GPS request is in flight
        error:    null,
        locality: cached.locality,
      });
    }

    // Step 2: always request fresh GPS in background, even if cache was available
    if (!navigator?.geolocation) {
      setGeo(g => ({
        ...g,
        loading: false,
        error: "GPS not available on this device.",
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        const locality = await reverseGeocode(lat, lng);
        saveCache(lat, lng, locality);
        setGeo({ lat, lng, accuracy, loading: false, error: null, locality });
      },
      (err) => {
        // GPS denied or failed — keep cached/default coords but stop spinner
        // and show a gentle message only if we have NO cache to fall back on
        const errMsg = err.code === 1
          ? "Location access denied."
          : "Could not get location.";
        setGeo(g => ({
          ...g,
          loading: false,
          // Only surface the error if we have no useful location yet
          error: g.lat === DEFAULT_LAT ? errMsg : null,
        }));
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }, // maximumAge: 0 = always fresh
    );
  }, []); // runs once on mount

  /** Manual re-detect (e.g. user taps a "Detect my location" button) */
  const detect = useCallback(async () => {
    if (!navigator.geolocation) {
      setGeo(g => ({ ...g, error: "GPS not available on this device." }));
      return;
    }

    setGeo(g => ({ ...g, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        const locality = await reverseGeocode(lat, lng);
        saveCache(lat, lng, locality);
        setGeo({ lat, lng, accuracy, loading: false, error: null, locality });
      },
      (err) => {
        setGeo(g => ({
          ...g,
          loading: false,
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
