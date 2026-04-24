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
      .select("id, name, slug, logo_url, description, address, category:categories(name,icon), subcategory:subcategories(icon), locality:localities(name)")
      .eq("approval_status", "approved")
      .eq("is_active", true)
      .is("deleted_at", null)
      .or(`name.ilike.${p},description.ilike.${p},address.ilike.${p}`)
      .limit(10),

    // Search offer title and description — RLS enforces shop state; filters here for clarity
    supabase.from("offers")
      .select("id, title, description, shop:shops!inner(id, name, slug, approval_status, is_active, deleted_at)")
      .eq("is_active", true)
      .eq("shops.approval_status", "approved")
      .eq("shops.is_active", true)
      .or(`title.ilike.${p},description.ilike.${p}`)
      .limit(8),
  ]);

  return NextResponse.json({
    shops:  shops.data  ?? [],
    offers: offers.data ?? [],
  });
}
