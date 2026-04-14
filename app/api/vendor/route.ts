import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireUser(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const user = await requireUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: shops, error: shopErr } = await supabase
    .from("shops")
    .select(`
      *,
      offers(*),
      category:categories(name,slug,icon,color),
      locality:localities(name,slug)
    `)
    .eq("vendor_id", user.id)
    .order("created_at", { ascending: false });

  if (shopErr) {
    return NextResponse.json({ error: shopErr.message }, { status: 500 });
  }

  const shopIds = (shops ?? []).map((s: any) => s.id);
  let analytics: any[] = [];

  if (shopIds.length > 0) {
    // Limit to last 30 days to keep this query fast as analytics_events grows.
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { data } = await supabase
      .from("analytics_events")
      .select("event_type, shop_id")
      .in("shop_id", shopIds)
      .gte("created_at", since);

    analytics = data ?? [];
  }

  const stats = {
    total_views: analytics.filter((e) => e.event_type === "view").length,
    total_calls: analytics.filter((e) => e.event_type === "call").length,
    total_whatsapp: analytics.filter((e) => e.event_type === "whatsapp").length,
    total_saves: analytics.filter((e) => e.event_type === "save").length,
  };

  return NextResponse.json({
    shops: shops ?? [],
    stats,
    user_id: user.id,
  });
}

// Strict allowlist of fields a vendor may edit on their own shop.
// Admin-only fields (is_approved, is_active, is_featured, is_boosted,
// is_recommended, vendor_id, manual_priority, etc.) are intentionally
// absent — a vendor must never be able to approve or promote their own listing.
const VENDOR_EDITABLE_SHOP_FIELDS = [
  "name", "description", "phone", "whatsapp", "address",
  "lat", "lng", "logo_url", "cover_url",
  "open_time", "close_time", "open_days",
] as const;

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const user = await requireUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as Record<string, unknown>;
  const { shop_id } = body;

  if (!shop_id || typeof shop_id !== "string") {
    return NextResponse.json({ error: "shop_id required" }, { status: 400 });
  }

  // Build update payload from allowlist only — any field not in the set is silently ignored.
  const updates: Record<string, unknown> = {};
  for (const field of VENDOR_EDITABLE_SHOP_FIELDS) {
    if (field in body) updates[field] = body[field];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  }

  const { data: shop } = await supabase
    .from("shops")
    .select("vendor_id")
    .eq("id", shop_id)
    .single();

  if (!shop || shop.vendor_id !== user.id) {
    return NextResponse.json({ error: "Not your shop" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("shops")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", shop_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ shop: data });
}