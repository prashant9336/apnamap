import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { shop_id, offer_id, event_type, meta } = body;
  if (!event_type) return NextResponse.json({ error: "event_type required" }, { status: 400 });

  // Resolve user from Bearer token or cookie (best-effort — analytics are anonymous-ok)
  let userId: string | null = null;
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  const adminDb = createAdminClient();
  if (token) {
    const { data } = await adminDb.auth.getUser(token);
    userId = data.user?.id ?? null;
  }

  // Fire and forget — use adminDb so RLS never blocks event writes
  adminDb.from("analytics_events").insert({
    user_id:    userId,
    shop_id:    shop_id  ?? null,
    offer_id:   offer_id ?? null,
    event_type,
    meta:       meta ?? {},
  }).then(() => {});

  if (event_type === "view" && shop_id) {
    adminDb.rpc("increment_view_count", { p_shop_id: shop_id }).then(() => {});
  }

  return NextResponse.json({ ok: true });
}
