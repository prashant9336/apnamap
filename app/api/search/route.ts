import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ shops: [], offers: [] });

  const supabase = createClient();
  const p = `%${q}%`;   // ilike pattern

  const [shops, offers] = await Promise.all([
    // Search name, description, address, and tags
    supabase.from("shops")
      .select("id, name, slug, logo_url, description, address, category:categories(name,icon), locality:localities(name)")
      .eq("is_approved", true)
      .eq("is_active", true)
      .or(`name.ilike.${p},description.ilike.${p},address.ilike.${p}`)
      .limit(10),

    // Search offer title and description
    supabase.from("offers")
      .select("id, title, description, shop:shops!inner(id, name, slug, is_approved, is_active)")
      .eq("is_active", true)
      .eq("shops.is_approved", true)
      .eq("shops.is_active", true)
      .or(`title.ilike.${p},description.ilike.${p}`)
      .limit(8),
  ]);

  return NextResponse.json({
    shops:  shops.data  ?? [],
    offers: offers.data ?? [],
  });
}
