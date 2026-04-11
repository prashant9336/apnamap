import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { vendorAuthEmail } from "@/lib/config";

export const dynamic = "force-dynamic";

function err(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: NextRequest) {
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

    const digits = (mobile ?? "").replace(/\D/g, "");

    if (!owner_name?.trim())              return err("Owner name is required");
    if (digits.length !== 10)             return err("Enter a valid 10-digit mobile number");
    if (!password || password.length < 6) return err("Password must be at least 6 characters");
    if (!shop_name?.trim())               return err("Shop name is required");
    if (!category_id)                     return err("Category is required");
    if (!locality_id)                     return err("Locality is required");

    const phone = `+91${digits}`;
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
        lat:  body.lat  ?? parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? "25.4358"),
        lng:  body.lng  ?? parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? "81.8463"),
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
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
