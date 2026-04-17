import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

/**
 * Server component — checks auth before sending any HTML to the browser.
 * Already-authenticated users are redirected server-side to the correct
 * destination before the login form is ever rendered, eliminating the
 * "form flash → client redirect" flicker.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  const redirectTo = searchParams.redirect || "/explore";

  try {
    const { data: { user } } = await createClient().auth.getUser();
    if (user) {
      let role = "customer";
      try {
        const { data: profile } = await createAdminClient()
          .from("profiles").select("role").eq("id", user.id).maybeSingle();
        role = profile?.role ?? "customer";
      } catch { /* ignore role check failure — treat as customer */ }

      if (role === "admin")  redirect("/admin/dashboard");
      if (role === "vendor") redirect("/my-shop");
      redirect(redirectTo);
    }
  } catch { /* auth check failed — show login form */ }

  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh", background: "#05070C" }} />}>
      <LoginForm redirectTo={redirectTo} />
    </Suspense>
  );
}
