"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useGeo } from "@/hooks/useGeo";
import AppShell from "@/components/layout/AppShell";
import { formatDistance } from "@/lib/geo/distance";
import { isShopOpen } from "@/lib/utils/cn";

const RADII = [500, 1000, 2000, 5000];

export default function NearMePage() {
  const { geo, detect }   = useGeo();
  const [shops,  setShops]  = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius]  = useState(2000);
  const [categories, setCategories] = useState<any[]>([]);
  const [selCat, setSelCat] = useState<string | null>(null);
  const [openOnly, setOpenOnly] = useState(false);

  // Load categories once
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []));
  }, []);

  // Fetch shops when GPS or radius changes
  useEffect(() => {
    if (!geo.lat || !geo.lng) return;
    setLoading(true);
    fetch(`/api/shops?lat=${geo.lat}&lng=${geo.lng}&radius=${radius}`)
      .then((r) => r.json())
      .then((d) => { setShops(d.shops ?? []); setLoading(false); });
  }, [geo.lat, geo.lng, radius]);

  const filtered = useMemo(() => {
    let list = shops;
    if (selCat) list = list.filter((s) => s.category?.slug === selCat || s.category?.id === selCat);
    if (openOnly) list = list.filter((s) =>
      s.open_time && s.close_time ? isShopOpen(s.open_time, s.close_time, s.open_days ?? []) : false
    );
    return list;
  }, [shops, selCat, openOnly]);

  return (
    <AppShell activeTab="walk">
      <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>

        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-syne font-black text-xl" style={{ letterSpacing: "-0.4px" }}>📍 Near Me</h1>
            <button onClick={detect}
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(31,187,90,0.09)", color: "var(--green)", border: "1px solid rgba(31,187,90,0.22)" }}>
              {geo.loading ? "Detecting…" : geo.locality ? `📍 ${geo.locality}` : "↺ Detect"}
            </button>
          </div>

          {/* Radius chips */}
          <div className="flex gap-2 mb-3">
            {RADII.map((r) => (
              <button key={r} onClick={() => setRadius(r)}
                className="flex-1 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={radius === r
                  ? { background: "var(--accent)", color: "#fff" }
                  : { background: "rgba(255,255,255,0.05)", color: "var(--t2)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {r >= 1000 ? `${r / 1000}km` : `${r}m`}
              </button>
            ))}
          </div>

          {/* Category chips — scrollable */}
          <div className="flex gap-1.5 overflow-x-auto scroll-none pb-1">
            <button onClick={() => setSelCat(null)}
              className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={!selCat
                ? { background: "rgba(255,255,255,0.12)", color: "var(--t1)" }
                : { background: "rgba(255,255,255,0.04)", color: "var(--t3)", border: "1px solid rgba(255,255,255,0.07)" }}>
              All
            </button>
            {categories.map((c) => (
              <button key={c.id} onClick={() => setSelCat(selCat === c.slug ? null : c.slug)}
                className="flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all"
                style={selCat === c.slug
                  ? { background: "rgba(255,94,26,0.15)", color: "var(--accent)", border: "1px solid rgba(255,94,26,0.3)" }
                  : { background: "rgba(255,255,255,0.04)", color: "var(--t3)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <span>{c.icon}</span>{c.name}
              </button>
            ))}
          </div>

          {/* Open now toggle */}
          <div className="flex items-center gap-2 mt-2">
            <button onClick={() => setOpenOnly((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={openOnly
                ? { background: "rgba(31,187,90,0.12)", color: "var(--green)", border: "1px solid rgba(31,187,90,0.28)" }
                : { background: "rgba(255,255,255,0.04)", color: "var(--t3)", border: "1px solid rgba(255,255,255,0.07)" }}>
              ● Open Now
            </button>
            <span className="text-xs" style={{ color: "var(--t3)" }}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-scroll scroll-none px-4 py-3">
          {(geo.loading || loading) && [1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 rounded-2xl shimmer mb-3" />
          ))}

          {!geo.loading && !loading && filtered.length === 0 && (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🔍</div>
              <p className="font-semibold">No shops found</p>
              <p className="text-sm mt-1 mb-4" style={{ color: "var(--t2)" }}>
                {shops.length === 0
                  ? "Try a larger radius"
                  : "Remove filters to see all nearby shops"}
              </p>
              {shops.length === 0 ? (
                <button onClick={() => setRadius((r) => Math.min(r * 2, 10000))}
                  className="px-5 py-2.5 rounded-full text-sm font-bold text-white"
                  style={{ background: "var(--accent)" }}>
                  Expand search
                </button>
              ) : (
                <button onClick={() => { setSelCat(null); setOpenOnly(false); }}
                  className="px-5 py-2.5 rounded-full text-sm font-bold text-white"
                  style={{ background: "var(--accent)" }}>
                  Clear filters
                </button>
              )}
            </div>
          )}

          {!loading && filtered.map((shop, i) => (
            <Link key={shop.id} href={`/shop/${shop.slug}`}
              className="flex items-center gap-3 px-3.5 py-3.5 rounded-2xl mb-3"
              style={{ background: "rgba(255,255,255,0.034)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {shop.subcategory?.icon ?? shop.category?.icon ?? "🏪"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-syne font-bold text-sm truncate">{shop.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>
                  {shop.category?.name} · {shop.locality?.name}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {shop.avg_rating > 0 && (
                    <span className="text-xs" style={{ color: "var(--gold)" }}>★ {shop.avg_rating.toFixed(1)}</span>
                  )}
                  <span className="text-xs font-semibold" style={{ color: "var(--green)" }}>
                    📍 {formatDistance(shop.distance_m)}
                  </span>
                  {shop.open_time && (
                    <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full"
                      style={isShopOpen(shop.open_time, shop.close_time, shop.open_days ?? [])
                        ? { background: "rgba(31,187,90,0.12)", color: "var(--green)" }
                        : { background: "rgba(255,255,255,0.05)", color: "var(--t3)" }}>
                      {isShopOpen(shop.open_time, shop.close_time, shop.open_days ?? []) ? "● Open" : "○ Closed"}
                    </span>
                  )}
                  {shop.top_offer && (
                    <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(255,94,26,0.1)", color: "var(--accent)", border: "1px dashed rgba(255,94,26,0.3)" }}>
                      🎯 Offer
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs font-bold flex-shrink-0" style={{ color: "var(--t3)" }}>#{i + 1}</span>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
