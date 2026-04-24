/**
 * POST /api/vendor/shop
 *
 * Server-side shop creation with smart auto-approval.
 * All validation, spam checks, and approval decisions happen here —
 * never on the client — so the browser can never bypass them.
 *
 * Auto-approval fires only when ALL conditions pass:
 *   ✓ name length > 3 and no spam keywords
 *   ✓ valid category selected
 *   ✓ valid locality OR non-default GPS coordinates
 *   ✓ valid 10-digit phone number
 *   ✓ vendor has < 3 existing shops (spam guard)
 *   ✓ no duplicate (same name + same locality)
 *   ✓ AUTO_APPROVAL_ENABLED env var is not "false"
 *
 * Safety toggle: set AUTO_APPROVAL_ENABLED=false in Vercel env vars
 * to force all shops into pending without a code deploy.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateStarterOffer } from "@/lib/offer-engine/auto-offer";

/* ── Safety toggle ──────────────────────────────────────────────────── */
// Set AUTO_APPROVAL_ENABLED=false in env to disable auto-approval globally.
const AUTO_APPROVAL_ENABLED = process.env.AUTO_APPROVAL_ENABLED !== "false";

/* ── Constants ──────────────────────────────────────────────────────── */
const MAX_SHOPS_PER_VENDOR = 3;

const DEFAULT_LAT = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? "25.4358");
const DEFAULT_LNG = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? "81.8463");

// Words that indicate test/fake submissions — full-name match or starts-with
const SPAM_KEYWORDS = [
  "test", "testing", "asdf", "qwerty", "demo", "sample", "dummy",
  "fake", "temp", "abc", "xyz", "aaaa", "bbbb", "1234", "abcd",
  "hello", "shop123", "myshop", "testshop",
];

/* ── Helpers ────────────────────────────────────────────────────────── */
function containsSpam(name: string): boolean {
  const lower = name.toLowerCase().trim();
  return SPAM_KEYWORDS.some(kw =>
    lower === kw ||
    lower === kw + " shop" ||
    lower === kw + "1" ||
    lower === kw + "2"
  );
}

interface ApprovalInput {
  name:        string;
  categoryId:  string;
  localityId:  string;
  lat:         number;
  lng:         number;
  phone:       string;
}
type ApprovalResult =
  | { approved: true }
  | { approved: false; reason: string };

function decideApproval(d: ApprovalInput): ApprovalResult {
  if (!AUTO_APPROVAL_ENABLED)
    return { approved: false, reason: "auto_approval_disabled" };

  if (d.name.length <= 3)
    return { approved: false, reason: "name_too_short" };

  if (containsSpam(d.name))
    return { approved: false, reason: "spam_name" };

  if (!d.categoryId)
    return { approved: false, reason: "no_category" };

  // Location: either a locality is chosen, OR GPS differs from city default
  const hasRealGps =
    Math.abs(d.lat - DEFAULT_LAT) > 0.001 ||
    Math.abs(d.lng - DEFAULT_LNG) > 0.001;
  if (!d.localityId && !hasRealGps)
    return { approved: false, reason: "no_location" };

  const digits = d.phone.replace(/\D/g, "");
  if (digits.length < 10)
    return { approved: false, reason: "invalid_phone" };

  return { approved: true };
}

/* ── POST handler ───────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const supabase   = createClient();
  const adminSb    = createAdminClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Parse + sanitise body
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const name        = String(body.shop_name      ?? "").trim();
  const description = String(body.description    ?? "").trim() || null;
  const phone       = String(body.phone          ?? "").trim();
  const whatsapp    = String(body.whatsapp       ?? "").trim() || phone;
  const address     = String(body.address        ?? "").trim() || null;
  const localityId  = String(body.locality_id    ?? "").trim();
  const categoryId  = String(body.category_id    ?? "").trim();
  const lat         = typeof body.lat === "number" ? body.lat : DEFAULT_LAT;
  const lng         = typeof body.lng === "number" ? body.lng : DEFAULT_LNG;
  const openTime    = String(body.open_time       ?? "10:00");
  const closeTime   = String(body.close_time      ?? "21:00");

  // ── Input validation ─────────────────────────────────────────────
  if (name.length < 3)
    return NextResponse.json({ error: "Shop name is required (min 3 characters)" }, { status: 400 });
  if (!categoryId)
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  if (phone.replace(/\D/g, "").length < 10)
    return NextResponse.json({ error: "Valid 10-digit phone number is required" }, { status: 400 });

  // ── Max shops per vendor ─────────────────────────────────────────
  const { count: shopCount } = await adminSb
    .from("shops")
    .select("*", { count: "exact", head: true })
    .eq("vendor_id", user.id)
    .is("deleted_at", null);

  if ((shopCount ?? 0) >= MAX_SHOPS_PER_VENDOR) {
    return NextResponse.json(
      { error: `Maximum ${MAX_SHOPS_PER_VENDOR} shops allowed per vendor. Contact support to increase your limit.` },
      { status: 429 }
    );
  }

  // ── Duplicate check (same name + same locality) ──────────────────
  if (localityId) {
    const { data: dupe } = await adminSb
      .from("shops")
      .select("id")
      .eq("locality_id", localityId)
      .ilike("name", name)
      .maybeSingle();

    if (dupe) {
      return NextResponse.json(
        { error: "A shop with this name already exists in this locality. Please use a different name." },
        { status: 409 }
      );
    }
  }

  // ── Auto-approval decision ───────────────────────────────────────
  const result = decideApproval({ name, categoryId, localityId, lat, lng, phone });
  const approved = result.approved;

  // ── Upsert vendor + profile records ─────────────────────────────
  await Promise.all([
    adminSb.from("vendors").upsert({ id: user.id }, { onConflict: "id" }),
    adminSb.from("profiles").upsert({ id: user.id, role: "vendor" }, { onConflict: "id" }),
  ]);

  // ── Generate slug ────────────────────────────────────────────────
  const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const slug     = `${slugBase}-${Date.now()}`;

  // ── Insert shop ──────────────────────────────────────────────────
  const { data: shop, error: shopErr } = await adminSb
    .from("shops")
    .insert({
      vendor_id:              user.id,
      category_id:            categoryId,
      subcategory_id:         body.subcategory_id          ?? null,
      custom_business_type:   body.custom_business_type    || null,
      tags:                   Array.isArray(body.tags) ? body.tags : [],
      ai_category_confidence: typeof body.ai_category_confidence === "number"
                                ? body.ai_category_confidence : null,
      business_input_text:    body.business_input_text     || null,
      locality_id:            localityId || null,
      name,
      slug,
      description,
      phone,
      whatsapp,
      address,
      lat,
      lng,
      open_time:  openTime,
      close_time: closeTime,
      open_days:  Array.isArray(body.open_days)
                    ? body.open_days
                    : ["mon", "tue", "wed", "thu", "fri", "sat"],
      approval_status: approved ? "approved" : "pending",
      is_approved:     approved,
      is_active:       approved,
      is_featured:     false,
    })
    .select()
    .single();

  if (shopErr || !shop) {
    return NextResponse.json(
      { error: shopErr?.message ?? "Failed to create shop. Please try again." },
      { status: 500 }
    );
  }

  // ── Fetch category slug + name for offer generation ─────────────
  const { data: catRow } = await adminSb
    .from("categories")
    .select("slug, name")
    .eq("id", categoryId)
    .maybeSingle();
  const catSlug = catRow?.slug ?? "";
  const catName = catRow?.name ?? "";

  // ── Determine offer to insert ────────────────────────────────────
  // Always create an offer so no shop card ever looks empty.
  // Priority: explicit vendor input → Hinglish cleanup → category template.
  const rawOfferTitle = String(body.offer_title ?? "").trim();
  const offerTier     = String(body.offer_tier ?? "normal");
  const tierMap: Record<string, number> = { big: 1, flash: 2, normal: 3 };

  let offerPayload: Record<string, unknown>;

  if (rawOfferTitle && !["vendor", "auto_generated"].includes("")) {
    // Vendor typed something — run it through the generator to detect Hinglish
    const starter = generateStarterOffer(catSlug, catName, name, rawOfferTitle);
    offerPayload = {
      shop_id:        shop.id,
      title:          starter.title,
      description:    starter.description,
      discount_type:  body.offer_type ?? "other",
      discount_value: body.offer_value && !isNaN(Number(body.offer_value))
                        ? parseFloat(String(body.offer_value)) : null,
      tier:           starter.source_type === "vendor" ? (tierMap[offerTier] ?? 3) : 3,
      is_active:      true,
      is_featured:    starter.source_type === "vendor" && offerTier === "big",
      source_type:    starter.source_type,
      raw_input_text: starter.raw_input_text,
    };
  } else {
    // No input — generate from category
    const starter = generateStarterOffer(catSlug, catName, name);
    offerPayload = {
      shop_id:        shop.id,
      title:          starter.title,
      description:    starter.description,
      discount_type:  "other",
      discount_value: null,
      tier:           3,
      is_active:      true,
      is_featured:    false,
      source_type:    "auto_generated",
      raw_input_text: null,
    };
  }

  // Non-critical — shop is already live; log but don't fail the response
  const { error: offerErr } = await adminSb.from("offers").insert(offerPayload);
  if (offerErr) console.error("[auto-offer] insert failed:", offerErr.message);

  return NextResponse.json(
    {
      shop,
      approved,
      message: approved
        ? "Your shop is live on ApnaMap! 🎉"
        : "Your shop has been submitted for review. We'll approve it shortly.",
    },
    { status: 201 }
  );
}
