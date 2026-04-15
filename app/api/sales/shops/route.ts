/**
 * /api/sales/shops
 *
 * Sales / Onboarding Agent endpoints.
 * Requires: authenticated user with profiles.role = 'sales' OR 'admin'.
 *
 * GET  — list shops the caller onboarded (created_by = user.id)
 * POST — create an unclaimed shop (vendor_id = null, created_by = user.id)
 * PATCH — edit one of the caller's onboarded shops (field allowlist enforced)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generateStarterOffer } from "@/lib/offer-engine/auto-offer";

/* ── Auth helper ──────────────────────────────────────────────────── */
async function getSalesUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;

  const adminSb = createAdminClient();
  const { data: { user }, error } = await adminSb.auth.getUser(token);
  if (error || !user) return null;

  const { data: profile } = await adminSb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role ?? "customer";
  if (role !== "sales" && role !== "admin") return null;

  return { user, role };
}

/* ── Constants ────────────────────────────────────────────────────── */
const DEFAULT_LAT = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? "25.4358");
const DEFAULT_LNG = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? "81.8463");

const SPAM_KEYWORDS = [
  "test", "testing", "asdf", "qwerty", "demo", "sample", "dummy",
  "fake", "temp", "abc", "xyz", "aaaa", "bbbb", "1234", "abcd",
  "hello", "shop123", "myshop", "testshop",
];

function containsSpam(name: string): boolean {
  const lower = name.toLowerCase().trim();
  return SPAM_KEYWORDS.some(kw =>
    lower === kw || lower === kw + " shop" || lower === kw + "1" || lower === kw + "2"
  );
}

/* ── GET — my onboarded shops ─────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const caller = await getSalesUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminSb = createAdminClient();

  const { data, error } = await adminSb
    .from("shops")
    .select(`
      id, name, slug, phone, is_approved, is_active, is_featured,
      created_at, view_count,
      locality:localities(name),
      category:categories(name, icon),
      offers(id, title, is_active, source_type)
    `)
    .eq("created_by", caller.user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ shops: data ?? [] });
}

/* ── POST — create unclaimed shop ────────────────────────────────── */
export async function POST(req: NextRequest) {
  const caller = await getSalesUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const adminSb = createAdminClient();

  const name        = String(body.shop_name   ?? "").trim();
  const phone       = String(body.phone        ?? "").trim();
  const whatsapp    = String(body.whatsapp     ?? "").trim() || phone;
  const address     = String(body.address      ?? "").trim() || null;
  const description = String(body.description  ?? "").trim() || null;
  const localityId  = String(body.locality_id  ?? "").trim();
  const categoryId  = String(body.category_id  ?? "").trim();
  const lat         = typeof body.lat === "number" ? body.lat : DEFAULT_LAT;
  const lng         = typeof body.lng === "number" ? body.lng : DEFAULT_LNG;
  const openTime    = String(body.open_time    ?? "10:00");
  const closeTime   = String(body.close_time   ?? "21:00");

  // Validation
  if (name.length < 2)
    return NextResponse.json({ error: "Shop name is required (min 2 characters)" }, { status: 400 });
  if (!categoryId)
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  if (phone.replace(/\D/g, "").length < 10)
    return NextResponse.json({ error: "Valid 10-digit phone number is required" }, { status: 400 });
  if (containsSpam(name))
    return NextResponse.json({ error: "Shop name looks like a test entry. Please use the real business name." }, { status: 400 });

  // Duplicate check
  if (localityId) {
    const { data: dupe } = await adminSb
      .from("shops")
      .select("id")
      .eq("locality_id", localityId)
      .ilike("name", name)
      .maybeSingle();

    if (dupe) {
      return NextResponse.json(
        { error: "A shop with this name already exists in this locality." },
        { status: 409 }
      );
    }
  }

  // Auto-approval: salesmen get auto-approved if all signals are good
  const hasRealGps =
    Math.abs(lat - DEFAULT_LAT) > 0.001 || Math.abs(lng - DEFAULT_LNG) > 0.001;
  const digits = phone.replace(/\D/g, "");
  const approved =
    process.env.AUTO_APPROVAL_ENABLED !== "false" &&
    name.length > 3 &&
    !!categoryId &&
    (!!localityId || hasRealGps) &&
    digits.length >= 10;

  // Slug
  const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const slug     = `${slugBase}-${Date.now()}`;

  // Insert shop (vendor_id = null — unclaimed)
  const { data: shop, error: shopErr } = await adminSb
    .from("shops")
    .insert({
      vendor_id:            null,
      created_by:           caller.user.id,
      created_by_role:      caller.role,
      category_id:          categoryId,
      locality_id:          localityId || null,
      name,
      slug,
      description,
      phone,
      whatsapp,
      address,
      lat,
      lng,
      open_time:            openTime,
      close_time:           closeTime,
      open_days:            Array.isArray(body.open_days)
                              ? body.open_days
                              : ["mon", "tue", "wed", "thu", "fri", "sat"],
      tags:                 Array.isArray(body.tags) ? body.tags : [],
      is_approved:          approved,
      is_active:            approved,
      is_featured:          false,
    })
    .select()
    .single();

  if (shopErr || !shop) {
    return NextResponse.json(
      { error: shopErr?.message ?? "Failed to create shop" },
      { status: 500 }
    );
  }

  // Auto-offer generation
  const { data: catRow } = await adminSb
    .from("categories")
    .select("slug, name")
    .eq("id", categoryId)
    .maybeSingle();
  const catSlug = catRow?.slug ?? "";
  const catName = catRow?.name ?? "";

  const rawOfferTitle = String(body.offer_title ?? "").trim();
  const starter = generateStarterOffer(catSlug, catName, name, rawOfferTitle || undefined);

  const { error: offerErr } = await adminSb.from("offers").insert({
    shop_id:        shop.id,
    title:          starter.title,
    description:    starter.description,
    discount_type:  body.offer_type ?? "other",
    discount_value: body.offer_value && !isNaN(Number(body.offer_value))
                      ? parseFloat(String(body.offer_value)) : null,
    tier:           3,
    is_active:      true,
    is_featured:    false,
    source_type:    starter.source_type,
    raw_input_text: starter.raw_input_text,
  });
  if (offerErr) console.error("[sales/auto-offer] insert failed:", offerErr.message);

  return NextResponse.json(
    {
      shop,
      approved,
      message: approved
        ? "Shop is live on ApnaMap!"
        : "Shop submitted for review.",
    },
    { status: 201 }
  );
}

/* ── PATCH — approve or edit own onboarded shop ──────────────────── */
export async function PATCH(req: NextRequest) {
  const caller = await getSalesUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const shopId = String(body.shop_id ?? "").trim();
  const action  = String(body.action  ?? "edit");
  if (!shopId) return NextResponse.json({ error: "shop_id required" }, { status: 400 });

  const adminSb = createAdminClient();

  // Ownership check: must be created_by this salesman (admins bypass)
  if (caller.role !== "admin") {
    const { data: owned } = await adminSb
      .from("shops")
      .select("id")
      .eq("id", shopId)
      .eq("created_by", caller.user.id)
      .maybeSingle();

    if (!owned) {
      return NextResponse.json({ error: "Shop not found or not yours" }, { status: 403 });
    }
  }

  // ── Approve action ────────────────────────────────────────────
  if (action === "approve") {
    const { data: updated, error } = await adminSb
      .from("shops")
      .update({ is_approved: true, is_active: true, updated_at: new Date().toISOString() })
      .eq("id", shopId)
      .select("id, name, slug, is_approved, is_active")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ shop: updated });
  }

  // ── Edit action (default) ─────────────────────────────────────
  const allowed: Record<string, unknown> = {};
  const EDITABLE = ["name", "phone", "whatsapp", "address", "description", "open_time", "close_time", "open_days", "tags"];
  for (const key of EDITABLE) {
    if (key in body) allowed[key] = body[key];
  }

  if (Object.keys(allowed).length === 0)
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });

  const { data: updated, error } = await adminSb
    .from("shops")
    .update(allowed)
    .eq("id", shopId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ shop: updated });
}
