import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Wraps a promise with a hard timeout so a slow Supabase response
 * never blocks the Edge Runtime long enough to trigger MIDDLEWARE_INVOCATION_TIMEOUT.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)
    ),
  ]);
}

export async function updateSession(request: NextRequest) {
  // Default: always allow the request through.
  // If anything below errors or times out, this is what gets returned.
  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            // Update request so server components see refreshed tokens,
            // then re-create response so it carries the updated request.
            request.cookies.set(name, value);
            response = NextResponse.next({ request });
            response.cookies.set(name, value, options);
          },
          remove(name: string, options: any) {
            request.cookies.set(name, "");
            response = NextResponse.next({ request });
            response.cookies.set(name, "", { ...options, maxAge: 0 });
          },
        },
      }
    );

    const path = request.nextUrl.pathname;

    // ── Public vendor paths — no auth check needed, return immediately ──
    const publicVendorPaths = [
      "/vendor/join",
      "/vendor/login",
      "/vendor/set-password",
    ];
    if (publicVendorPaths.some((p) => path.startsWith(p))) {
      return response;
    }

    // ── Validate session — single network call with hard 3-second timeout ──
    // getUser() re-validates the JWT with Supabase auth servers and refreshes
    // the session cookie when near expiry. The 3s timeout ensures this call
    // cannot block the Edge Runtime long enough to cause a 504.
    //
    // The profiles.role DB query was deliberately removed from middleware.
    // Role-based access control is enforced in:
    //   - /app/admin/layout.tsx  (admin routes)
    //   - individual vendor pages (vendor routes)
    //   - all API route handlers  (every protected endpoint)
    const {
      data: { user },
    } = await withTimeout(supabase.auth.getUser(), 3000);

    // ── Vendor route protection — session existence only ──
    if (path.startsWith("/vendor")) {
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/login";
        url.searchParams.set("redirect", path);
        return NextResponse.redirect(url);
      }
      // Role check (vendor vs admin vs customer) happens in individual pages —
      // not here. Middleware only enforces "you must be logged in."
    }

    // ── Admin route protection — session existence only ──
    if (path.startsWith("/admin")) {
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/login";
        url.searchParams.set("redirect", path);
        return NextResponse.redirect(url);
      }
      // Role check (admin only) happens in app/admin/layout.tsx —
      // not here. This keeps middleware at zero DB queries.
    }

    return response;
  } catch {
    // Supabase timed out or threw — allow the request through.
    // Every API route and page has its own auth/role checks, so
    // a middleware pass-through on error does not open a security hole.
    return response;
  }
}
