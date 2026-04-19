"use client";
import { useState, useEffect } from "react";

const KEY = "apnamap_loc_override_v1";

export interface LocalityOverride {
  id:   string;
  name: string;
  slug: string;
  lat:  number;
  lng:  number;
}

export function useLocalityOverride() {
  const [override, setOverrideState] = useState<LocalityOverride | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setOverrideState(JSON.parse(raw));
    } catch {}
  }, []);

  function setOverride(loc: LocalityOverride) {
    try { localStorage.setItem(KEY, JSON.stringify(loc)); } catch {}
    setOverrideState(loc);
  }

  function clearOverride() {
    try { localStorage.removeItem(KEY); } catch {}
    setOverrideState(null);
  }

  return { override, setOverride, clearOverride };
}
