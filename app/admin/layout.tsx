import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Admin layout — server component that enforces admin-only access.
 *
 * Each Supabase call is individually wrapped in try/catch so a transient
 * network error or SDK exception produces a clean redirect rather than an
 * uncaught throw that Next.js would surface as "Application error".
 *
 * The profiles.role check lives here (not middleware) to keep middleware
 * at zero DB queries and avoid MIDDLEWARE_INVOCATION_TIMEOUT.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Step 1: validate session — any exception → redirect to login
  let userId: string | null = null;
  try {
    const { data } = await createClient().auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    redirect("/auth/login?redirect=/admin/dashboard");
  }

  if (!userId) redirect("/auth/login?redirect=/admin/dashboard");

  // Step 2: role check via admin client (bypasses RLS) — any exception → redirect
  let role = "customer";
  try {
    const { data: profile } = await createAdminClient()
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    role = profile?.role ?? "customer";
  } catch {
    // DB error or missing service role key — fail closed
    redirect("/auth/login?redirect=/admin/dashboard");
  }

  if (role !== "admin") redirect("/explore");

  return <>{children}</>;
}
