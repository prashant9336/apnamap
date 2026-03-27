"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useGeo } from "@/hooks/useGeo";
import AppShell from "@/components/layout/AppShell";
import { formatDistance } from "@/lib/geo/distance";

export default function NearMePage() {
  const { geo, detect }  = useGeo();
  const [shops,  setShops]  = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius]  = useState(1000);

  useEffect(() => { detect(); }, []);

  useEffect(() => {
    if (!geo.lat || !geo.lng) return;
    setLoading(true);
    fetch(`/api/shops?lat=${geo.lat}&lng=${geo.lng}&radius=${radius}`)
      .then((r) => r.json())
      .then((d) => { setShops(d.shops ?? []); setLoading(false); });
  }, [geo.lat, geo.lng, radius]);

  const RADII = [500, 1000, 2000, 5000];

  return (
    <AppShell activeTab="walk">
      <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-4 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <h1 className="font-syne font-black text-xl mb-1" style={{ letterSpacing: "-0.4px" }}>📍 Near Me</h1>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs" style={{ color: "var(--t2)" }}>
              {geo.locality ? `📍 ${geo.locality}` : geo.loading ? "Detecting…" : "Location unknown"}
            </p>
            <button onClick={detect}
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(31,187,90,0.09)", color: "var(--green)", border: "1px solid rgba(31,187,90,0.22)" }}>
              ↺ Refresh
            </button>
          </div>
          {/* Radius filter */}
          <div className="flex gap-2">
            {RADII.map((r) => (
              <button key={r} onClick={() => setRadius(r)}
                className="flex-1 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={radius === r
                  ? { background: "var(--accent)", color: "#fff" }
                  : { background: "rgba(255,255,255,0.05)", color: "var(--t2)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {r >= 1000 ? `${r/1000}km` : `${r}m`}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-scroll scroll-none px-4 py-3">
          {(geo.loading || loading) && [1,2,3,4,5].map((i) => <div key={i} className="h-20 rounded-2xl shimmer mb-3" />)}

          {!geo.loading && !loading && shops.length === 0 && (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🔍</div>
              <p className="font-semibold">No shops within {radius >= 1000 ? `${radius/1000}km` : `${radius}m`}</p>
              <p className="text-sm mt-1 mb-4" style={{ color: "var(--t2)" }}>Try a larger radius</p>
              <button onClick={() => setRadius((r) => Math.min(r * 2, 10000))}
                className="px-5 py-2.5 rounded-full text-sm font-bold text-white"
                style={{ background: "var(--accent)" }}>Expand search</button>
            </div>
          )}

          {!loading && shops.map((shop, i) => (
            <Link key={shop.id} href={`/shop/${shop.slug}`}
              className="flex items-center gap-3 px-3.5 py-3.5 rounded-2xl mb-3"
              style={{ background: "rgba(255,255,255,0.034)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {shop.category?.icon ?? "🏪"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-syne font-bold text-sm truncate">{shop.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>
                  {shop.category?.name} · {shop.locality?.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {shop.avg_rating > 0 && (
                    <span className="text-xs" style={{ color: "var(--gold)" }}>★ {shop.avg_rating.toFixed(1)}</span>
                  )}
                  <span className="text-xs font-semibold" style={{ color: "var(--green)" }}>
                    📍 {formatDistance(shop.distance_m)}
                  </span>
                  {shop.is_open !== undefined && (
                    <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full"
                      style={shop.is_open
                        ? { background: "rgba(31,187,90,0.12)", color: "var(--green)" }
                        : { background: "rgba(255,255,255,0.05)", color: "var(--t3)" }}>
                      {shop.is_open ? "● Open" : "○ Closed"}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs font-bold" style={{ color: "var(--t3)" }}>#{i + 1}</span>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
