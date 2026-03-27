"use client";

import { useState, useEffect, useCallback } from "react";
import type { GeoLocation } from "@/lib/types";

interface UseLocationReturn {
  location: GeoLocation | null;
  error: string | null;
  loading: boolean;
  permissionDenied: boolean;
  requestLocation: () => void;
}

export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLoading(false);
        setPermissionDenied(false);
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionDenied(true);
          setError("Location access denied. Using default city location.");
          // Fallback to Prayagraj center
          setLocation({
            lat: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT || "25.4358"),
            lng: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LNG || "81.8463"),
          });
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError("Location unavailable. Using default city.");
          setLocation({
            lat: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT || "25.4358"),
            lng: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LNG || "81.8463"),
          });
        } else {
          setError("Could not get location. Please try again.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // Cache for 1 minute
      }
    );
  }, []);

  // Auto-request on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return { location, error, loading, permissionDenied, requestLocation };
}
