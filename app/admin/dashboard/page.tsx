"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminDashboard() {
  const [stats,         setStats]         = useState<any>(null);
  const [pendingShops,  setPendingShops]  = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const router   = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") { router.push("/"); return; }

      const [statsRes, shopsRes] = await Promise.all([
        fetch("/api/admin").then((r) => r.json()),
        supabase.from("shops").select("*, category:categories(name,icon), locality:localities(name), vendor:vendors(id)").eq("is_approved", false).order("created_at", { ascending: false }),
      ]);

      setStats(statsRes);
      setPendingShops(shopsRes.data ?? []);
      setLoading(false);
    });
  }, [router, supabase]);

  async function handleShop(shopId: string, action: "approve" | "reject") {
    setActionLoading(shopId);
    await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_id: shopId, action }) });
    setPendingShops((prev) => prev.filter((s) => s.id !== shopId));
    setActionLoading(null);
    if (stats) setStats((s: any) => ({ ...s, pending_shops: s.pending_shops - 1 }));
  }

  if (loading) return (
    <div className="min-h-screen p-4 space-y-3" style={{ background: "var(--bg)" }}>
      {[1,2,3].map((i) => <div key={i} className="h-24 rounded-2xl shimmer" />)}
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(5,7,12,0.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: "var(--accent)" }}>🛡️</div>
        <div className="flex-1">
          <p className="font-syne font-black text-base">Admin Panel</p>
          <p className="text-[10px]" style={{ color: "var(--t3)" }}>ApnaMap Management</p>
        </div>
      </div>

      <div className="px-4 py-4">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { label: "Total Shops",   value: stats.total_shops,   icon: "🏪", color: "var(--accent)" },
              { label: "Active Offers", value: stats.total_offers,  icon: "🎯", color: "var(--gold)"   },
              { label: "Total Users",   value: stats.total_users,   icon: "👤", color: "var(--green)"  },
              { label: "Pending Review",value: stats.pending_shops, icon: "⏳", color: "#f59e0b"       },
            ].map((s) => (
              <div key={s.label} className="p-4 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.034)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="text-2xl mb-2">{s.icon}</div>
                <div className="font-syne font-black text-2xl" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs mt-1" style={{ color: "var(--t3)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Pending shops */}
        <h2 className="font-syne font-bold text-base mb-3">
          ⏳ Pending Approval ({pendingShops.length})
        </h2>

        {pendingShops.length === 0 && (
          <div className="text-center py-10 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-3xl mb-2">✅</div>
            <p className="font-semibold text-sm">All caught up! No pending shops.</p>
          </div>
        )}

        <div className="space-y-3">
          {pendingShops.map((shop) => (
            <div key={shop.id} className="p-4 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.034)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl">{shop.category?.icon ?? "🏪"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-syne font-bold text-sm">{shop.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>
                    {shop.category?.name} · {shop.locality?.name}
                  </p>
                  {shop.description && (
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--t2)" }}>{shop.description}</p>
                  )}
                  {shop.address && (
                    <p className="text-xs mt-1" style={{ color: "var(--t3)" }}>📍 {shop.address}</p>
                  )}
                  {shop.phone && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>📞 {shop.phone}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleShop(shop.id, "reject")}
                  disabled={actionLoading === shop.id}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                  ✕ Reject
                </button>
                <button onClick={() => handleShop(shop.id, "approve")}
                  disabled={actionLoading === shop.id}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: actionLoading === shop.id ? "rgba(31,187,90,0.4)" : "var(--green)" }}>
                  {actionLoading === shop.id ? "…" : "✓ Approve"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
