import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_FILE = /\.(.*)$/;

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
    pathname.startsWith("/api/vendor/request") ||
    pathname.startsWith("/api/vendor/activate") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return await updateSession(request);
  }

  // Check private access cookie
  const isUnlocked =
    request.cookies.get("apnamap_access")?.value === "granted";

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
