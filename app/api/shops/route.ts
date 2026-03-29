import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    const radius = Number(searchParams.get("radius") ?? 10000);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radius)) {
      return NextResponse.json(
        { error: "Invalid lat/lng/radius" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Missing Supabase env vars" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("shops")
      .select(`
        *,
        category:categories(id,name,slug,icon,color),
        locality:localities(id,name,slug),
        offers(*)
      `)
      .eq("is_active", true)
      .eq("is_approved", true)
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const shops = (data ?? [])
      .map((shop: any) => {
        const distance_m =
          typeof shop.lat === "number" && typeof shop.lng === "number"
            ? haversineMeters(lat, lng, shop.lat, shop.lng)
            : Number.MAX_SAFE_INTEGER;

        const offers = (shop.offers || []).filter((o: any) => o.is_active);

const top_offer =
  offers.find((o: any) => o.tier === 1) ||
  offers.find((o: any) => o.tier === 2) ||
  offers.find((o: any) => o.tier === 3) ||
  null;

return {
  ...shop,
  distance_m,
  offers,
  top_offer,
};
      })
      .filter((shop: any) => shop.distance_m <= radius)
      .sort((a: any, b: any) => a.distance_m - b.distance_m);

    return NextResponse.json({ shops });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unknown server error" },
      { status: 500 }
    );
  }
}