"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Shop = {
  id: string;
  name: string;
  slug: string;
  vendor_id: string;
  is_approved: boolean;
  is_active: boolean;
  created_at: string;
  phone?: string | null;
  address?: string | null;
  category?: { name?: string; icon?: string };
  locality?: { name?: string };
  vendor?: {
    name?: string | null;
    email?: string | null;
  };
};

type FilterKey = "all" | "pending" | "approved" | "inactive";

export default function AdminPage() {
  const supabase = createClient();

  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/auth/login?redirect=/admin";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const role =
        profile?.role ||
        user.user_metadata?.role ||
        user.app_metadata?.role ||
        "customer";

      if (role !== "admin") {
        setError("Forbidden");
        setLoading(false);
        return;
      }

      // ✅ STEP 1: fetch shops (NO JOIN)
      const { data: shopData, error: shopErr } = await supabase
        .from("shops")
        .select("*")
        .order("created_at", { ascending: false });

      if (shopErr) {
        setError(shopErr.message);
        setLoading(false);
        return;
      }

      // ✅ STEP 2: fetch vendor profiles separately
     const vendorIds = Array.from(
  new Set((shopData ?? []).map((s: any) => s.vendor_id))
);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", vendorIds);

      const profileMap: any = {};
      profiles?.forEach((p: any) => {
        profileMap[p.id] = p;
      });

      // ✅ STEP 3: merge data
      const finalShops = (shopData ?? []).map((shop: any) => ({
        ...shop,
        vendor: profileMap[shop.vendor_id] || null,
      }));

      setShops(finalShops);
      setLoading(false);
    }

    load();
  }, [supabase]);

  const stats = useMemo(() => {
    return {
      total: shops.length,
      approved: shops.filter((s) => s.is_approved).length,
      pending: shops.filter((s) => !s.is_approved).length,
      active: shops.filter((s) => s.is_active).length,
    };
  }, [shops]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();

    return shops.filter((shop) => {
      const passFilter =
        filter === "all"
          ? true
          : filter === "pending"
          ? !shop.is_approved
          : filter === "approved"
          ? shop.is_approved
          : !shop.is_active;

      if (!passFilter) return false;

      if (!q) return true;

      return (
        shop.name?.toLowerCase().includes(q) ||
        shop.vendor?.name?.toLowerCase().includes(q) ||
        shop.vendor?.email?.toLowerCase().includes(q)
      );
    });
  }, [shops, filter, query]);

  async function updateShop(shopId: string, approve: boolean) {
    setBusyId(shopId);

    await supabase
      .from("shops")
      .update({
        is_approved: approve,
        is_active: approve,
      })
      .eq("id", shopId);

    setShops((prev) =>
      prev.map((s) =>
        s.id === shopId
          ? { ...s, is_approved: approve, is_active: approve }
          : s
      )
    );

    setBusyId(null);
  }

  async function approveAll() {
    setBulkBusy(true);

    const pending = shops.filter((s) => !s.is_approved).map((s) => s.id);

    if (pending.length === 0) return;

    await supabase
      .from("shops")
      .update({ is_approved: true, is_active: true })
      .in("id", pending);

    setShops((prev) =>
      prev.map((s) =>
        !s.is_approved ? { ...s, is_approved: true, is_active: true } : s
      )
    );

    setBulkBusy(false);
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">Admin Panel</h2>

      {/* Quick links */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        <Link
          href="/admin/onboard-vendor"
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, background: "rgba(255,94,26,0.10)", border: "1px solid rgba(255,94,26,0.30)", textDecoration: "none" }}
        >
          <span style={{ fontSize: 20 }}>⚡</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: "#FF5E1A", margin: 0 }}>Onboard Vendor</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", margin: 0 }}>Create shop + offer + credentials on the spot</p>
          </div>
          <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.40)", fontSize: 16 }}>→</span>
        </Link>
        <Link
          href="/admin/vendor-requests"
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", textDecoration: "none" }}
        >
          <span style={{ fontSize: 20 }}>🏪</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: "rgba(255,255,255,0.70)", margin: 0 }}>Vendor Requests</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0 }}>Review pending vendor onboarding requests</p>
          </div>
          <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.40)", fontSize: 16 }}>→</span>
        </Link>
      </div>

      <input
        placeholder="Search..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="border p-2 mb-4 w-full"
      />

      <button onClick={approveAll} className="mb-4">
        Approve All Pending
      </button>

      {filtered.map((shop) => (
        <div key={shop.id} className="border p-3 mb-3">
          <b>{shop.name}</b>

          <div>👤 {shop.vendor?.name || "Unknown"}</div>
          <div>📧 {shop.vendor?.email || shop.vendor_id}</div>

          <div>
            {shop.is_approved ? "✅ Approved" : "⏳ Pending"}
          </div>

          <button onClick={() => updateShop(shop.id, true)}>
            Approve
          </button>

          <button onClick={() => updateShop(shop.id, false)}>
            Reject
          </button>
        </div>
      ))}
    </div>
  );
}