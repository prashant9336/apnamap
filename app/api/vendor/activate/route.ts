import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { vendorAuthEmail, normalizePhone, phoneDigits } from "@/lib/config";
import { checkRate } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  const block = await checkRate(req, "vendorActivate");
  if (block) return block;
  try {
    const { mobile, password } = await req.json() as { mobile: string; password: string };

    const phone = normalizePhone(mobile ?? "");
    if (!phone) {
      return NextResponse.json({ error: "Enter a valid 10-digit mobile number" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const digits = phoneDigits(phone);
    const email  = vendorAuthEmail(digits);
    const admin = createAdminClient();

    // Find an approved request for this mobile — this is the identity check.
    // Admin approval replaces the need for OTP since admin already vetted the vendor.
    const { data: vr, error: vrErr } = await admin
      .from("vendor_requests")
      .select("id, shop_name, shop_id, request_type, locality_id, category_id")
      .eq("mobile", digits)
      .eq("status", "approved")
      .order("reviewed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (vrErr || !vr) {
      return NextResponse.json({
        error: "No approved request found for this number. Contact the ApnaMap team or wait for admin approval.",
      }, { status: 404 });
    }

    // Create Supabase Auth user with synthetic email + password.
    // email_confirm: true skips email verification — admin already verified the request.
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "vendor", phone, mobile: digits },
    });

    if (authErr) {
      if (authErr.message?.toLowerCase().includes("already") ||
          authErr.message?.toLowerCase().includes("registered")) {
        return NextResponse.json({
          error: "An account already exists for this number. Please log in.",
          alreadyExists: true,
        }, { status: 409 });
      }
      console.error("[vendor/activate] createUser error:", authErr);
      return NextResponse.json({ error: authErr.message }, { status: 500 });
    }

    const userId = authData.user!.id;

    // Upsert profile (trigger may have already created it)
    await admin.from("profiles").upsert({
      id:         userId,
      phone,
      role:       "vendor",
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

    // Insert vendor row
    await admin.from("vendors").upsert({
      id:                userId,
      mobile:            phone,
      is_approved:       true,
      vendor_request_id: vr.id,
    }, { onConflict: "id" });

    // Mark request activated
    await admin.from("vendor_requests").update({ status: "activated" }).eq("id", vr.id);

    // Link shop if claim_existing
    if (vr.request_type === "claim_existing" && vr.shop_id) {
      await admin.from("shops")
        .update({ vendor_id: userId, is_claimed: true })
        .eq("id", vr.shop_id);
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
