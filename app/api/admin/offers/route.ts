// app/api/admin/offers/route.ts
// Admin-only offer management: GET, POST, PATCH, DELETE
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

async function requireAdmin(req: NextRequest) {
  const adminSb = createAdminClient();

  // Prefer Bearer token (sent explicitly by client) over cookies
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();

  let user = null;
  if (token) {
    const { data } = await adminSb.auth.getUser(token);
    user = data.user;
  } else {
    // Fallback: cookie-based session (middleware keeps these fresh)
    const { data } = await createClient().auth.getUser();
    user = data.user;
  }
  if (!user) return null;

  const { data: profile } = await adminSb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = profile?.role || user.user_metadata?.role || user.app_metadata?.role || "customer";
  return role === "admin" ? user : null;
}

// GET /api/admin/offers?shop_id=X — all offers for a shop (including inactive/expired)
export async function GET(req: NextRequest) {
  const caller = await requireAdmin(req);
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
  const caller = await requireAdmin(req);
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
  const caller = await requireAdmin(req);
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
    const f = body.fields as any;
    const setIfDefined = (key: string, val: unknown, transform?: (v: unknown) => unknown) => {
      if (val !== undefined) updates[key] = transform ? transform(val) : val;
    };
    setIfDefined("title",           f.title,           (v) => String(v).trim());
    setIfDefined("description",     f.description,     (v) => v ? String(v).trim() : null);
    setIfDefined("discount_type",   f.discount_type);
    setIfDefined("discount_value",  f.discount_value);
    setIfDefined("tier",            f.tier);
    setIfDefined("ends_at",         f.ends_at);
    setIfDefined("coupon_code",     f.coupon_code,     (v) => v ? String(v).trim() : null);
    setIfDefined("is_featured",     f.is_featured);
    setIfDefined("is_active",       f.is_active);
    // badge overrides
    setIfDefined("is_flash",        f.is_flash);
    setIfDefined("is_big_deal",     f.is_big_deal);
    setIfDefined("is_recommended",  f.is_recommended);
    setIfDefined("manual_priority", f.manual_priority);
    setIfDefined("badge_override",  f.badge_override,  (v) => v ? String(v).trim() : null);
    setIfDefined("trending_override", f.trending_override);
  } else {
    return NextResponse.json({ error: "Invalid action or missing fields" }, { status: 400 });
  }

  const { data, error } = await admin.from("offers").update(updates).eq("id", body.offer_id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ offer: data });
}

// DELETE /api/admin/offers?offer_id=X
export async function DELETE(req: NextRequest) {
  const caller = await requireAdmin(req);
  if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const offerId = searchParams.get("offer_id");
  if (!offerId) return NextResponse.json({ error: "offer_id required" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("offers").delete().eq("id", offerId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
