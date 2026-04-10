import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createHmac, randomInt } from "crypto";
import { checkRate } from "@/lib/ratelimit";

// Prevent Next.js from executing this route at build time
export const dynamic = "force-dynamic";

const OTP_TTL_MIN = 10; // minutes

function hashOtp(otp: string, secret: string): string {
  return createHmac("sha256", secret).update(otp).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    // Validate OTP_SECRET at request time, not module load time
    const otpSecret = process.env.OTP_SECRET;
    if (!otpSecret || otpSecret === "apnamap-otp-secret-change-me") {
      console.error("[otp/send] OTP_SECRET env var is missing or insecure — set it in Vercel env vars");
      return NextResponse.json({ error: "OTP service is not configured" }, { status: 503 });
    }

    const blocked = await checkRate(req, "otp");
    if (blocked) return blocked;
    const { mobile } = await req.json() as { mobile?: string };
    const digits = (mobile ?? "").replace(/\D/g, "");

    if (digits.length !== 10) {
      return NextResponse.json({ error: "Enter a valid 10-digit mobile number" }, { status: 400 });
    }

    // Rate-limit: block if a fresh OTP was sent < 60s ago
    const admin = createAdminClient();
    const cutoff = new Date(Date.now() - 60_000).toISOString();
    const { data: recent } = await admin
      .from("otp_sessions")
      .select("created_at")
      .eq("mobile", digits)
      .gt("created_at", cutoff)
      .limit(1)
      .maybeSingle();

    if (recent) {
      return NextResponse.json({ error: "OTP already sent. Wait 60 seconds before retrying." }, { status: 429 });
    }

    // Generate a 6-digit OTP
    const otp      = String(randomInt(100000, 999999));
    const otp_hash = hashOtp(otp, otpSecret as string);
    const expires_at = new Date(Date.now() + OTP_TTL_MIN * 60_000).toISOString();

    await admin.from("otp_sessions").insert({
      mobile:     digits,
      otp_hash,
      expires_at,
      verified:   false,
      attempts:   0,
    });

    // ── Send OTP via your SMS/WhatsApp provider ─────────────────────
    // TODO: replace this with your provider (MSG91, Fast2SMS, Twilio, etc.)
    // Example with MSG91:
    //   await fetch(`https://api.msg91.com/api/v5/otp?...&mobile=91${digits}&otp=${otp}`)
    //
    // In development the OTP is logged to the server console.
    if (process.env.NODE_ENV !== "production") {
      console.log(`[OTP DEV] mobile=+91${digits}  otp=${otp}`);
    } else {
      // TODO: integrate real provider
      console.log(`[OTP] sending to +91${digits}`);
    }
    // ────────────────────────────────────────────────────────────────

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
