"use client";

import { useState, useCallback } from "react";
import { reverseGeocode } from "@/lib/geo/distance";
import type { GeoState } from "@/types";

const DEFAULT: GeoState = {
  lat: 25.4358,  // Prayagraj centre
  lng: 81.8463,
  accuracy: null,
  loading: false,
  error: null,
  locality: "Prayagraj",
};

export function useGeo() {
  const [geo, setGeo] = useState<GeoState>(DEFAULT);

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
