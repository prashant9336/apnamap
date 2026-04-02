import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const citySlug = searchParams.get("city") || "prayagraj";
  const supabase = createClient();

  // Look up city by slug first, then filter localities by city_id
  const { data: city, error: cityErr } = await supabase
    .from("cities")
    .select("id")
    .eq("slug", citySlug)
    .single();

  if (cityErr || !city) {
    return NextResponse.json({ localities: [] });
  }

  const { data, error } = await supabase
    .from("localities")
    .select("*, city:cities(id, name, slug)")
    .eq("city_id", city.id)
    .order("priority");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ localities: data ?? [] });
}
