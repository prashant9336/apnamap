"use client";

import { useState, useCallback } from "react";
import type { GeoState } from "@/types";

const DEFAULT: GeoState = {
  lat: 25.4420,
  lng: 81.8517,
  accuracy: null,
  loading: false,
  error: null,
  locality: "Katra, Prayagraj",
};

export function useGeo() {
  const [geo, setGeo] = useState<GeoState>(DEFAULT);

  const detect = useCallback(async () => {
    setGeo({
      lat: 25.4420,
      lng: 81.8517,
      accuracy: null,
      loading: false,
      error: null,
      locality: "Katra, Prayagraj",
    });
  }, []);

  return { geo, detect };
}