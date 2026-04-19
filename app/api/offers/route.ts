import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

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

  // Cache the global offer feed — not per-shop (those are vendor-facing and must be fresh)
  const headers: Record<string, string> = !shopId
    ? { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" }
    : { "Cache-Control": "no-store" };

  return NextResponse.json({ offers: data ?? [] }, { headers });
}

/**
 * POST /api/offers — vendor creates an offer for their own shop.
 *
 * Security:
 *   - Bearer token auth (mobile-reliable) + cookie fallback
 *   - Explicit shop ownership check (vendor_id = user.id)
 *   - Field allowlist — strips all admin-only privilege fields:
 *       tier is capped at 2 (vendors cannot self-assign Big Deal / tier 1)
 *       is_featured, is_big_deal, is_flash, is_recommended, manual_priority
 *       are intentionally excluded — admin-only via /api/admin/offers
 */
export async function POST(req: NextRequest) {
  const adminSb = createAdminClient();

  // Prefer Bearer token (sent by client explicitly — mobile Safari reliable)
  // over cookie session (can be unreliable in PWA / private-browsing contexts).
  const authHeader  = req.headers.get("Authorization") ?? "";
  const bearerToken = authHeader.replace("Bearer ", "").trim();

  let user = null;
  if (bearerToken) {
    const { data } = await adminSb.auth.getUser(bearerToken);
    user = data.user;
  }
  if (!user) {
    const { data } = await createClient().auth.getUser();
    user = data.user;
  }
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;
  const shopId = String(body.shop_id ?? "").trim();
  const title  = String(body.title  ?? "").trim();

  if (!shopId) return NextResponse.json({ error: "shop_id required" }, { status: 400 });
  if (!title)  return NextResponse.json({ error: "title required" }, { status: 400 });

  // Ownership check — vendor may only add offers to their OWN shop.
  // Using adminSb (bypasses RLS) so we can check even unapproved shops.
  const { data: shop } = await adminSb
    .from("shops")
    .select("vendor_id")
    .eq("id", shopId)
    .maybeSingle();

  if (!shop || shop.vendor_id !== user.id) {
    return NextResponse.json({ error: "Shop not found or not yours" }, { status: 403 });
  }

  // Build a strictly allowlisted payload.
  // Tier is clamped to [2, 3] — tier 1 (Big Deal) is admin-only.
  // All badge / priority overrides are intentionally excluded.
  const rawTier = Number(body.tier);
  const tier    = Number.isFinite(rawTier) ? Math.max(2, Math.min(3, rawTier)) : 2;

  const payload: Record<string, unknown> = {
    shop_id:        shopId,
    title,
    description:    body.description ? String(body.description).trim() : null,
    discount_type:  body.discount_type || "other",
    discount_value: body.discount_value ?? null,
    coupon_code:    body.coupon_code ? String(body.coupon_code).trim() : null,
    ends_at:        body.ends_at ?? null,
    tier,
    is_active:      true,
    is_featured:    false,   // admin-only
    // is_big_deal, is_flash, is_recommended, manual_priority intentionally omitted
  };

  const { data, error } = await adminSb.from("offers").insert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ offer: data }, { status: 201 });
}
