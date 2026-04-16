import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_FILE = /\.(.*)$/;

/** HMAC-SHA256 using Web Crypto API (Edge Runtime compatible). Pure crypto — no network call. */
async function isValidAccessCookie(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  try {
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
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow Next internals, static files, and routes that must bypass both
  // the access-cookie gate and Supabase session handling
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
    // updateSession is wrapped in try/catch internally — safe to call directly
    return await updateSession(request);
  }

  // Check private access cookie (HMAC-signed, pure crypto — no network call)
  const isUnlocked = await isValidAccessCookie(
    request.cookies.get("apnamap_access")?.value
  );

  if (!isUnlocked) {
    const url = request.nextUrl.clone();
    url.pathname = "/unlock";
    return NextResponse.redirect(url);
  }

  // Supabase session handling — updateSession has its own timeout + fail-safe
  try {
    return await updateSession(request);
  } catch {
    // If updateSession somehow throws (shouldn't — it has internal try/catch),
    // allow the request through rather than returning a 504
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
