import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

function vendorEmail(digits: string) {
  return `${digits}@vendor.apnamap.in`;
}

// Memorable temp password: Word@NNNN
const WORDS = ["Shop","Deal","Offer","Store","Dukaan","Bazaar","Market","Local","Near","Fresh"];
function generateTempPassword(): string {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const num  = String(Math.floor(1000 + Math.random() * 9000));
  return `${word}@${num}`;
}

function whatsappText(shopName: string, mobile: string, password: string): string {
  return (
    `🏪 *ApnaMap Vendor Account*\n\n` +
    `Namaste! Your shop *${shopName}* is now live on ApnaMap.\n\n` +
    `*Login Details:*\n` +
    `📱 Mobile: ${mobile}\n` +
    `🔑 Password: \`${password}\`\n\n` +
    `*Login here:*\nhttps://apnamap.in/vendor/login\n\n` +
    `⚠️ Please change your password after first login.\n\n` +
    `_ApnaMap Team_`
  );
}

export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient();

    // ── Auth guard: caller must be admin ──────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: { user: caller }, error: callerErr } = await admin.auth.getUser(token);
    if (callerErr || !caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: callerProfile } = await admin
      .from("profiles").select("role").eq("id", caller.id).maybeSingle();
    if (callerProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Parse body ────────────────────────────────────────────────
    const body = await req.json() as {
      mobile:       string;
      shop_name:    string;
      category_id:  string;
      locality_id:  string;
      description?: string;
      lat?:         number;
      lng?:         number;
      offer: {
        title:          string;
        deal_type:      string;
        discount_value?: number;
        expiry_hours:   number;
      };
    };

    const digits = (body.mobile ?? "").replace(/\D/g, "");
    if (digits.length !== 10)   return NextResponse.json({ error: "Invalid mobile number" }, { status: 400 });
    if (!body.shop_name?.trim()) return NextResponse.json({ error: "Shop name is required" }, { status: 400 });
    if (!body.category_id)       return NextResponse.json({ error: "Category is required" }, { status: 400 });
    if (!body.locality_id)       return NextResponse.json({ error: "Locality is required" }, { status: 400 });
    if (!body.offer?.title?.trim()) return NextResponse.json({ error: "Offer title is required" }, { status: 400 });

    const email       = vendorEmail(digits);
    const phone       = `+91${digits}`;
    const tempPass    = generateTempPassword();

    // ── Check duplicate account ───────────────────────────────────
    const { data: existing } = await admin.auth.admin.listUsers();
    const dup = existing?.users?.find(u => u.email === email);
    if (dup) {
      return NextResponse.json({
        error: `A vendor account already exists for +91 ${digits}. They can log in at /vendor/login.`,
        alreadyExists: true,
      }, { status: 409 });
    }

    // ── 1. Create Supabase auth user ──────────────────────────────
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email,
      password:      tempPass,
      email_confirm: true,
      user_metadata: { role: "vendor", phone, mobile: digits },
    });
    if (authErr || !authData.user) {
      return NextResponse.json({ error: authErr?.message ?? "Failed to create user" }, { status: 500 });
    }
    const userId = authData.user.id;

    // ── 2. Profile ────────────────────────────────────────────────
    await admin.from("profiles").upsert({
      id:   userId,
      phone,
      role: "vendor",
    }, { onConflict: "id" });

    // ── 3. Vendor row (must_change_password = true) ───────────────
    await admin.from("vendors").upsert({
      id:                    userId,
      mobile:                phone,
      is_approved:           true,
      must_change_password:  true,
    }, { onConflict: "id" });

    // ── 4. Shop (pre-approved, admin created) ─────────────────────
    const slugBase = body.shop_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const slug     = `${slugBase}-${Date.now()}`;

    const { data: shop, error: shopErr } = await admin.from("shops").insert({
      vendor_id:   userId,
      category_id: body.category_id,
      locality_id: body.locality_id,
      name:        body.shop_name.trim(),
      slug,
      description: body.description?.trim() || null,
      phone:       phone,
      whatsapp:    phone,
      lat:         body.lat  ?? parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? "25.4358"),
      lng:         body.lng  ?? parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? "81.8463"),
      open_time:   "09:00",
      close_time:  "21:00",
      open_days:   ["mon","tue","wed","thu","fri","sat"],
      is_approved: true,
      is_active:   true,
      is_featured: false,
    }).select().single();

    if (shopErr || !shop) {
      // Rollback user (best-effort)
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: shopErr?.message ?? "Failed to create shop" }, { status: 500 });
    }

    // ── 5. First offer ────────────────────────────────────────────
    const expiresAt = body.offer.expiry_hours > 0
      ? new Date(Date.now() + body.offer.expiry_hours * 3_600_000).toISOString()
      : null;

    await admin.from("offers").insert({
      shop_id:        shop.id,
      title:          body.offer.title.trim(),
      discount_type:  body.offer.deal_type,
      discount_value: body.offer.discount_value ?? null,
      tier:           3,
      is_active:      true,
      is_featured:    false,
      ends_at:        expiresAt,
    });

    // ── 6. Create vendor_request record (activated) ───────────────
    await admin.from("vendor_requests").insert({
      mobile:       digits,
      shop_name:    body.shop_name.trim(),
      locality_id:  body.locality_id,
      category_id:  body.category_id,
      request_type: "new_shop",
      status:       "activated",
      reviewed_at:  new Date().toISOString(),
      reviewed_by:  caller.id,
      review_note:  "Admin direct onboard",
    });

    return NextResponse.json({
      success:      true,
      temp_password: tempPass,
      shop_id:      shop.id,
      user_id:      userId,
      whatsapp_msg: whatsappText(body.shop_name, `+91 ${digits}`, tempPass),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
