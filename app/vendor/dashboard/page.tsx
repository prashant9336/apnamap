"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirects the old /vendor/dashboard route to the new /my-shop page.
 * Kept for backwards compat with bookmarks / existing links.
 */
export default function VendorDashboardRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/my-shop"); }, [router]);
  return null;
}
