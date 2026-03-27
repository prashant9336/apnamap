import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("favorites")
    .select(`
      id, created_at,
      shop:shops(id, name, slug, logo_url, avg_rating,
        category:categories(name, icon),
        locality:localities(name)
      ),
      offer:offers(id, title, shop:shops(name, slug))
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ favorites: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { shop_id, offer_id } = await req.json();

  // Toggle: remove if exists, add if not
  const existing = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq(shop_id ? "shop_id" : "offer_id", shop_id ?? offer_id)
    .maybeSingle();

  if (existing.data) {
    await supabase.from("favorites").delete().eq("id", existing.data.id);
    return NextResponse.json({ saved: false });
  }

  await supabase.from("favorites").insert({ user_id: user.id, shop_id, offer_id });
  return NextResponse.json({ saved: true }, { status: 201 });
}
