import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const body = await req.json();

  const { shop_id, offer_id, event_type, meta } = body;
  if (!event_type) return NextResponse.json({ error: "event_type required" }, { status: 400 });

  // Fire and forget — don't await
  supabase.from("analytics_events").insert({
    user_id: user?.id ?? null,
    shop_id: shop_id ?? null,
    offer_id: offer_id ?? null,
    event_type,
    meta: meta ?? {},
  }).then(() => {});

  // Increment view_count on shop via SQL function (avoids read-modify-write race)
  if (event_type === "view" && shop_id) {
    supabase.rpc("increment_view_count", { p_shop_id: shop_id }).then(() => {});
  }

  return NextResponse.json({ ok: true });
}
