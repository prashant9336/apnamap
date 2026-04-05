// app/api/shops/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* ── Haversine distance in metres ─────────────────────────────────── */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // ── Bounding-box mode (map viewport) ────────────────────────
    // ?minLat=&maxLat=&minLng=&maxLng=
    const minLat = Number(searchParams.get("minLat"));
    const maxLat = Number(searchParams.get("maxLat"));
    const minLng = Number(searchParams.get("minLng"));
    const maxLng = Number(searchParams.get("maxLng"));
    const bboxMode =
      Number.isFinite(minLat) && Number.isFinite(maxLat) &&
      Number.isFinite(minLng) && Number.isFinite(maxLng) &&
      searchParams.has("minLat");   // explicit check: 0 is a valid coord

    // ── Radius mode (walk view / search) ────────────────────────
    // ?lat=&lng=&radius= (backwards-compatible)
    const lat    = Number(searchParams.get("lat"));
    const lng    = Number(searchParams.get("lng"));
    const radius = Number(searchParams.get("radius") ?? 10_000);

    if (!bboxMode && (!Number.isFinite(lat) || !Number.isFinite(lng))) {
      return NextResponse.json({ error: "Invalid lat/lng" }, { status: 400 });
    }

    const supabase = createClient();

    /* Base query — shared between both modes */
    let query = supabase
      .from("shops")
      .select(`
        id, name, slug, lat, lng, is_open, is_active, is_approved,
        avg_rating, review_count, view_count, phone, whatsapp,
        category:categories(id, name, slug, icon, color),
        locality:localities(id, name, slug),
        offers(id, title, discount_type, discount_value, tier, is_active, ends_at, is_mystery)
      `)
      .eq("is_active", true)
      .eq("is_approved", true);

    /* Push the bounding-box filter to Postgres when in bbox mode —
       avoids loading the entire table into JS memory            */
    if (bboxMode) {
      query = query
        .gte("lat", minLat).lte("lat", maxLat)
        .gte("lng", minLng).lte("lng", maxLng);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    /* Attach top_offer + distance to each shop row */
    const refLat = bboxMode ? (minLat + maxLat) / 2 : lat;
    const refLng = bboxMode ? (minLng + maxLng) / 2 : lng;

    const enriched = (data ?? []).map((shop: any) => {
      const distance_m =
        shop.lat != null && shop.lng != null
          ? haversine(refLat, refLng, shop.lat, shop.lng)
          : null;

      const top_offer =
        Array.isArray(shop.offers) && shop.offers.length > 0
          ? (shop.offers.find((o: any) => o.is_active) ?? shop.offers[0])
          : null;

      return { ...shop, distance_m, top_offer, offers: undefined };
    });

    /* In radius mode keep the old JS-side distance filter + sort */
    const shops = bboxMode
      ? enriched.sort((a: any, b: any) => (a.distance_m ?? 0) - (b.distance_m ?? 0))
      : enriched
          .filter((s: any) => s.distance_m != null && s.distance_m <= radius)
          .sort((a: any, b: any) => {
            if (a.distance_m !== b.distance_m) return a.distance_m - b.distance_m;
            return (b.top_offer?.tier ?? 5) - (a.top_offer?.tier ?? 5);
          });

    return NextResponse.json({ shops });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
