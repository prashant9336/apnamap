"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Filter = "all" | "live" | "pending" | "no_offer";

interface ShopRow {
  id: string;
  name: string;
  slug: string;
  phone: string;
  is_approved: boolean;
  is_active: boolean;
  created_at: string;
  view_count: number;
  locality: { name: string } | null;
  category: { name: string; icon: string } | null;
  offers: { id: string; is_active: boolean; source_type: string }[];
}

export default function SalesDashboard() {
  const [shops, setShops]     = useState<ShopRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<Filter>("all");
  const [search, setSearch]   = useState("");
  const [token, setToken]     = useState<string | null>(null);

  // Resolve token once on mount
  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null);
    });
  }, []);

  useEffect(() => {
    if (token === null) return;

    fetch("/api/sales/shops", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setShops(d.shops ?? []); setLoading(false); });
  }, [token]);

  const filtered = useMemo(() => {
    let list = shops;

    if (filter === "live")     list = list.filter(s => s.is_active && s.is_approved);
    if (filter === "pending")  list = list.filter(s => !s.is_approved);
    if (filter === "no_offer") list = list.filter(s =>
      !s.offers.some(o => o.is_active && o.source_type !== "auto_generated")
    );

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.locality?.name.toLowerCase().includes(q) ||
        s.phone.includes(q)
      );
    }

    return list;
  }, [shops, filter, search]);

  const stats = useMemo(() => ({
    total:    shops.length,
    live:     shops.filter(s => s.is_active && s.is_approved).length,
    pending:  shops.filter(s => !s.is_approved).length,
    no_offer: shops.filter(s => !s.offers.some(o => o.is_active && o.source_type !== "auto_generated")).length,
  }), [shops]);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>

      {/* Header */}
      <div
        className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3"
        style={{
          background: "rgba(5,7,12,0.96)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <p className="font-syne font-black text-base flex-1">My Onboarded Shops</p>
        <Link
          href="/sales/onboard"
          className="px-3 py-1.5 rounded-full text-xs font-bold text-white"
          style={{ background: "var(--accent)" }}
        >
          + Add Shop
        </Link>
      </div>

      {/* Stats bar */}
      <div className="px-4 pt-4 grid grid-cols-4 gap-2">
        {[
          { label: "Total",   value: stats.total,    key: "all"      },
          { label: "Live",    value: stats.live,     key: "live"     },
          { label: "Pending", value: stats.pending,  key: "pending"  },
          { label: "No Offer",value: stats.no_offer, key: "no_offer" },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key as Filter)}
            className="py-2.5 rounded-xl text-center"
            style={{
              background: filter === s.key ? "var(--accent)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${filter === s.key ? "transparent" : "rgba(255,255,255,0.08)"}`,
            }}
          >
            <p className="font-black text-lg leading-none" style={{ color: filter === s.key ? "#fff" : "var(--t1)" }}>
              {loading ? "—" : s.value}
            </p>
            <p className="text-[9px] mt-0.5 font-semibold uppercase tracking-wide"
              style={{ color: filter === s.key ? "rgba(255,255,255,0.75)" : "var(--t3)" }}>
              {s.label}
            </p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-4 pt-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, area, or phone…"
          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.09)",
            color: "var(--t1)",
          }}
        />
      </div>

      {/* Shop list */}
      <div className="px-4 py-3 space-y-2.5">
        {loading && [1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 rounded-xl shimmer" />
        ))}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16" style={{ color: "var(--t2)" }}>
            <div className="text-4xl mb-3">📋</div>
            <p className="font-semibold text-sm">
              {shops.length === 0 ? "No shops onboarded yet" : "No shops match this filter"}
            </p>
            {shops.length === 0 && (
              <Link
                href="/sales/onboard"
                className="mt-4 inline-block px-4 py-2 rounded-full text-xs font-bold text-white"
                style={{ background: "var(--accent)" }}
              >
                Onboard your first shop
              </Link>
            )}
          </div>
        )}

        {!loading && filtered.map(shop => {
          const hasRealOffer = shop.offers.some(o => o.is_active && o.source_type !== "auto_generated");
          const isLive = shop.is_active && shop.is_approved;
          return (
            <div
              key={shop.id}
              className="p-3.5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.034)",
                border: `1px solid ${isLive ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)"}`,
                opacity: isLive ? 1 : 0.65,
              }}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">
                  {shop.category?.icon ?? "🏪"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={isLive
                        ? { background: "rgba(31,187,90,0.12)", color: "var(--green)" }
                        : { background: "rgba(255,255,255,0.06)", color: "var(--t3)" }}
                    >
                      {isLive ? "● Live" : "○ Pending"}
                    </span>
                    {!hasRealOffer && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(255,94,26,0.12)", color: "var(--accent)" }}>
                        No offer
                      </span>
                    )}
                  </div>

                  <p className="font-bold text-sm line-clamp-1">{shop.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>
                    {shop.category?.name}{shop.locality ? ` · ${shop.locality.name}` : ""}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>
                    {shop.phone}
                    {shop.view_count > 0 && (
                      <span className="ml-2">{shop.view_count} views</span>
                    )}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <p className="text-[9px]" style={{ color: "var(--t3)" }}>
                    {new Date(shop.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                  <Link
                    href={`/shop/${shop.slug}`}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold"
                    style={{ background: "rgba(255,255,255,0.06)", color: "var(--t2)" }}
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
