// app/api/shops/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    const radius = Number(searchParams.get("radius") ?? 10000);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: "Invalid lat/lng" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // ✅ Fetch shops with relations
    const { data, error } = await supabase
      .from("shops")
      .select(`
        *,
        category:categories(id,name,slug,icon,color),
        locality:localities(id,name,slug,lat,lng),
        offers(*)
      `)
      .eq("is_active", true)
      .eq("is_approved", true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ✅ Distance calculation
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

    // ✅ Filter + smart sort
    const finalShops = shopsWithDistance
      .filter((shop: any) => shop.distance_m <= radius)
      .sort((a: any, b: any) => {
        if (a.distance_m !== b.distance_m) {
          return a.distance_m - b.distance_m;
        }

        return (b.top_offer?.tier ?? 5) - (a.top_offer?.tier ?? 5);
      });

    return NextResponse.json({ shops: finalShops });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}