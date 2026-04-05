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
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/auth/login?redirect=/my-shop");
        return;
      }
      const role = user.user_metadata?.role ?? "customer";
      if (role !== "vendor" && role !== "admin") {
        // Send them to onboarding to become a vendor
        router.replace("/vendor/onboarding");
        return;
      }
      setChecked(true);
    });
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
