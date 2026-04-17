"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";
import VendorHome from "@/components/vendor/VendorHome";

export default function MyShopPage() {
  const [checked, setChecked] = useState(false);
  const router  = useRouter();

  useEffect(() => {
    let mounted = true;
    const sb = createClient();

    async function check() {
      try {
        const { data: { user } } = await sb.auth.getUser();
        if (!mounted) return;
        if (!user) { router.replace("/auth/login?redirect=/my-shop"); return; }

        // Always read role from profiles table (authoritative); user_metadata can be stale
        const { data: profile } = await sb
          .from("profiles").select("role").eq("id", user.id).maybeSingle();
        if (!mounted) return;

        const role = profile?.role ?? "customer";
        if (role !== "vendor" && role !== "admin") {
          router.replace("/vendor/onboarding");
          return;
        }
        setChecked(true);
      } catch {
        // Network error during auth — redirect to login as safe fallback
        if (mounted) router.replace("/auth/login?redirect=/my-shop");
      }
    }

    check();
    return () => { mounted = false; };
  }, [router]);

  if (!checked) {
    return (
      <AppShell activeTab="myshop">
        <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="shimmer" style={{ height: i === 1 ? 80 : 120, borderRadius: 16 }} />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activeTab="myshop">
      <VendorHome />
    </AppShell>
  );
}
