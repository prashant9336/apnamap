"use client";

import { useState, useCallback, useEffect } from "react";
import { reverseGeocode } from "@/lib/geo/distance";
import type { GeoState } from "@/types";

const CACHE_KEY = "apnamap_geo";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

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

const DEFAULT: GeoState = {
  lat: DEFAULT_LAT,
  lng: DEFAULT_LNG,
  accuracy: null,
  loading: false,
  error: null,
  locality: "Prayagraj",
};

export function useGeo() {
  const [geo, setGeo] = useState<GeoState>(DEFAULT);

  // On mount: restore cache or auto-detect
  useEffect(() => {
    const cached = loadCache();
    if (cached) {
      setGeo({
        lat: cached.lat,
        lng: cached.lng,
        accuracy: null,
        loading: false,
        error: null,
        locality: cached.locality,
      });
      return;
    }
    // No cache — auto-request GPS silently
    if (navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng, accuracy } = pos.coords;
          const locality = await reverseGeocode(lat, lng);
          saveCache(lat, lng, locality);
          setGeo({ lat, lng, accuracy, loading: false, error: null, locality });
        },
        () => {
          // Denied or unavailable — keep default, no error shown on silent attempt
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    }
  }, []);

  const detect = useCallback(async () => {
    if (!navigator.geolocation) {
      setGeo((g) => ({ ...g, error: "GPS not available on this device" }));
      return;
    }

    setGeo((g) => ({ ...g, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        const locality = await reverseGeocode(lat, lng);
        saveCache(lat, lng, locality);
        setGeo({ lat, lng, accuracy, loading: false, error: null, locality });
      },
      (err) => {
        setGeo((g) => ({
          ...g,
          loading: false,
          error:
            err.code === 1
              ? "Location access denied. Showing default city."
              : "Could not get location. Showing default city.",
        }));
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  return { geo, detect };
}
