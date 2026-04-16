import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Admin layout — server component that enforces admin-only access.
 *
 * This runs once per admin page load (not on every request like middleware).
 * The profiles.role check was moved here FROM middleware to eliminate the
 * per-request DB query that was causing MIDDLEWARE_INVOCATION_TIMEOUT errors.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/admin/dashboard");
  }

  // Use admin client for the role lookup so RLS never blocks it
  const adminSb = createAdminClient();
  const { data: profile } = await adminSb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role ?? "customer";

  if (role !== "admin") {
    redirect("/explore");
  }

  return <>{children}</>;
}
