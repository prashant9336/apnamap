import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const citySlug = searchParams.get("city") || "prayagraj";
  const supabase = createClient();

  const { data, error } = await supabase
    .from("localities")
    .select("*, city:cities(id, name, slug)")
    .eq("cities.slug", citySlug)
    .order("priority");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ localities: data ?? [] });
}
