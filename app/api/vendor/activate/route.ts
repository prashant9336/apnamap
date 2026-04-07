import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { mobile, password } = await req.json() as { mobile: string; password: string };

    // Validate inputs
    const digits = (mobile ?? "").replace(/\D/g, "");
    if (digits.length !== 10) {
      return NextResponse.json({ error: "Enter a valid 10-digit mobile number" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const phone = `+91${digits}`;
    const admin = createAdminClient();

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

    // Create Supabase Auth user with phone + password
    // phone_confirm: true skips OTP verification (admin has already verified the request)
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      phone,
      password,
      phone_confirm: true,
      user_metadata: { role: "vendor" },
    });

    if (authErr) {
      // User already exists — they may have already set a password
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

    // Upsert profile row (trigger may have auto-created it, but ensure role is correct)
    const { error: profileErr } = await admin.from("profiles").upsert({
      id:         userId,
      phone,
      role:       "vendor",
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

    if (profileErr) {
      console.error("[vendor/activate] profile upsert error:", profileErr);
    }

    // Insert vendor row
    const { error: vendorErr } = await admin.from("vendors").upsert({
      id:                userId,
      mobile:            phone,
      is_approved:       true,
      vendor_request_id: vr.id,
    }, { onConflict: "id" });

    if (vendorErr) {
      console.error("[vendor/activate] vendor upsert error:", vendorErr);
    }

    // Mark request as activated
    await admin.from("vendor_requests").update({
      status: "activated",
    }).eq("id", vr.id);

    // If claiming an existing shop, link vendor to it
    if (vr.request_type === "claim_existing" && vr.shop_id) {
      const { error: shopErr } = await admin
        .from("shops")
        .update({ vendor_id: userId, is_claimed: true })
        .eq("id", vr.shop_id);

      if (shopErr) {
        console.error("[vendor/activate] shop claim error:", shopErr);
        // Non-fatal — vendor account created, shop linking can be fixed manually
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
