import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { checkRate } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  try {
    const block = await checkRate(req, "vendorRequest");
    if (block) return block;
    // Resolve authenticated user from Bearer token or cookie session
    const admin = createAdminClient();
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();

    let userId: string | null = null;
    if (token) {
      const { data } = await admin.auth.getUser(token);
      userId = data.user?.id ?? null;
    }
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { shop_id, claimant_name, claimant_phone } = await req.json() as {
      shop_id:        string;
      claimant_name:  string;
      claimant_phone: string;
    };

    if (!shop_id || !claimant_name?.trim() || !claimant_phone?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check for existing pending claim on this shop (any user)
    const { data: existing } = await admin
      .from("shop_claim_requests")
      .select("id")
      .eq("shop_id", shop_id)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A claim is already pending for this shop. Our team will review it." },
        { status: 409 }
      );
    }

    // Insert claim request
    const { error: claimErr } = await admin.from("shop_claim_requests").insert({
      shop_id,
      user_id:        userId,
      claimant_name:  claimant_name.trim(),
      claimant_phone: claimant_phone.replace(/\D/g, ""),
      status:         "pending",
    });

    if (claimErr) {
      console.error("[vendor/claim] insert error:", claimErr.message);
      return NextResponse.json({ error: "Could not submit claim. Please try again." }, { status: 500 });
    }

    // Update shop's claim_status (admin client bypasses RLS safely — only sets 'pending')
    await admin
      .from("shops")
      .update({ claim_status: "pending" })
      .eq("id", shop_id)
      .is("claim_status", null); // only update if not already claimed

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
