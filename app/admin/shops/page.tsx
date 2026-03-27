"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type FilterTab = "pending" | "approved" | "all";

export default function AdminShopsPage() {
  const [shops,   setShops]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<FilterTab>("pending");
  const [acting,  setActing]  = useState<string | null>(null);
  const supabase = createClient();

  async function load(filter: FilterTab) {
    setLoading(true);
    let q = supabase
      .from("shops")
      .select("*, category:categories(name,icon), locality:localities(name), vendor:vendors(id)")
      .order("created_at", { ascending: false });

    if (filter === "pending")  q = q.eq("is_approved", false);
    if (filter === "approved") q = q.eq("is_approved", true);

    const { data } = await q.limit(50);
    setShops(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(tab); }, [tab]);

  async function approve(shopId: string) {
    setActing(shopId);
    await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_id: shopId, action: "approve" }) });
    setShops((p) => p.filter((s) => s.id !== shopId));
    setActing(null);
  }

  async function reject(shopId: string) {
    setActing(shopId);
    await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_id: shopId, action: "reject" }) });
    setShops((p) => p.filter((s) => s.id !== shopId));
    setActing(null);
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(5,7,12,0.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/admin/dashboard" className="text-xl">←</Link>
        <p className="font-syne font-black text-base flex-1">Shop Management</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {(["pending", "approved", "all"] as FilterTab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all"
            style={tab === t
              ? { background: "var(--accent)", color: "#fff" }
              : { background: "rgba(255,255,255,0.05)", color: "var(--t2)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {t}
          </button>
        ))}
      </div>

      <div className="px-4 py-3 space-y-3">
        {loading && [1,2,3].map((i) => <div key={i} className="h-28 rounded-2xl shimmer" />)}

        {!loading && shops.length === 0 && (
          <div className="text-center py-16" style={{ color: "var(--t2)" }}>
            <div className="text-4xl mb-3">✅</div>
            <p className="font-semibold">No shops in this category</p>
          </div>
        )}

        {!loading && shops.map((shop) => (
          <div key={shop.id} className="p-4 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.034)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl flex-shrink-0">{shop.category?.icon ?? "🏪"}</span>
              <div className="flex-1 min-w-0">
                <p className="font-syne font-bold text-sm">{shop.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>
                  {shop.category?.name} · {shop.locality?.name}
                </p>
                {shop.address && <p className="text-xs mt-1" style={{ color: "var(--t3)" }}>📍 {shop.address}</p>}
                {shop.phone && <p className="text-xs" style={{ color: "var(--t3)" }}>📞 {shop.phone}</p>}
                {shop.description && (
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--t2)" }}>{shop.description}</p>
                )}
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={shop.is_approved
                  ? { background: "rgba(31,187,90,0.13)", color: "var(--green)" }
                  : { background: "rgba(232,168,0,0.12)", color: "var(--gold)" }}>
                {shop.is_approved ? "✓ Live" : "⏳ Pending"}
              </span>
            </div>
            {tab === "pending" && (
              <div className="flex gap-2">
                <button onClick={() => reject(shop.id)} disabled={acting === shop.id}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "rgba(239,68,68,0.09)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                  ✕ Reject
                </button>
                <button onClick={() => approve(shop.id)} disabled={acting === shop.id}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: acting === shop.id ? "rgba(31,187,90,0.4)" : "var(--green)" }}>
                  {acting === shop.id ? "…" : "✓ Approve"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
