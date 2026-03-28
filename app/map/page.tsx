"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { useGeo } from "@/hooks/useGeo";

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);
  const shopLayerRef = useRef<any>(null);

  const { geo, detect } = useGeo();
  const [shops, setShops] = useState<any[]>([]);
  const [debug, setDebug] = useState("init");

  useEffect(() => {
    let mounted = true;

    async function initMap() {
      if (!mapRef.current || leafletRef.current) return;

      const L = await import("leaflet");
      if (!mounted || !mapRef.current || leafletRef.current) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current, {
        center: [25.442, 81.8517],
        zoom: 14,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const shopLayer = L.layerGroup().addTo(map);

      // hardcoded test marker
      L.marker([25.442, 81.8517]).addTo(shopLayer).bindPopup("Katra test marker");

      leafletRef.current = { map, L };
      shopLayerRef.current = shopLayer;

      setDebug("map ready");

      setTimeout(() => {
        map.invalidateSize();
        map.setView([25.442, 81.8517], 14);
      }, 500);
    }

    initMap();

    return () => {
      mounted = false;
      if (leafletRef.current?.map) {
        leafletRef.current.map.remove();
        leafletRef.current = null;
      }
      shopLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!leafletRef.current || !shopLayerRef.current) return;

    const { map, L } = leafletRef.current;
    const shopLayer = shopLayerRef.current;

    const lat = geo.lat ?? 25.442;
    const lng = geo.lng ?? 81.8517;

    async function loadShops() {
      try {
        setDebug("loading shops");

        const res = await fetch(
          `/api/shops?lat=${lat}&lng=${lng}&radius=10000`,
          { cache: "no-store" }
        );

        const json = await res.json();
        const data = Array.isArray(json?.shops) ? json.shops : [];

        console.log("LIVE SHOPS:", data);

        setShops(data);
        setDebug(`loaded ${data.length} shops`);

        shopLayer.clearLayers();

        // hardcoded test marker again after clear
        L.marker([25.442, 81.8517]).addTo(shopLayer).bindPopup("Katra test marker");

        data.forEach((shop: any) => {
          if (typeof shop.lat !== "number" || typeof shop.lng !== "number") return;

          L.marker([shop.lat, shop.lng])
            .addTo(shopLayer)
            .bindPopup(
              `<b>${shop.name ?? "Shop"}</b><br>${shop.address ?? ""}`
            );
        });

        if (data.length > 0) {
          const bounds = L.latLngBounds(
            data
              .filter((s: any) => typeof s.lat === "number" && typeof s.lng === "number")
              .map((s: any) => [s.lat, s.lng])
          );

          if (bounds.isValid()) {
            setTimeout(() => {
              map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
            }, 300);
          }
        } else {
          map.setView([25.442, 81.8517], 14);
        }

        setTimeout(() => {
          map.invalidateSize();
        }, 800);
      } catch (err) {
        console.error("Map load failed:", err);
        setDebug("load failed");
        setShops([]);
      }
    }

    loadShops();
  }, [geo.lat, geo.lng]);

  return (
    <AppShell activeTab="walk">
      <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
        <div
          className="flex-shrink-0 flex items-center justify-between px-4 py-3"
          style={{
            background: "rgba(5,7,12,0.96)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            zIndex: 50,
          }}
        >
          <div>
            <p className="font-syne font-black text-base">🗺 Map View</p>
            <p className="text-[10px]" style={{ color: "var(--t3)" }}>
              {shops.length} shops nearby
            </p>
            <p className="text-[10px]" style={{ color: "#ff9b73" }}>
              {debug}
            </p>
          </div>

          <button
            onClick={detect}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: "rgba(31,187,90,0.09)",
              border: "1px solid rgba(31,187,90,0.25)",
              color: "var(--green)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--green)",
                display: "inline-block",
              }}
            />
            {geo.locality ?? "Detect Location"}
          </button>
        </div>

        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />

        <div
          ref={mapRef}
          style={{
            width: "100%",
            height: "55vh",
            minHeight: 400,
            zIndex: 10,
          }}
        />

        <div
          style={{
            padding: 12,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            overflowY: "auto",
          }}
        >
          <p style={{ fontWeight: 700, marginBottom: 8 }}>Loaded shops</p>
          {shops.length === 0 ? (
            <p style={{ opacity: 0.7 }}>No shops in UI state</p>
          ) : (
            shops.slice(0, 10).map((shop) => (
              <div
                key={shop.id}
                style={{
                  padding: "8px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div>{shop.name}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {shop.lat}, {shop.lng}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}