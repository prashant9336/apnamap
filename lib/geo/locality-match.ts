/**
 * lib/geo/locality-match.ts
 *
 * Confidence-based locality matching engine.
 *
 * Single center-point nearest-neighbour matching fails at locality boundaries
 * because two localities may have nearly equal distance from the user, and any
 * GPS jitter flips the result. This module adds:
 *
 *   1. radius_m — each locality has a declared radius. Being within radius = "inside"
 *   2. separation ratio — if nearest / second_nearest < 0.6, result is ambiguous
 *   3. absolute-distance gate — if nearest > 5 km, we have no reliable match
 *   4. displayName — "Civil Lines" (high) vs "Near Civil Lines" (medium) vs "Nearby area" (low)
 *
 * Confidence levels:
 *   high   — user is inside locality radius AND clearly closer than second candidate
 *   medium — nearest candidate wins but boundary is ambiguous or user is outside radius
 *   low    — user is far from all known localities (unmapped area)
 */

import { getDistanceMetres } from "./distance";

export type MatchConfidence = "high" | "medium" | "low";

export interface LocalityCandidate {
  id:        string;
  name:      string;
  slug:      string;
  lat:       number;
  lng:       number;
  distanceM: number;
  radius_m:  number;
}

export interface LocalityMatch {
  locality:    LocalityCandidate;
  confidence:  MatchConfidence;
  /** Ready-to-display string. "Civil Lines", "Near Civil Lines", or "Nearby area" */
  displayName: string;
  /** Top 5 nearest candidates — used by debug panel */
  candidates:  LocalityCandidate[];
}

type LocalityInput = {
  id:       string;
  name:     string;
  slug:     string;
  lat:      number | string;
  lng:      number | string;
  radius_m?: number | null;
};

const DEFAULT_RADIUS_M = 1500;

// If nearest locality is beyond this, we have no confident match
const MAX_MATCH_DISTANCE_M = 5000;

// If nearest / second < this ratio, the boundary is ambiguous.
// 0.65: nearest must be ≥35% closer than second to claim "inside" with confidence.
// Tighter than naive nearest-neighbour — avoids overconfident labels at boundaries.
const SEPARATION_RATIO = 0.65;

export function matchLocality(
  userLat: number,
  userLng: number,
  localities: LocalityInput[]
): LocalityMatch | null {
  if (!localities.length) return null;

  const candidates: LocalityCandidate[] = localities
    .map(loc => {
      const lat = parseFloat(String(loc.lat));
      const lng = parseFloat(String(loc.lng));
      return {
        id:        loc.id,
        name:      loc.name,
        slug:      loc.slug,
        lat,
        lng,
        radius_m:  loc.radius_m ?? DEFAULT_RADIUS_M,
        distanceM: getDistanceMetres(userLat, userLng, lat, lng),
      };
    })
    .sort((a, b) => a.distanceM - b.distanceM);

  const top3    = candidates.slice(0, 5);   // expose top-5 for debug panel
  const nearest = top3[0];
  const second  = top3[1];

  let confidence: MatchConfidence;

  if (nearest.distanceM > MAX_MATCH_DISTANCE_M) {
    // User is far from everything — unmapped area or bad GPS
    confidence = "low";
  } else {
    const withinRadius   = nearest.distanceM < nearest.radius_m;
    const clearlyNearest = !second || (nearest.distanceM / second.distanceM) < SEPARATION_RATIO;
    confidence = (withinRadius && clearlyNearest) ? "high" : "medium";
  }

  const displayName =
    confidence === "high"   ? nearest.name :
    confidence === "medium" ? `Nearby ${nearest.name}` :
                              "Nearby area";

  return { locality: nearest, confidence, displayName, candidates: top3 };
}
