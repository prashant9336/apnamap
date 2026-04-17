import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

/**
 * Server component — checks auth before sending any HTML to the browser.
 * Already-authenticated users are redirected server-side to the correct
 * destination before the login form is ever rendered.
 *
 * IMPORTANT: redirect() throws internally (Next.js NEXT_REDIRECT).
 * It must NOT be called inside a try/catch or the redirect is swallowed.
 * Auth check is isolated to its own try/catch; redirect() calls are outside.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  const redirectTo = searchParams.redirect || "/explore";

  // Isolate the auth check in its own try/catch so redirect() stays outside.
  let userId: string | null = null;
  try {
    const { data: { user } } = await createClient().auth.getUser();
    userId = user?.id ?? null;
  } catch { /* auth check failed — show login form */ }

  if (userId) {
    let role = "customer";
    try {
      const { data: profile } = await createAdminClient()
        .from("profiles").select("role").eq("id", userId).maybeSingle();
      role = profile?.role ?? "customer";
    } catch { /* role check failed — treat as customer */ }

    // redirect() is outside any try/catch so it propagates correctly.
    if (role === "admin")  redirect("/admin/dashboard");
    if (role === "vendor") redirect("/my-shop");
    redirect(redirectTo);
  }

  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh", background: "#05070C" }} />}>
      <LoginForm redirectTo={redirectTo} />
    </Suspense>
  );
}
