import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shopId   = searchParams.get("shop_id");
  const featured = searchParams.get("featured") === "true";
  const supabase = createClient();

  let query = supabase
    .from("offers")
    .select("*, shop:shops(id, name, slug, logo_url, locality:localities(name), category:categories(icon,color))")
    .eq("is_active", true);

  if (shopId)   query = query.eq("shop_id", shopId);
  if (featured) query = query.eq("is_featured", true);

  // Only current/future offers
  query = query.or("ends_at.is.null,ends_at.gt.now()");
  query = query.order("tier", { ascending: true }).order("created_at", { ascending: false }).limit(60);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ offers: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { data, error } = await supabase.from("offers").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ offer: data }, { status: 201 });
}
