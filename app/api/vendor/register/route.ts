import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { vendorAuthEmail, normalizePhone, phoneDigits } from "@/lib/config";
import { checkRate } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

function err(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

// ── Geo-fence: only accept shops within SERVICE_RADIUS_KM of the city centre ──
const SERVICE_CENTER_LAT = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? "25.4358");
const SERVICE_CENTER_LNG = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? "81.8463");
const SERVICE_RADIUS_KM  = parseFloat(process.env.VENDOR_GEOFENCE_KM     ?? "80");    // ~80 km covers all Prayagraj

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R  = 6371;
  const dL = (lat2 - lat1) * (Math.PI / 180);
  const dN = (lng2 - lng1) * (Math.PI / 180);
  const a  =
    Math.sin(dL / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dN / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isWithinServiceArea(lat: number, lng: number): boolean {
  return haversineKm(lat, lng, SERVICE_CENTER_LAT, SERVICE_CENTER_LNG) <= SERVICE_RADIUS_KM;
}

export async function POST(req: NextRequest) {
  const block = await checkRate(req, "vendorRegister");
  if (block) return block;

  try {
    const body = await req.json();

    // ── Validate required fields ─────────────────────────────────────
    const { owner_name, mobile, password, shop_name, category_id, locality_id } = body as {
      owner_name:   string;
      mobile:       string;
      password:     string;
      shop_name:    string;
      category_id:  string;
      locality_id:  string;
    };

    const phone = normalizePhone(mobile ?? "");
    if (!phone)                           return err("Enter a valid 10-digit mobile number");
    const digits = phoneDigits(phone);

    if (!owner_name?.trim())              return err("Owner name is required");
    if (!password || password.length < 6) return err("Password must be at least 6 characters");
    if (!shop_name?.trim())               return err("Shop name is required");
    if (!category_id)                     return err("Category is required");
    if (!locality_id)                     return err("Locality is required");

    const email = vendorAuthEmail(digits);
    const admin = createAdminClient();

    // ── Duplicate check: mobile already registered ───────────────────
    const { data: existing } = await admin
      .from("vendors")
      .select("id")
      .eq("mobile", phone)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        error: "An account already exists for this mobile number. Please log in.",
        alreadyExists: true,
      }, { status: 409 });
    }

    // ── 1. Create Supabase auth user ─────────────────────────────────
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "vendor", phone, mobile: digits, name: owner_name.trim() },
    });

    if (authErr || !authData.user) {
      if (authErr?.message?.toLowerCase().includes("already")) {
        return NextResponse.json({
          error: "Account already exists. Please log in.",
          alreadyExists: true,
        }, { status: 409 });
      }
      return NextResponse.json({ error: authErr?.message ?? "Failed to create account" }, { status: 500 });
    }

    const userId = authData.user.id;

    try {
      // ── 2. Profile ───────────────────────────────────────────────────
      await admin.from("profiles").upsert({
        id:   userId,
        name: owner_name.trim(),
        phone,
        role: "vendor",
      }, { onConflict: "id" });

      // ── 3. Vendor row ────────────────────────────────────────────────
      // is_approved: true so vendor can log in immediately.
      // Shop has its own is_approved: false — admin reviews the listing.
      await admin.from("vendors").upsert({
        id:          userId,
        mobile:      phone,
        is_approved: true,
      }, { onConflict: "id" });

      // ── 4. Shop ──────────────────────────────────────────────────────

      // Geo-fence: if vendor pinned a GPS location, it must be within the service area.
      // Reject up front so we don't create orphaned auth accounts for out-of-city vendors.
      const shopLat = body.lat  ?? SERVICE_CENTER_LAT;
      const shopLng = body.lng  ?? SERVICE_CENTER_LNG;

      if (body.lat !== undefined && body.lng !== undefined) {
        if (!isWithinServiceArea(body.lat, body.lng)) {
          throw Object.assign(
            new Error(
              `ApnaMap currently serves Prayagraj only. Your pinned location appears to be outside our service area (>${SERVICE_RADIUS_KM} km from the city). Remove the GPS pin to register with the default city location, or contact us if your shop is in Prayagraj.`
            ),
            { statusCode: 422 }
          );
        }
      }

      const slugBase = shop_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const slug = `${slugBase}-${Date.now()}`;

      const { data: shop, error: shopErr } = await admin.from("shops").insert({
        vendor_id:            userId,
        category_id,
        subcategory_id:       body.subcategory_id       ?? null,
        locality_id,
        name:                 shop_name.trim(),
        slug,
        description:          body.description?.trim()  ?? null,
        phone:                body.shop_phone?.trim()   || phone,
        whatsapp:             body.whatsapp?.trim()     || phone,
        address:              body.address?.trim()      ?? null,
        lat:  shopLat,
        lng:  shopLng,
        open_time:  "09:00",
        close_time: "21:00",
        open_days:  ["mon","tue","wed","thu","fri","sat"],
        is_approved: false,   // admin reviews before going live to users
        is_active:   true,
        is_featured: false,
        custom_business_type: body.custom_business_type ?? null,
        tags:                 body.tags                 ?? [],
      }).select().single();

      if (shopErr || !shop) {
        throw new Error(shopErr?.message ?? "Failed to create shop");
      }

      // ── 5. First offer (optional) ────────────────────────────────────
      if (body.offer?.title?.trim()) {
        const expiresAt = (body.offer.expiry_hours ?? 0) > 0
          ? new Date(Date.now() + body.offer.expiry_hours * 3_600_000).toISOString()
          : null;

        await admin.from("offers").insert({
          shop_id:        shop.id,
          title:          body.offer.title.trim(),
          discount_type:  body.offer.deal_type   ?? "other",
          discount_value: body.offer.discount_value ?? null,
          tier:           body.offer.tier           ?? 3,
          is_active:      true,
          is_featured:    false,
          ends_at:        expiresAt,
        });
      }

      // ── 6. Sign vendor in → return session so frontend can hydrate ───
      const { data: signIn, error: signInErr } = await admin.auth.signInWithPassword({ email, password });

      if (signInErr || !signIn.session) {
        // Account + shop created. Vendor must log in manually.
        return NextResponse.json({ success: true, requiresLogin: true, shop_id: shop.id });
      }

      return NextResponse.json({
        success:       true,
        access_token:  signIn.session.access_token,
        refresh_token: signIn.session.refresh_token,
        user_id:       userId,
        shop_id:       shop.id,
        shop_slug:     shop.slug,
      });

    } catch (inner: unknown) {
      // Best-effort rollback: delete auth user so mobile isn't permanently locked
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      throw inner;
    }

  } catch (e: unknown) {
    const msg    = e instanceof Error ? e.message : "Server error";
    const status = (e as { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
