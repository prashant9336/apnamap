import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import VendorLoginForm from "./VendorLoginForm";

/**
 * Server component — checks auth before sending any HTML to the browser.
 * Already-logged-in vendors/admins are redirected before the login form renders,
 * eliminating the useEffect flash of the previous client-only approach.
 */
export default async function VendorLoginPage() {
  let userId: string | null = null;
  try {
    const { data: { user } } = await createClient().auth.getUser();
    userId = user?.id ?? null;
  } catch { /* auth check failed — show login form */ }

  if (userId) redirect("/my-shop");

  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh", background: "#05070C" }} />}>
      <VendorLoginForm />
    </Suspense>
  );
}
