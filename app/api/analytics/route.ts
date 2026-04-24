import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

const VALID_EVENT_TYPES = new Set([
  "view", "click", "call", "whatsapp", "direction", "save", "offer_view",
  "app_open", "locality_view", "shop_view", "search", "share",
]);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { shop_id, offer_id, event_type, meta, visitor_id } = body as {
    shop_id?:    string;
    offer_id?:   string;
    event_type?: string;
    meta?:       Record<string, unknown>;
    visitor_id?: string;
  };

  if (!event_type || !VALID_EVENT_TYPES.has(event_type)) {
    return NextResponse.json({ error: "Valid event_type required" }, { status: 400 });
  }

  // Resolve auth user from Bearer token (best-effort — analytics are anonymous-ok)
  let userId: string | null = null;
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  const adminDb = createAdminClient();
  if (token) {
    const { data } = await adminDb.auth.getUser(token);
    userId = data.user?.id ?? null;
  }

  // Fire-and-forget — analytics must never block the user action
  adminDb
    .from("analytics_events")
    .insert({
      user_id:    userId,
      visitor_id: visitor_id ?? null,
      shop_id:    shop_id   ?? null,
      offer_id:   offer_id  ?? null,
      event_type,
      meta:       meta ?? {},
    })
    .then(({ error }) => {
      if (error) console.error("[analytics] insert failed:", error.message);
    });

  if (event_type === "view" && shop_id) {
    adminDb
      .rpc("increment_view_count", { p_shop_id: shop_id })
      .then(({ error }) => {
        if (error) console.error("[analytics] increment_view_count failed:", error.message);
      });
  }

  return NextResponse.json({ ok: true });
}
