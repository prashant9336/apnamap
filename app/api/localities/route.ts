import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const latParam   = searchParams.get("lat");
  const lngParam   = searchParams.get("lng");
  const limitParam = searchParams.get("limit");
  const citySlug   = searchParams.get("city") || "prayagraj";
  const supabase   = createClient();

  // ── GPS mode: return all localities sorted by distance ───────────────────
  if (latParam && lngParam) {
    const userLat = parseFloat(latParam);
    const userLng = parseFloat(lngParam);
    const limit   = Math.min(parseInt(limitParam ?? "40", 10), 80);

    if (!isNaN(userLat) && !isNaN(userLng)) {
      const { data, error } = await supabase.rpc("nearby_localities", {
        user_lat: userLat,
        user_lng: userLng,
        limit_n:  limit,
      });

      if (!error) {
        return NextResponse.json({ localities: data ?? [], gps_sorted: true });
      }
      // RPC not yet available — fall through to city mode
    }
  }

  // ── City mode: return localities for a given city slug ───────────────────
  const { data: city, error: cityErr } = await supabase
    .from("cities")
    .select("id")
    .eq("slug", citySlug)
    .single();

  if (cityErr || !city) {
    const { data: all } = await supabase
      .from("localities")
      .select("id, name, slug, lat, lng, type, zone, priority")
      .order("priority");
    return NextResponse.json({ localities: all ?? [] });
  }

  const { data, error } = await supabase
    .from("localities")
    .select("id, name, slug, lat, lng, type, zone, priority, city:cities(id, name, slug)")
    .eq("city_id", city.id)
    .order("priority");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ localities: data ?? [] });
}
