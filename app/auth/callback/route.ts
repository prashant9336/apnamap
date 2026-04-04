import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * /auth/callback
 *
 * Handles Supabase auth code exchange for:
 *  - Email magic links
 *  - OAuth providers (Google, etc.)
 *  - PKCE flows
 *
 * OTP phone flow does NOT use this route (it completes client-side
 * via supabase.auth.verifyOtp). This route is a safety net for
 * any server-side redirect that Supabase issues.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code     = searchParams.get("code");
  const next     = searchParams.get("next") ?? "/explore";
  // Where to send the user after auth
  const redirectTo = next.startsWith("/") ? `${origin}${next}` : `${origin}/explore`;

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(redirectTo);
    }

    // Exchange failed — redirect to login with error context
    return NextResponse.redirect(
      `${origin}/auth/login?error=auth_callback_failed`
    );
  }

  // No code — redirect to login
  return NextResponse.redirect(`${origin}/auth/login`);
}
