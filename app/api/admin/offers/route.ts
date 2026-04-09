// app/api/admin/offers/route.ts
// Admin-only offer management: GET, POST, PATCH, DELETE
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return (profile?.role ?? user.user_metadata?.role) === "admin" ? user : null;
}

// GET /api/admin/offers?shop_id=X — all offers for a shop (including inactive/expired)
export async function GET(req: NextRequest) {
  const caller = await requireAdmin();
  if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const shopId = searchParams.get("shop_id");
  if (!shopId) return NextResponse.json({ error: "shop_id required" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("offers")
    .select("*")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ offers: data ?? [] });
}

// POST /api/admin/offers — create offer for any shop
export async function POST(req: NextRequest) {
  const caller = await requireAdmin();
  if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    shop_id:       string;
    title:         string;
    description?:  string;
    discount_type: string;
    discount_value?: number;
    tier?:         1 | 2 | 3;
    ends_at?:      string | null;
    coupon_code?:  string;
    is_featured?:  boolean;
    source_type?:  string;
  };

  if (!body.shop_id) return NextResponse.json({ error: "shop_id required" }, { status: 400 });
  if (!body.title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("offers").insert({
    shop_id:          body.shop_id,
    title:            body.title.trim(),
    description:      body.description?.trim() || null,
    discount_type:    body.discount_type || "other",
    discount_value:   body.discount_value ?? null,
    tier:             body.tier ?? 2,
    ends_at:          body.ends_at ?? null,
    coupon_code:      body.coupon_code?.trim() || null,
    is_active:        true,
    is_featured:      body.is_featured ?? false,
    source_type:      body.source_type ?? "admin_manual",
    created_by_admin: caller.id,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ offer: data }, { status: 201 });
}

// PATCH /api/admin/offers — edit or expire an offer
export async function PATCH(req: NextRequest) {
  const caller = await requireAdmin();
  if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    offer_id: string;
    action?:  "expire" | "activate" | "deactivate" | "edit";
    fields?:  Record<string, unknown>;
  };

  if (!body.offer_id) return NextResponse.json({ error: "offer_id required" }, { status: 400 });

  const admin = createAdminClient();
  let updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.action === "expire") {
    updates = { ...updates, ends_at: new Date().toISOString(), is_active: false };
  } else if (body.action === "activate") {
    updates = { ...updates, is_active: true };
  } else if (body.action === "deactivate") {
    updates = { ...updates, is_active: false };
  } else if (body.action === "edit" && body.fields) {
    const { title, description, discount_type, discount_value, tier, ends_at, coupon_code, is_featured, is_active } = body.fields as any;
    if (title !== undefined)          updates.title          = String(title).trim();
    if (description !== undefined)    updates.description    = description ? String(description).trim() : null;
    if (discount_type !== undefined)  updates.discount_type  = discount_type;
    if (discount_value !== undefined) updates.discount_value = discount_value;
    if (tier !== undefined)           updates.tier           = tier;
    if (ends_at !== undefined)        updates.ends_at        = ends_at;
    if (coupon_code !== undefined)    updates.coupon_code    = coupon_code ? String(coupon_code).trim() : null;
    if (is_featured !== undefined)    updates.is_featured    = is_featured;
    if (is_active !== undefined)      updates.is_active      = is_active;
  } else {
    return NextResponse.json({ error: "Invalid action or missing fields" }, { status: 400 });
  }

  const { data, error } = await admin.from("offers").update(updates).eq("id", body.offer_id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ offer: data });
}

// DELETE /api/admin/offers?offer_id=X
export async function DELETE(req: NextRequest) {
  const caller = await requireAdmin();
  if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const offerId = searchParams.get("offer_id");
  if (!offerId) return NextResponse.json({ error: "offer_id required" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("offers").delete().eq("id", offerId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
