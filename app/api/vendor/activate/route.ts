import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { vendorAuthEmail } from "@/lib/config";

// Synthetic email so Supabase email auth works without phone provider
function vendorEmail(digits: string) {
  return vendorAuthEmail(digits);
}

export async function POST(req: NextRequest) {
  try {
    const { mobile, password } = await req.json() as { mobile: string; password: string };

    const digits = (mobile ?? "").replace(/\D/g, "");
    if (digits.length !== 10) {
      return NextResponse.json({ error: "Enter a valid 10-digit mobile number" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const phone = `+91${digits}`;
    const email = vendorEmail(digits);
    const admin = createAdminClient();

    // Require OTP verification within the last 15 minutes
    const otpCutoff = new Date(Date.now() - 15 * 60_000).toISOString();
    const { data: otpSession } = await admin
      .from("otp_sessions")
      .select("id")
      .eq("mobile", digits)
      .eq("verified", true)
      .gt("expires_at", otpCutoff)
      .limit(1)
      .maybeSingle();

    if (!otpSession) {
      return NextResponse.json(
        { error: "Phone verification required. Please verify your mobile number first.", otpRequired: true },
        { status: 403 }
      );
    }

    // Find an approved request for this mobile
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
        error: "No approved request found for this number. Contact support or wait for admin approval.",
      }, { status: 404 });
    }

    // Create Supabase Auth user with synthetic email + password
    // email_confirm: true skips email verification — admin already verified the request
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
