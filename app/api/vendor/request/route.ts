import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      mobile,
      shop_name,
      locality_id,
      locality_raw,
      category_id,
      request_type = "new_shop",
      shop_id,
      note,
    } = body as Record<string, string>;

    // Validate required fields
    const digits = (mobile ?? "").replace(/\D/g, "");
    if (digits.length !== 10) {
      return NextResponse.json({ error: "Enter a valid 10-digit mobile number" }, { status: 400 });
    }
    if (!shop_name?.trim()) {
      return NextResponse.json({ error: "Shop name is required" }, { status: 400 });
    }
    if (!["new_shop", "claim_existing"].includes(request_type)) {
      return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
    }

    // Use service role — bypasses RLS, safe because this is a server-side API route
    const supabase = createAdminClient();

    // Block duplicate active requests (pending or approved) from same mobile
    const { data: existing } = await supabase
      .from("vendor_requests")
      .select("id, status, created_at")
      .eq("mobile", digits)
      .in("status", ["pending", "approved"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const msg =
        existing.status === "approved"
          ? "Your request is already approved. Please set your password to activate your account."
          : "A request from this mobile is already under review. We will contact you within 24 hours.";
      return NextResponse.json({ error: msg, status: existing.status }, { status: 409 });
    }

    // Insert request
    const { data, error } = await supabase
      .from("vendor_requests")
      .insert({
        mobile:       digits,
        shop_name:    shop_name.trim(),
        locality_id:  locality_id   || null,
        locality_raw: locality_raw  || null,
        category_id:  category_id   || null,
        request_type,
        shop_id:      shop_id       || null,
        note:         note?.trim()  || null,
        status:       "pending",
      })
      .select("id")
      .single();

    if (error) {
      console.error("[vendor/request] insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
