import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_FILE = /\.(.*)$/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow Next internals, images/files, favicon, and unlock routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/unlock") ||
    pathname.startsWith("/api/unlock") ||
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
    /*
     * Match all request paths except:
     * - _next/static
     * - _next/image
     * - favicon.ico
     * - common image files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};