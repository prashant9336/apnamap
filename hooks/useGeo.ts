"use client";

import { useState, useCallback, useEffect } from "react";
import { reverseGeocode } from "@/lib/geo/distance";
import type { GeoState } from "@/types";

const CACHE_KEY    = "apnamap_geo";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min — optimistic seed while fresh GPS loads

// Accuracy threshold: positions worse than this are considered unreliable
// (network/IP location typically returns 500–2000 m)
const MAX_ACCURACY_M = 500;

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

function clearCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
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
  gpsConfirmed: false,  // GPS has not yet given a fix
  error:        null,
  locality:     DEFAULT_LOCALITY,
};

export function useGeo() {
  const [geo, setGeo] = useState<GeoState>(DEFAULT);

  useEffect(() => {
    // Step 1: seed with cache immediately (fast, optimistic)
    // gpsConfirmed stays false — cache is not a GPS fix
    const cached = loadCache();
    if (cached) {
      setGeo(g => ({
        ...g,
        lat:          cached.lat,
        lng:          cached.lng,
        accuracy:     null,
        loading:      false,      // content can show, but GPS is still pending
        gpsConfirmed: false,      // explicitly not confirmed yet
        error:        null,
        locality:     cached.locality,
      }));
    }

    // Step 2: always request fresh GPS, even if cache was available
    if (!navigator?.geolocation) {
      setGeo(g => ({
        ...g,
        loading:      false,
        gpsConfirmed: true,   // no GPS available — consider it resolved (won't improve)
        error:        "GPS not available on this device.",
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;

        // If accuracy is worse than threshold, keep coords but flag it
        const poorAccuracy = accuracy > MAX_ACCURACY_M;

        const locality = await reverseGeocode(lat, lng);

        // Only cache high-accuracy fixes — don't persist network-location guesses
        if (!poorAccuracy) {
          saveCache(lat, lng, locality);
        }

        setGeo({
          lat,
          lng,
          accuracy,
          loading:      false,
          gpsConfirmed: true,
          error:        poorAccuracy
            ? `Low GPS accuracy (±${Math.round(accuracy)}m). Location may be approximate.`
            : null,
          locality,
        });
      },
      (err) => {
        // GPS denied or failed — keep cached/default coords, mark GPS as resolved
        const errMsg =
          err.code === 1
            ? "Location access denied. Showing nearest area."
            : "Could not get location. Showing nearest area.";
        setGeo(g => ({
          ...g,
          loading:      false,
          gpsConfirmed: true,
          error:        g.lat === DEFAULT_LAT ? errMsg : null,
        }));
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );

    // Step 3: re-request GPS when tab becomes visible again (fixes bfcache / idle tab restore)
    // Use maximumAge: 0 — never accept a stale position when coming back to the tab
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      // Mark GPS as unconfirmed again while we re-acquire
      setGeo(g => ({ ...g, gpsConfirmed: false }));
      navigator.geolocation?.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng, accuracy } = pos.coords;
          const poorAccuracy = accuracy > MAX_ACCURACY_M;
          const locality = await reverseGeocode(lat, lng);
          if (!poorAccuracy) saveCache(lat, lng, locality);
          setGeo({
            lat,
            lng,
            accuracy,
            loading:      false,
            gpsConfirmed: true,
            error:        poorAccuracy
              ? `Low GPS accuracy (±${Math.round(accuracy)}m).`
              : null,
            locality,
          });
        },
        () => {
          setGeo(g => ({ ...g, loading: false, gpsConfirmed: true }));
        },
        // maximumAge: 0 — always get a fresh reading when returning to the tab
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
      );
    }

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []); // runs once on mount

  /** Manual re-detect — clears cache to force a completely fresh fix */
  const detect = useCallback(async () => {
    if (!navigator.geolocation) {
      setGeo(g => ({ ...g, error: "GPS not available on this device.", gpsConfirmed: true }));
      return;
    }

    // Clear cache so stale coords can't bleed back in
    clearCache();
    setGeo(g => ({ ...g, loading: true, error: null, gpsConfirmed: false }));

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        const poorAccuracy = accuracy > MAX_ACCURACY_M;
        const locality = await reverseGeocode(lat, lng);
        if (!poorAccuracy) saveCache(lat, lng, locality);
        setGeo({
          lat,
          lng,
          accuracy,
          loading:      false,
          gpsConfirmed: true,
          error:        poorAccuracy
            ? `Low GPS accuracy (±${Math.round(accuracy)}m). Location may be approximate.`
            : null,
          locality,
        });
      },
      (err) => {
        setGeo(g => ({
          ...g,
          loading:      false,
          gpsConfirmed: true,
          error:
            err.code === 1
              ? "Location access denied. Enable GPS in browser settings."
              : "Could not get location. Check GPS signal.",
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, []);

  return { geo, detect };
}
