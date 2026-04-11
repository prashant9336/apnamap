import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set(name, value, options);
        },
        remove(name: string, options: any) {
          response.cookies.set(name, "", { ...options, maxAge: 0 });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // 🔥 IMPORTANT: profiles table first, metadata second
  let role: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    // ONLY trust profiles.role — the server-managed source of truth.
    // user_metadata is user-settable and must never gate access control.
    role = profile?.role ?? "customer";
  }

  if (path.startsWith("/vendor")) {
    // Fully public vendor paths — no auth required at all
    const publicVendorPaths = [
      "/vendor/join",
      "/vendor/login",
      "/vendor/set-password",
    ];
    if (publicVendorPaths.some((p) => path.startsWith(p))) {
      return response; // let through with no checks
    }

    // Everything else under /vendor requires a session
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("redirect", path);
      return NextResponse.redirect(url);
    }

    // These paths are open to any logged-in user (role upgrade flows)
    const openVendorPaths = ["/vendor/onboarding", "/vendor/claim"];
    if (!openVendorPaths.some((p) => path.startsWith(p))) {
      if (role !== "vendor" && role !== "admin") {
        return NextResponse.redirect(new URL("/vendor/onboarding", request.url));
      }
    }
  }

  if (path.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("redirect", path);
      return NextResponse.redirect(url);
    }

    if (role !== "admin") {
      return NextResponse.redirect(new URL("/explore", request.url));
    }
  }

  return response;
}