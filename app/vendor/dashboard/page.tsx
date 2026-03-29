"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Shop = {
  id: string;
  name: string;
  slug: string;
  vendor_id: string;
  is_approved: boolean;
  is_active: boolean;
  avg_rating?: number | null;
  review_count?: number | null;
  created_at: string;
  phone?: string | null;
  address?: string | null;
  offers?: any[];
  category?: { name?: string; slug?: string; icon?: string; color?: string };
  locality?: { name?: string; slug?: string };
};

type FilterKey = "all" | "pending" | "live" | "inactive";

export default function VendorDashboard() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [stats, setStats] = useState({
    total_views: 0,
    total_calls: 0,
    total_whatsapp: 0,
    total_saves: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        router.push("/auth/login");
        return;
      }

      const { data: shopData, error: shopErr } = await supabase
        .from("shops")
        .select(`
          *,
          offers(*),
          category:categories(name,slug,icon,color),
          locality:localities(name,slug)
        `)
        .eq("vendor_id", user.id)
        .order("created_at", { ascending: false });

      if (shopErr) {
        setError(shopErr.message);
        setLoading(false);
        return;
      }

      const safeShops = (shopData ?? []) as Shop[];
      setShops(safeShops);

      const shopIds = safeShops.map((s) => s.id);

      if (shopIds.length > 0) {
        const { data: analytics } = await supabase
          .from("analytics_events")
          .select("event_type, shop_id")
          .in("shop_id", shopIds);

        const events = analytics ?? [];

        setStats({
          total_views: events.filter((e: any) => e.event_type === "view").length,
          total_calls: events.filter((e: any) => e.event_type === "call").length,
          total_whatsapp: events.filter((e: any) => e.event_type === "whatsapp").length,
          total_saves: events.filter((e: any) => e.event_type === "save").length,
        });
      } else {
        setStats({
          total_views: 0,
          total_calls: 0,
          total_whatsapp: 0,
          total_saves: 0,
        });
      }

      setLoading(false);
    }

    loadDashboard();
  }, [router, supabase]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return shops.filter((shop) => {
      const statusMatch =
        filter === "all"
          ? true
          : filter === "pending"
          ? !shop.is_approved
          : filter === "live"
          ? shop.is_approved && shop.is_active
          : !shop.is_active;

      if (!statusMatch) return false;

      if (!q) return true;

      const haystack = [
        shop.name,
        shop.address,
        shop.phone,
        shop.category?.name,
        shop.locality?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [shops, filter, query]);

  const summary = useMemo(() => {
    return {
      total: shops.length,
      pending: shops.filter((s) => !s.is_approved).length,
      live: shops.filter((s) => s.is_approved && s.is_active).length,
      inactive: shops.filter((s) => !s.is_active).length,
    };
  }, [shops]);

  if (loading) {
    return (
      <div className="min-h-screen p-4 space-y-3" style={{ background: "var(--bg)" }}>
        {[1, 2, 3].map((i) => (
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
        className="sticky top-0 z-50 flex items-center gap-3 px-4 py-3"
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
          <p className="font-syne font-black text-base leading-tight">Vendor Dashboard</p>
          <p className="text-[10px]" style={{ color: "var(--t3)" }}>
            Manage your shops, offers and status
          </p>
        </div>
        <Link
          href="/vendor/onboarding"
          className="px-3 py-1.5 rounded-full text-xs font-bold text-white"
          style={{ background: "var(--accent)" }}
        >
          + Add Shop
        </Link>
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
            { label: "Views", value: stats.total_views, icon: "👁" },
            { label: "Calls", value: stats.total_calls, icon: "📞" },
            { label: "WhatsApp", value: stats.total_whatsapp, icon: "💬" },
            { label: "Saves", value: stats.total_saves, icon: "❤️" },
          ].map((s) => (
            <div
              key={s.label}
              className="p-3 rounded-xl text-center"
              style={{
                background: "rgba(255,255,255,0.034)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="font-syne font-black text-lg">{s.value}</div>
              <div className="text-[9px]" style={{ color: "var(--t3)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-4 space-y-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by shop, area, phone..."
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "var(--t1)",
            }}
          />

          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: `All (${summary.total})` },
              { key: "pending", label: `Pending (${summary.pending})` },
              { key: "live", label: `Live (${summary.live})` },
              { key: "inactive", label: `Inactive (${summary.inactive})` },
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
          </div>
        </div>

        <h2 className="font-syne font-bold text-base mb-3">My Shops</h2>

        {filtered.length === 0 && !error && (
          <div
            className="text-center py-12 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px dashed rgba(255,255,255,0.1)",
            }}
          >
            <div className="text-4xl mb-3">🏪</div>
            <p className="font-semibold mb-2">No shops found</p>
            <p className="text-sm mb-4" style={{ color: "var(--t2)" }}>
              Try another filter or add your first shop
            </p>
            <Link
              href="/vendor/onboarding"
              className="px-6 py-2.5 rounded-full text-sm font-bold text-white"
              style={{ background: "var(--accent)" }}
            >
              Add My Shop
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((shop) => {
            const activeOffers = shop.offers?.filter((o: any) => o.is_active) ?? [];
            const topTier =
              activeOffers.find((o: any) => o.tier === 1) ||
              activeOffers.find((o: any) => o.tier === 2) ||
              activeOffers.find((o: any) => o.tier === 3) ||
              null;

            return (
              <div
                key={shop.id}
                className="p-4 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.034)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{shop.category?.icon ?? "🏪"}</span>
                    <div>
                      <p className="font-syne font-bold text-sm">{shop.name}</p>
                      <p className="text-xs" style={{ color: "var(--t3)" }}>
                        {shop.locality?.name ?? "Unknown locality"}
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

                <div
                  className="flex flex-wrap items-center gap-3 mb-3 text-xs"
                  style={{ color: "var(--t2)" }}
                >
                  <span>🎯 {activeOffers.length} active offers</span>
                  <span>
                    ⭐ {(shop.avg_rating ?? 0).toFixed(1)} ({shop.review_count ?? 0} reviews)
                  </span>
                  {topTier && (
                    <span style={{ color: "var(--accent)" }}>
                      🔥 Top offer: {topTier.title}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Link
                    href={`/vendor/shop?id=${shop.id}`}
                    className="py-2 rounded-lg text-xs font-semibold text-center"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "var(--t1)",
                    }}
                  >
                    Edit Shop
                  </Link>

                  <Link
                    href={`/vendor/offers?shop_id=${shop.id}`}
                    className="py-2 rounded-lg text-xs font-semibold text-center"
                    style={{
                      background: "rgba(255,94,26,0.1)",
                      border: "1px solid rgba(255,94,26,0.22)",
                      color: "var(--accent)",
                    }}
                  >
                    Manage Offers
                  </Link>

                  <Link
                    href={`/shop/${shop.slug}`}
                    className="py-2 rounded-lg text-xs font-semibold text-center"
                    style={{
                      background: "rgba(31,187,90,0.1)",
                      border: "1px solid rgba(31,187,90,0.25)",
                      color: "var(--green)",
                    }}
                  >
                    View Live
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}