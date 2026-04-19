// app/api/shops/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const lat           = Number(searchParams.get("lat"));
    const lng           = Number(searchParams.get("lng"));
    const radius        = Number(searchParams.get("radius")   ?? 10000);
    const limit         = Math.min(Number(searchParams.get("limit")  ?? 200), 500);
    const offset        = Math.max(Number(searchParams.get("offset") ?? 0),   0);
    const categoryId = searchParams.get("category_id") ?? null;  // optional server-side category filter

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: "Invalid lat/lng" },
        { status: 400 }
      );
    }

    // Bounding box pre-filter: avoids full-table scan
    // 1° lat ≈ 111,000 m; 1° lng ≈ 111,000 * cos(lat) m
    const latDelta = radius / 111_000;
    const lngDelta = radius / (111_000 * Math.cos((lat * Math.PI) / 180));

    const supabase = createAdminClient();

    let query = supabase
      .from("shops")
      .select(`
        id, name, slug, description, phone, whatsapp, address,
        lat, lng, logo_url, is_active, is_featured, is_boosted,
        manual_priority, avg_rating, review_count, view_count,
        open_time, close_time, open_days, vendor_id,
        locality_id, category_id,
        category:categories(id,name,slug,icon,color),
        locality:localities(id,name,slug,lat,lng),
        offers(id,title,tier,is_active,ends_at,discount_type,discount_value,coupon_code)
      `, { count: "exact" })
      .eq("is_active", true)
      .eq("is_approved", true)
      .gte("lat", lat - latDelta)
      .lte("lat", lat + latDelta)
      .gte("lng", lng - lngDelta)
      .lte("lng", lng + lngDelta);

    // Optional server-side category filter
    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const shopsWithDistance = (data ?? []).map((shop: any) => {
      const dLat = (shop.lat - lat) * (Math.PI / 180);
      const dLng = (shop.lng - lng) * (Math.PI / 180);

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat * (Math.PI / 180)) *
          Math.cos(shop.lat * (Math.PI / 180)) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = 6371000 * c;

      const topOffer =
        Array.isArray(shop.offers) && shop.offers.length > 0
          ? shop.offers.find((o: any) => o.is_active) ?? shop.offers[0]
          : null;

      return {
        ...shop,
        distance_m: distance,
        top_offer: topOffer,
      };
    });

    const finalShops = shopsWithDistance
      .filter((shop: any) => shop.distance_m <= radius)
      .sort((a: any, b: any) => {
        // Boosted shops get a virtual 50 km head start; each manual_priority point = 5 km
        const aBoost = (a.is_boosted ? 50_000 : 0) + (a.manual_priority ?? 0) * 5_000;
        const bBoost = (b.is_boosted ? 50_000 : 0) + (b.manual_priority ?? 0) * 5_000;
        const aEff = a.distance_m - aBoost;
        const bEff = b.distance_m - bBoost;
        if (aEff !== bEff) return aEff - bEff;
        return (b.top_offer?.tier ?? 5) - (a.top_offer?.tier ?? 5);
      });

    return NextResponse.json(
      { shops: finalShops, total: count ?? finalShops.length, hasMore: offset + limit < (count ?? 0) },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=90" } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
