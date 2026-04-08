import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createHmac } from "crypto";

const OTP_SECRET   = process.env.OTP_SECRET ?? "apnamap-otp-secret-change-me";
const MAX_ATTEMPTS = 5;

function hashOtp(otp: string): string {
  return createHmac("sha256", OTP_SECRET).update(otp).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { mobile, otp } = await req.json() as { mobile?: string; otp?: string };
    const digits = (mobile ?? "").replace(/\D/g, "");

    if (digits.length !== 10) {
      return NextResponse.json({ error: "Invalid mobile number" }, { status: 400 });
    }
    if (!otp || otp.length !== 6) {
      return NextResponse.json({ error: "Enter the 6-digit OTP" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch the latest valid (unexpired, unverified) session for this mobile
    const { data: session } = await admin
      .from("otp_sessions")
      .select("id, otp_hash, attempts, expires_at")
      .eq("mobile", digits)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ error: "OTP expired or not found. Request a new one." }, { status: 400 });
    }

    if (session.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: "Too many wrong attempts. Request a new OTP." }, { status: 429 });
    }

    const incoming = hashOtp(otp.trim());
    if (incoming !== session.otp_hash) {
      // Increment attempts
      await admin
        .from("otp_sessions")
        .update({ attempts: session.attempts + 1 })
        .eq("id", session.id);

      const left = MAX_ATTEMPTS - session.attempts - 1;
      return NextResponse.json(
        { error: left > 0 ? `Wrong OTP. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many attempts. Request a new OTP." },
        { status: 400 }
      );
    }

    // Mark as verified
    await admin
      .from("otp_sessions")
      .update({ verified: true })
      .eq("id", session.id);

    return NextResponse.json({ verified: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
