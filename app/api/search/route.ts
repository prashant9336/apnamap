import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const supabase = createClient();
  const pattern  = `%${q}%`;

  const [shops, offers] = await Promise.all([
    supabase.from("shops")
      .select("id, name, slug, logo_url, category:categories(name,icon), locality:localities(name)")
      .eq("is_approved", true).eq("is_active", true)
      .ilike("name", pattern).limit(8),
    supabase.from("offers")
      .select("id, title, shop:shops(id, name, slug)")
      .eq("is_active", true)
      .ilike("title", pattern).limit(6),
  ]);

  return NextResponse.json({
    shops:  shops.data  ?? [],
    offers: offers.data ?? [],
  });
}
