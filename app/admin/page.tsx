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
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        window.location.href = "/auth/login?redirect=/admin";
        return;
      }

      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const role =
        profile?.role ||
        user.user_metadata?.role ||
        user.app_metadata?.role ||
        "customer";

      if (profileErr) {
        setError(profileErr.message);
        setLoading(false);
        return;
      }

      if (role !== "admin") {
        setError("Forbidden");
        setLoading(false);
        return;
      }

      const { data: shopData, error: shopErr } = await supabase
        .from("shops")
        .select(`
          id,
          name,
          slug,
          vendor_id,
          is_approved,
          is_active,
          created_at,
          phone,
          address,
          category:categories(name, icon),
          locality:localities(name)
        `)
        .order("created_at", { ascending: false });

      if (shopErr) {
        setError(shopErr.message);
        setLoading(false);
        return;
      }

      setShops((shopData ?? []) as Shop[]);
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
      inactive: shops.filter((s) => !s.is_active).length,
    };
  }, [shops]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

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

      const haystack = [
        shop.name,
        shop.slug,
        shop.address,
        shop.phone,
        shop.vendor_id,
        shop.category?.name,
        shop.locality?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [shops, filter, query]);

  async function updateShop(
    shopId: string,
    action: "approve" | "reject" | "toggle_active"
  ) {
    setBusyId(shopId);
    setError("");

    const current = shops.find((s) => s.id === shopId);
    if (!current) {
      setBusyId(null);
      return;
    }

    let updates: Record<string, unknown> = {};

    if (action === "approve") {
      updates = { is_approved: true, is_active: true };
    } else if (action === "reject") {
      updates = { is_approved: false, is_active: false };
    } else if (action === "toggle_active") {
      updates = { is_active: !current.is_active };
    }

    const { error: updateErr } = await supabase
      .from("shops")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", shopId);

    if (updateErr) {
      setError(updateErr.message);
      setBusyId(null);
      return;
    }

    setShops((prev) =>
      prev.map((shop) =>
        shop.id === shopId ? ({ ...shop, ...updates } as Shop) : shop
      )
    );

    setBusyId(null);
  }

  async function approveAllPending() {
    const pendingIds = shops.filter((s) => !s.is_approved).map((s) => s.id);

    if (pendingIds.length === 0) return;

    setBulkBusy(true);
    setError("");

    const { error: bulkErr } = await supabase
      .from("shops")
      .update({
        is_approved: true,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .in("id", pendingIds);

    if (bulkErr) {
      setError(bulkErr.message);
      setBulkBusy(false);
      return;
    }

    setShops((prev) =>
      prev.map((shop) =>
        !shop.is_approved
          ? { ...shop, is_approved: true, is_active: true }
          : shop
      )
    );

    setBulkBusy(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 space-y-4" style={{ background: "var(--bg)" }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)" }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div
        className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3"
        style={{
          background: "rgba(5,7,12,0.96)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Link href="/profile" className="text-xl">
          ←
        </Link>
        <div className="flex-1">
          <p className="font-syne font-black text-base">Admin Panel</p>
          <p className="text-[10px]" style={{ color: "var(--t3)" }}>
            Approve shops and control listings
          </p>
        </div>
      </div>

      <div className="px-4 py-4">
        {error && (
          <div
            className="mb-4 p-3 rounded-xl text-sm"
            style={{
              background: "rgba(239,68,68,0.1)",
              color: "#f87171",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { label: "Total", value: stats.total, icon: "🏪" },
            { label: "Approved", value: stats.approved, icon: "✅" },
            { label: "Pending", value: stats.pending, icon: "⏳" },
            { label: "Active", value: stats.active, icon: "🟢" },
          ].map((card) => (
            <div
              key={card.label}
              className="p-3 rounded-xl text-center"
              style={{
                background: "rgba(255,255,255,0.034)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="text-lg mb-1">{card.icon}</div>
              <div className="font-syne font-black text-lg">{card.value}</div>
              <div className="text-[9px]" style={{ color: "var(--t3)" }}>
                {card.label}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-4 space-y-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by shop, locality, category, vendor id..."
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "var(--t1)",
            }}
          />

          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "All" },
              { key: "pending", label: "Pending" },
              { key: "approved", label: "Approved" },
              { key: "inactive", label: "Inactive" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as FilterKey)}
                className="px-3 py-2 rounded-full text-xs font-semibold"
                style={
                  filter === f.key
                    ? { background: "var(--accent)", color: "#fff" }
                    : {
                        background: "rgba(255,255,255,0.05)",
                        color: "var(--t2)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }
                }
              >
                {f.label}
              </button>
            ))}

            <button
              onClick={approveAllPending}
              disabled={bulkBusy || stats.pending === 0}
              className="px-3 py-2 rounded-full text-xs font-semibold ml-auto"
              style={{
                background: "rgba(31,187,90,0.1)",
                border: "1px solid rgba(31,187,90,0.25)",
                color: "var(--green)",
                opacity: bulkBusy || stats.pending === 0 ? 0.5 : 1,
              }}
            >
              {bulkBusy ? "Approving..." : `Approve All Pending (${stats.pending})`}
            </button>
          </div>
        </div>

        <div className="mb-3 text-xs" style={{ color: "var(--t3)" }}>
          Showing {filtered.length} of {shops.length} shops
        </div>

        <div className="space-y-3">
          {filtered.map((shop) => (
            <div
              key={shop.id}
              className="p-4 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.034)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-2">
                  <div className="text-xl mt-0.5">{shop.category?.icon ?? "🏪"}</div>
                  <div>
                    <p className="font-syne font-bold text-sm">{shop.name}</p>
                    <p className="text-xs" style={{ color: "var(--t3)" }}>
                      {shop.category?.name ?? "Shop"} · {shop.locality?.name ?? "Unknown locality"}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: "var(--t3)" }}>
                      {shop.address || "No address"}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--t3)" }}>
                      Vendor: {shop.vendor_id}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1 items-end">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={
                      shop.is_approved
                        ? {
                            background: "rgba(31,187,90,0.13)",
                            color: "var(--green)",
                          }
                        : {
                            background: "rgba(232,168,0,0.12)",
                            color: "var(--gold)",
                          }
                    }
                  >
                    {shop.is_approved ? "✓ Approved" : "⏳ Pending"}
                  </span>

                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={
                      shop.is_active
                        ? {
                            background: "rgba(31,187,90,0.13)",
                            color: "var(--green)",
                          }
                        : {
                            background: "rgba(255,255,255,0.06)",
                            color: "var(--t3)",
                          }
                    }
                  >
                    {shop.is_active ? "Live" : "Inactive"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  disabled={busyId === shop.id}
                  onClick={() => updateShop(shop.id, "approve")}
                  className="py-2 rounded-lg text-xs font-semibold"
                  style={{
                    background: "rgba(31,187,90,0.1)",
                    border: "1px solid rgba(31,187,90,0.25)",
                    color: "var(--green)",
                    opacity: busyId === shop.id ? 0.5 : 1,
                  }}
                >
                  Approve
                </button>

                <button
                  disabled={busyId === shop.id}
                  onClick={() => updateShop(shop.id, "reject")}
                  className="py-2 rounded-lg text-xs font-semibold"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.18)",
                    color: "#f87171",
                    opacity: busyId === shop.id ? 0.5 : 1,
                  }}
                >
                  Reject
                </button>

                <button
                  disabled={busyId === shop.id}
                  onClick={() => updateShop(shop.id, "toggle_active")}
                  className="py-2 rounded-lg text-xs font-semibold"
                  style={{
                    background: "rgba(255,94,26,0.1)",
                    border: "1px solid rgba(255,94,26,0.22)",
                    color: "var(--accent)",
                    opacity: busyId === shop.id ? 0.5 : 1,
                  }}
                >
                  {shop.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}