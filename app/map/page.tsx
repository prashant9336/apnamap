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
        zoom: 15,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      shopLayerRef.current = L.layerGroup().addTo(map);
      leafletRef.current = { map, L };

      setDebug("map ready");

      setTimeout(() => {
        map.invalidateSize();
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

        data.forEach((shop: any) => {
          if (typeof shop.lat !== "number" || typeof shop.lng !== "number") {
            return;
          }

          L.marker([shop.lat, shop.lng])
            .addTo(shopLayer)
            .bindPopup(
              `<b>${shop.name ?? "Shop"}</b><br>${shop.address ?? ""}`
            );
        });

        if (data.length > 0) {
          const bounds = L.latLngBounds(
            data.map((shop: any) => [shop.lat, shop.lng])
          );
          map.fitBounds(bounds, { padding: [40, 40] });
        }

        setTimeout(() => {
          map.invalidateSize();
        }, 200);
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
            height: "calc(100vh - 80px)",
            minHeight: 500,
            zIndex: 10,
          }}
        />
      </div>
    </AppShell>
  );
}