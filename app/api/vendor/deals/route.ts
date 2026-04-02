import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* ── GET /api/vendor/deals?shop_id=xxx ─────────────────────────────
   Returns the vendor's deals (all tiers) for a shop, most recent first.
   Includes view/click counts for mini-analytics.               */
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shopId = new URL(req.url).searchParams.get("shop_id");
  if (!shopId) return NextResponse.json({ error: "shop_id required" }, { status: 400 });

  // Verify ownership before exposing analytics
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("id", shopId)
    .eq("vendor_id", user.id)
    .single();
  if (!shop) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("offers")
    .select(
      "id, title, description, discount_type, discount_value, tier, " +
      "is_active, is_mystery, starts_at, ends_at, " +
      "view_count, click_count, created_at"
    )
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deals: data ?? [] });
}

/* ── POST /api/vendor/deals ────────────────────────────────────────
   Creates an offer AND a matching quick_post in one call.
   The dual-write ensures the deal appears in:
     - Walk View (via offers table + top_offer query)
     - Offers tab  (same)
     - Near Me     (same)
     - Live feed   (via quick_posts)                            */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    shop_id: string;
    title: string;
    description?: string;
    deal_type?: "big_deal" | "flash_deal" | "new_deal";
    discount_type?: "percent" | "flat" | "bogo" | "free" | "other";
    discount_value?: number | null;
    expires_in_hours?: number | null;
  };

  const { shop_id, title, description, deal_type = "new_deal",
          discount_type = "other", discount_value = null, expires_in_hours = null } = body;

  if (!shop_id || !title?.trim()) {
    return NextResponse.json({ error: "shop_id and title required" }, { status: 400 });
  }

  // Verify ownership
  const { data: shop } = await supabase
    .from("shops")
    .select("id, name")
    .eq("id", shop_id)
    .eq("vendor_id", user.id)
    .single();
  if (!shop) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Map deal_type → tier
  const tier = deal_type === "big_deal" ? 1 : deal_type === "flash_deal" ? 2 : 3;

  // Compute ends_at
  let ends_at: string | null = null;
  if (expires_in_hours) {
    const d = new Date();
    d.setTime(d.getTime() + expires_in_hours * 3_600_000);
    ends_at = d.toISOString();
  }

  // Insert into offers
  const { data: offer, error: offerErr } = await supabase
    .from("offers")
    .insert({
      shop_id,
      title:          title.trim(),
      description:    description?.trim() ?? null,
      discount_type,
      discount_value: discount_value ?? null,
      tier,
      ends_at,
      is_active:   true,
      is_featured: deal_type === "big_deal",
    })
    .select()
    .single();

  if (offerErr || !offer) {
    return NextResponse.json(
      { error: offerErr?.message ?? "Failed to create deal" },
      { status: 500 }
    );
  }

  // Dual-write: quick_post for real-time Walk View feed (fire-and-forget)
  const qpType = deal_type === "flash_deal" ? "flash_deal" : "custom_note";
  const qpMsg =
    discount_type === "percent" && discount_value
      ? `${title.trim()} — ${discount_value}% off`
      : discount_type === "flat" && discount_value
      ? `${title.trim()} — ₹${discount_value} off`
      : title.trim();

  supabase.from("quick_posts").insert({
    shop_id,
    user_id:    user.id,
    post_type:  qpType,
    message:    qpMsg,
    is_active:  true,
    expires_at: ends_at ?? new Date(Date.now() + 24 * 3_600_000).toISOString(),
  }).then(() => {});

  return NextResponse.json({ deal: offer }, { status: 201 });
}

/* ── PATCH /api/vendor/deals ───────────────────────────────────────
   Edit title/description, or expire (is_active = false).      */
export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    id: string;
    title?: string;
    description?: string;
    is_active?: boolean;
  };
  const { id, title, description, is_active } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Verify ownership via shop join
  const { data: existing } = await supabase
    .from("offers")
    .select("id, shop:shops(vendor_id)")
    .eq("id", id)
    .single();

  const shopRow = existing?.shop as { vendor_id: string } | { vendor_id: string }[] | null;
  const ownerId = Array.isArray(shopRow) ? shopRow[0]?.vendor_id : shopRow?.vendor_id;
  if (!existing || ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (title       !== undefined) updates.title       = title.trim();
  if (description !== undefined) updates.description = description?.trim() ?? null;
  if (is_active   !== undefined) updates.is_active   = is_active;

  const { data, error } = await supabase
    .from("offers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deal: data });
}
