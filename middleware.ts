import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_FILE = /\.(.*)$/;

/** HMAC-SHA256 using Web Crypto API (Edge Runtime compatible). */
async function isValidAccessCookie(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  const secret  = process.env.SITE_PASSWORD ?? "fallback-dev-secret";
  const enc     = new TextEncoder();
  const key     = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig     = await crypto.subtle.sign("HMAC", key, enc.encode("apnamap_access_v1"));
  const expected = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  return cookieValue === expected;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow Next internals, images/files, favicon, auth routes, unlock routes,
  // and vendor public routes (join, login, set-password — no unlock cookie needed)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/unlock") ||
    pathname.startsWith("/api/unlock") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/vendor/join") ||
    pathname.startsWith("/vendor/login") ||
    pathname.startsWith("/vendor/set-password") ||
    pathname.startsWith("/api/vendor/register") ||
    pathname.startsWith("/api/vendor/activate") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/analytics") ||
    pathname.startsWith("/api/shops") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return await updateSession(request);
  }

  // Check private access cookie (HMAC-signed value)
  const isUnlocked = await isValidAccessCookie(
    request.cookies.get("apnamap_access")?.value
  );

  // If not unlocked, send to password page
  if (!isUnlocked) {
    const url = request.nextUrl.clone();
    url.pathname = "/unlock";
    return NextResponse.redirect(url);
  }

  // Keep Supabase session logic working
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
