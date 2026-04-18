import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/locality/resolve?lat=25.39&lng=81.87
 *
 * Server-side locality resolver — the canonical source of truth for
 * "which locality is this GPS coordinate in?"
 *
 * Phase 1: center-point + radius + separation ratio (mirrors client logic but
 *          runs on Supabase data, not a stale JS bundle).
 * Phase 3: will call ST_Within against locality polygon boundaries.
 *
 * Returns:
 *   { locality: { id, name, slug, confidence, distance_m, neighbors[] } | null }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Invalid lat/lng" }, { status: 400 });
  }

  const sb = createAdminClient();

  // Call the server-side resolver RPC (defined in migration 025)
  const { data, error } = await sb.rpc("resolve_locality", {
    user_lat: lat,
    user_lng:  lng,
  });

  if (error) {
    // RPC might not exist yet (migration 025 not run) — fall back gracefully
    console.error("[resolve_locality] RPC error:", error.message);
    return NextResponse.json({ locality: null, fallback: true });
  }

  const result = Array.isArray(data) ? data[0] : null;
  if (!result) return NextResponse.json({ locality: null });

  return NextResponse.json({
    locality: {
      id:         result.id,
      name:       result.name,
      slug:       result.slug,
      lat:        result.lat,
      lng:        result.lng,
      radius_m:   result.radius_m,
      neighbors:  result.neighbors ?? [],
      distance_m: Math.round(result.distance_m),
      confidence: result.confidence,    // 'high' | 'medium' | 'low'
      displayName:
        result.confidence === "high"   ? result.name :
        result.confidence === "medium" ? `Near ${result.name}` :
                                         "",
    },
  });
}
