/**
 * lib/mapSync.ts
 *
 * Lightweight localStorage bridge between Walk UI (/explore) and Map (/map).
 *
 * Walk  → Map:  WalkView writes current locality on each scroll update.
 *               When user taps the Map button, MapPage reads it and flies there.
 *
 * Map   → Walk: MapPage writes the locality of the tapped/selected shop.
 *               On return to Walk, WalkView can pre-scroll to that locality.
 */

const KEY = "apnamap_map_sync";

export interface MapSyncPayload {
  locality: string;    // locality name (matches WalkLocality.name)
  lat:      number;
  lng:      number;
  source:   "walk" | "map";
  ts:       number;    // Date.now() — lets consumers ignore stale entries
}

export function writeSyncLocation(payload: Omit<MapSyncPayload, "ts">): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...payload, ts: Date.now() }));
  } catch { /* localStorage unavailable (SSR / private mode) */ }
}

/** Returns the stored payload if it's < 15 min old, otherwise null */
export function readSyncLocation(): MapSyncPayload | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as MapSyncPayload;
    if (Date.now() - p.ts > 15 * 60 * 1000) return null;   // stale
    return p;
  } catch {
    return null;
  }
}

export function clearSyncLocation(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
