import { NextRequest, NextResponse } from "next/server";
import { checkRate } from "@/lib/ratelimit";
import { createHmac }  from "crypto";

/** HMAC-sign a value using SITE_PASSWORD as key (server-only). */
function signAccessToken(value: string): string {
  const secret = process.env.SITE_PASSWORD ?? "fallback-dev-secret";
  return createHmac("sha256", secret).update(value).digest("hex");
}

/** Value we HMAC so the cookie can't be forged by knowing its name alone. */
const TOKEN_PAYLOAD = "apnamap_access_v1";

export async function POST(req: NextRequest) {
  try {
    const blocked = await checkRate(req, "unlock");
    if (blocked) return blocked;

    const { password } = await req.json();

    if (!process.env.SITE_PASSWORD) {
      return NextResponse.json(
        { message: "SITE_PASSWORD is not set on server" },
        { status: 500 }
      );
    }

    if (password !== process.env.SITE_PASSWORD) {
      return NextResponse.json(
        { message: "Invalid password" },
        { status: 401 }
      );
    }

    const res = NextResponse.json({ success: true });

    // Store HMAC signature instead of plain "granted" — unforgeable without SITE_PASSWORD
    res.cookies.set("apnamap_access", signAccessToken(TOKEN_PAYLOAD), {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      path:     "/",
      maxAge:   60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch {
    return NextResponse.json(
      { message: "Bad request" },
      { status: 400 }
    );
  }
}