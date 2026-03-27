import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shopId = searchParams.get("shop_id");
  if (!shopId) return NextResponse.json({ error: "shop_id required" }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("*, profile:profiles(name, avatar_url)")
    .eq("shop_id", shopId)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reviews: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login required to review" }, { status: 401 });

  const { shop_id, rating, comment } = await req.json();
  if (!shop_id || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "shop_id and rating (1-5) required" }, { status: 400 });
  }

  const { data, error } = await supabase.from("reviews").upsert({
    user_id: user.id, shop_id, rating, comment: comment ?? null,
  }, { onConflict: "user_id,shop_id" }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ review: data }, { status: 201 });
}
