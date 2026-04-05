"use client";
/**
 * Map page — thin shell that wraps MapCanvas (dynamic import, SSR disabled)
 * and manages the selected-shop bottom drawer + header UI.
 *
 * MapCanvas owns all MapLibre state and communicates via:
 *   onShopClick   → sets selectedShop
 *   onShopsLoaded → updates shopCount chip
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useGeo } from "@/hooks/useGeo";
import { formatDistance } from "@/lib/geo/distance";
import { readSyncLocation, writeSyncLocation } from "@/lib/mapSync";
import type { MapShop } from "@/components/map/MapCanvas";

/* Load MapCanvas only on the client — maplibre-gl uses browser APIs */
const MapCanvas = dynamic(
  () => import("@/components/map/MapCanvas"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          background: "#05070C", color: "rgba(255,255,255,0.25)", fontSize: 13,
        }}
      >
        Loading map…
      </div>
    ),
  },
);

/* ── Shop bottom drawer ──────────────────────────────────────────── */
function ShopDrawer({ shop, onClose }: { shop: MapShop; onClose: () => void }) {
  const router = useRouter();
  return (
    <div
      style={{
        flexShrink: 0, display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px",
        background: "rgba(10,12,20,0.98)",
        borderTop: "1px solid rgba(255,255,255,0.09)",
        zIndex: 60,
        animation: "slide-up 0.22s cubic-bezier(0.25,0,0,1)",
      }}
    >
      {/* Category icon */}
      <div
        style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20,
          background: "rgba(255,94,26,0.10)", border: "1px solid rgba(255,94,26,0.22)",
        }}
      >
        {shop.category?.icon ?? "🏪"}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="font-syne"
          style={{ fontWeight: 700, fontSize: 13, color: "#EDEEF5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {shop.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, fontSize: 10, color: "rgba(255,255,255,0.38)" }}>
          {shop.category?.name && <span>{shop.category.name}</span>}
          {shop.locality?.name  && <><span>·</span><span>{shop.locality.name}</span></>}
          {shop.distance_m != null && (
            <><span>·</span><span style={{ color: "#1FBB5A" }}>📍 {formatDistance(shop.distance_m)}</span></>
          )}
        </div>
        {shop.top_offer && (
          <div style={{
            marginTop: 4, fontSize: 10, fontWeight: 600,
            color: shop.top_offer.tier === 1 ? "#FF5E1A" : shop.top_offer.tier === 2 ? "#E8A800" : "rgba(255,255,255,0.45)",
          }}>
            {shop.top_offer.tier === 1 ? "🔥" : shop.top_offer.tier === 2 ? "⚡" : "🎯"} {shop.top_offer.title}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => router.push(`/shop/${shop.slug}`)}
          style={{
            padding: "8px 14px", borderRadius: 10,
            background: "#FF5E1A", color: "#fff",
            fontWeight: 700, fontSize: 12, border: "none", cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          View →
        </button>
        <button
          onClick={onClose}
          style={{
            padding: "8px 10px", borderRadius: 10,
            background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)",
            fontWeight: 600, fontSize: 12, border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/* ── Shop horizontal strip (no selection) ────────────────────────── */
function ShopStrip({ shops, onTap }: { shops: MapShop[]; onTap: (s: MapShop) => void }) {
  if (shops.length === 0) return null;
  return (
    <div
      className="scroll-none"
      style={{
        flexShrink: 0, overflowX: "auto",
        background: "rgba(5,7,12,0.97)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ display: "flex", gap: 8, padding: "10px 12px", width: "max-content" }}>
        {shops.slice(0, 15).map(shop => (
          <button
            key={shop.id}
            onClick={() => onTap(shop)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px", borderRadius: 12, flexShrink: 0,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <span style={{ fontSize: 16 }}>{shop.category?.icon ?? "🏪"}</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#EDEEF5", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {shop.name}
              </div>
              {shop.distance_m != null && (
                <div style={{ fontSize: 9, color: "#1FBB5A", marginTop: 1 }}>
                  📍 {formatDistance(shop.distance_m)}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function MapPage() {
  const { geo, detect }  = useGeo();
  const router           = useRouter();
  const [selected,  setSelected]  = useState<MapShop | null>(null);
  const [shops,     setShops]     = useState<MapShop[]>([]);
  const [focusedLocality, setFocusedLocality] = useState<string>("");

  /* Read Walk→Map sync payload once on mount */
  const [syncCoords] = useState<{ lat: number | null; lng: number | null }>(() => {
    if (typeof window === "undefined") return { lat: null, lng: null };
    const p = readSyncLocation();
    if (p?.source === "walk") return { lat: p.lat, lng: p.lng };
    return { lat: null, lng: null };
  });

  /* When a shop is selected, write its locality back for Map→Walk sync */
  const handleShopClick = useCallback((s: MapShop) => {
    setSelected(s);
    if (s.locality?.name && s.lat != null && s.lng != null) {
      writeSyncLocation({ locality: s.locality.name, lat: s.lat, lng: s.lng, source: "map" });
    }
  }, []);

  const handleShopsLoaded    = useCallback((s: MapShop[]) => setShops(s), []);
  const handleLocalityChange = useCallback((l: string) => setFocusedLocality(l), []);

  const userLat = useMemo(() => geo.lat ?? null, [geo.lat]);
  const userLng = useMemo(() => geo.lng ?? null, [geo.lng]);

  return (
    <AppShell activeTab="walk">
      {/* Inject slide-up animation once */}
      <style>{`
        @keyframes slide-up {
          from { transform:translateY(100%); opacity:0; }
          to   { transform:translateY(0);   opacity:1; }
        }
        /* Remove MapLibre's default attribution background in dark theme */
        .maplibregl-ctrl-attrib { background:rgba(5,7,12,0.7)!important; color:rgba(255,255,255,0.3)!important; font-size:9px!important; }
        .maplibregl-ctrl-attrib a { color:rgba(255,255,255,0.4)!important; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#05070C" }}>

        {/* ── Header ──────────────────────────────────────────── */}
        <div
          style={{
            flexShrink: 0, display: "flex", alignItems: "center",
            gap: 10, padding: "10px 14px",
            background: "rgba(5,7,12,0.96)", backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)", zIndex: 50,
          }}
        >
          {/* ← Walk button */}
          <button
            onClick={() => router.push("/explore")}
            style={{
              flexShrink: 0, padding: "6px 10px", borderRadius: 100,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)",
              color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 4,
            }}
          >
            ← Walk
          </button>

          {/* Locality pill — updates as map moves */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="font-syne" style={{ fontWeight: 800, fontSize: 14, color: "#EDEEF5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {focusedLocality || "🗺 Map View"}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", marginTop: 1 }}>
              {shops.length > 0 ? `${shops.length} shops in view` : "Move map to load shops"}
            </div>
          </div>

          {/* GPS button */}
          <button
            onClick={detect}
            style={{
              flexShrink: 0, display: "flex", alignItems: "center", gap: 5,
              padding: "6px 11px", borderRadius: 100,
              background: "rgba(31,187,90,0.09)", border: "1px solid rgba(31,187,90,0.25)",
              color: "#1FBB5A", fontSize: 11, fontWeight: 600, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#1FBB5A", boxShadow: "0 0 4px #1FBB5A", flexShrink: 0 }} />
            {geo.loading ? "…" : "GPS"}
          </button>
        </div>

        {/* ── Map (WebGL via MapLibre) ─────────────────────────── */}
        <MapCanvas
          userLat={userLat}
          userLng={userLng}
          onShopClick={handleShopClick}
          onShopsLoaded={handleShopsLoaded}
        />

        {/* ── Bottom: selected shop drawer OR shop strip ───────── */}
        {selected
          ? <ShopDrawer shop={selected} onClose={() => setSelected(null)} />
          : <ShopStrip shops={shops}  onTap={setSelected} />
        }
      </div>
    </AppShell>
  );
}
