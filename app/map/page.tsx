"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useGeo } from "@/hooks/useGeo";
import { formatDistance } from "@/lib/geo/distance";

export default function MapPage() {
  const mapRef      = useRef<HTMLDivElement>(null);
  const leafletRef  = useRef<any>(null);
  const shopLayerRef = useRef<any>(null);
  const userLayerRef = useRef<any>(null);

  const { geo, detect } = useGeo();
  const router = useRouter();
  const [shops,   setShops]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  // Init map once
  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!mapRef.current || leafletRef.current) return;
      const L = await import("leaflet");
      if (!mounted || !mapRef.current || leafletRef.current) return;

      // Suppress default icon path errors
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const lat = geo.lat ?? 25.4358;
      const lng = geo.lng ?? 81.8463;

      const map = L.map(mapRef.current, {
        center: [lat, lng],
        zoom: 14,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer(
        `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=${process.env.NEXT_PUBLIC_STADIA_KEY ?? ""}`,
        { maxZoom: 20 }
      ).addTo(map);

      L.control.attribution({ prefix: "© <a href='https://stadiamaps.com/'>Stadia Maps</a> · © <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>" }).addTo(map);

      const shopLayer = L.layerGroup().addTo(map);
      const userLayer = L.layerGroup().addTo(map);

      leafletRef.current   = { map, L };
      shopLayerRef.current = shopLayer;
      userLayerRef.current = userLayer;

      setTimeout(() => map.invalidateSize(), 400);
    }

    init();
    return () => {
      mounted = false;
      if (leafletRef.current?.map) {
        leafletRef.current.map.remove();
        leafletRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update user location pin whenever GPS changes
  useEffect(() => {
    if (!leafletRef.current || !userLayerRef.current) return;
    const { map, L } = leafletRef.current;
    const userLayer  = userLayerRef.current;

    if (!geo.lat || !geo.lng) return;

    userLayer.clearLayers();

    const pulseIcon = L.divIcon({
      className: "",
      html: `<div style="
        width:16px;height:16px;border-radius:50%;
        background:rgba(56,189,248,0.9);
        border:2.5px solid #fff;
        box-shadow:0 0 0 6px rgba(56,189,248,0.25),0 0 18px rgba(56,189,248,0.5);
      "></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    L.marker([geo.lat, geo.lng], { icon: pulseIcon })
      .addTo(userLayer)
      .bindPopup("<b>📍 You are here</b>");

    map.setView([geo.lat, geo.lng], 14, { animate: true });
  }, [geo.lat, geo.lng]);

  // Load shops whenever GPS changes
  useEffect(() => {
    if (!leafletRef.current || !shopLayerRef.current) return;
    const { map, L } = leafletRef.current;
    const shopLayer  = shopLayerRef.current;

    const lat = geo.lat ?? 25.4358;
    const lng = geo.lng ?? 81.8463;

    // Guard against post-unmount state updates that cause _leaflet_pos errors
    let cancelled = false;

    async function loadShops() {
      setLoading(true);
      try {
        const res  = await fetch(`/api/shops?lat=${lat}&lng=${lng}&radius=10000`, { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;

        const data = Array.isArray(json?.shops) ? json.shops : [];
        setShops(data);

        shopLayer.clearLayers();

        data.forEach((shop: any) => {
          if (cancelled) return;
          if (typeof shop.lat !== "number" || typeof shop.lng !== "number") return;

          const shopIcon = L.divIcon({
            className: "",
            html: `<div style="
              width:30px;height:30px;border-radius:50%;
              background:rgba(255,94,26,0.92);
              border:2px solid rgba(255,255,255,0.8);
              display:flex;align-items:center;justify-content:center;
              font-size:14px;
              box-shadow:0 2px 10px rgba(255,94,26,0.5);
              cursor:pointer;
            ">${shop.category?.icon ?? "🏪"}</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          });

          L.marker([shop.lat, shop.lng], { icon: shopIcon })
            .addTo(shopLayer)
            .on("click", () => setSelected(shop));
        });

        if (!cancelled && data.length > 0) {
          const bounds = L.latLngBounds(
            data
              .filter((s: any) => typeof s.lat === "number")
              .map((s: any) => [s.lat, s.lng])
          );
          if (bounds.isValid()) {
            setTimeout(() => { if (!cancelled) map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 }); }, 300);
          }
        }

        if (!cancelled) setTimeout(() => map.invalidateSize(), 600);
      } catch {
        if (!cancelled) setShops([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadShops();
    return () => { cancelled = true; };
  }, [geo.lat, geo.lng]);

  return (
    <AppShell activeTab="walk">
      <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3"
          style={{ background: "rgba(5,7,12,0.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", zIndex: 50 }}>
          <div>
            <p className="font-syne font-black text-base">🗺 Map View</p>
            <p className="text-[10px]" style={{ color: "var(--t3)" }}>
              {loading ? "Loading shops…" : `${shops.length} shops nearby`}
            </p>
          </div>
          <button onClick={detect}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: "rgba(31,187,90,0.09)", border: "1px solid rgba(31,187,90,0.25)", color: "var(--green)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
            {geo.loading ? "Detecting…" : geo.locality ?? "Use My Location"}
          </button>
        </div>

        {/* Leaflet CSS */}
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

        {/* Map */}
        <div ref={mapRef} style={{ flex: 1, minHeight: 0 }} />

        {/* Selected shop drawer */}
        {selected && (
          <div
            className="flex-shrink-0 flex items-center gap-3 px-4 py-3"
            style={{ background: "rgba(10,12,20,0.98)", borderTop: "1px solid rgba(255,255,255,0.09)", zIndex: 60 }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: "rgba(255,94,26,0.1)", border: "1px solid rgba(255,94,26,0.22)" }}>
              {selected.category?.icon ?? "🏪"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-syne font-bold text-sm truncate">{selected.name}</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--t3)" }}>
                {selected.category?.name} · {selected.locality?.name}
                {typeof selected.distance_m === "number" && ` · 📍 ${formatDistance(selected.distance_m)}`}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => router.push(`/shop/${selected.slug}`)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                style={{ background: "var(--accent)" }}>
                View →
              </button>
              <button
                onClick={() => setSelected(null)}
                className="px-2 py-1.5 rounded-xl text-xs"
                style={{ background: "rgba(255,255,255,0.06)", color: "var(--t2)" }}>
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Shop count strip — only when no shop selected */}
        {!selected && shops.length > 0 && (
          <div className="flex-shrink-0 overflow-x-auto scroll-none"
            style={{ background: "rgba(5,7,12,0.97)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex gap-2 px-3 py-2.5" style={{ width: "max-content" }}>
              {shops.slice(0, 12).map((shop) => (
                <button key={shop.id}
                  onClick={() => setSelected(shop)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0 transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <span>{shop.category?.icon ?? "🏪"}</span>
                  <div className="text-left">
                    <p className="text-xs font-semibold" style={{ color: "var(--t1)" }}>{shop.name}</p>
                    {typeof shop.distance_m === "number" && (
                      <p className="text-[9px]" style={{ color: "var(--green)" }}>📍 {formatDistance(shop.distance_m)}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
