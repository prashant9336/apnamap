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

    role =
      profile?.role ||
      user.user_metadata?.role ||
      user.app_metadata?.role ||
      "customer";
  }

  if (path.startsWith("/vendor")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("redirect", path);
      return NextResponse.redirect(url);
    }

    // These paths are fully public — no auth or vendor role required
    const openVendorPaths = [
      "/vendor/onboarding",
      "/vendor/claim",
      "/vendor/join",        // vendor request form (pre-auth)
      "/vendor/login",       // vendor mobile+password login
      "/vendor/set-password", // password setup after admin approval
    ];
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