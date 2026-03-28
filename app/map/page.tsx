"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { useGeo } from "@/hooks/useGeo";

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);
  const shopLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);

  const { geo, detect } = useGeo();
  const [shops, setShops] = useState<any[]>([]);
  const [debug, setDebug] = useState("initializing");

  // Init map once
  useEffect(() => {
    let mounted = true;

    async function init() {
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

      const startLat = geo.lat ?? 25.442;
      const startLng = geo.lng ?? 81.8517;

      const map = L.map(mapRef.current, {
        center: [startLat, startLng],
        zoom: 15,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const shopLayer = L.layerGroup().addTo(map);

      leafletRef.current = { map, L };
      shopLayerRef.current = shopLayer;

      setDebug("map ready");

      setTimeout(() => {
        map.invalidateSize();
      }, 400);
    }

    init();

    return () => {
      mounted = false;
      if (leafletRef.current?.map) {
        leafletRef.current.map.remove();
        leafletRef.current = null;
      }
      shopLayerRef.current = null;
      userMarkerRef.current = null;
    };
  }, []);

  // Recenter + user marker
  useEffect(() => {
    if (!leafletRef.current) return;

    const { map, L } = leafletRef.current;
    const lat = geo.lat ?? 25.442;
    const lng = geo.lng ?? 81.8517;

    map.setView([lat, lng], 15);

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
    } else {
      userMarkerRef.current = L.marker([lat, lng]).addTo(map).bindPopup("📍 You are here");
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }, [geo.lat, geo.lng]);

  // Load shops
  useEffect(() => {
    if (!leafletRef.current || !shopLayerRef.current) return;

    const { map, L } = leafletRef.current;
    const shopLayer = shopLayerRef.current;

    const lat = geo.lat ?? 25.442;
    const lng = geo.lng ?? 81.8517;

    let cancelled = false;

    async function loadShops() {
      try {
        setDebug("loading shops");

        const res = await fetch(
          `/api/shops?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(
            lng
          )}&radius=10000`,
          { cache: "no-store" }
        );

        const json = await res.json();
        const data = Array.isArray(json?.shops) ? json.shops : [];

        if (cancelled) return;

        setShops(data);
        setDebug(`loaded ${data.length} shops`);

        shopLayer.clearLayers();

        data.forEach((shop: any) => {
          if (typeof shop.lat !== "number" || typeof shop.lng !== "number") return;

          const marker = L.marker([shop.lat, shop.lng]).addTo(shopLayer);

          marker.bindPopup(
            `<b>${shop.name ?? "Shop"}</b><br>${shop.address ?? ""}<br><a href="/shop/${
              shop.slug ?? ""
            }" style="color:#FF5E1A">View shop →</a>`
          );
        });

        if (data.length > 0) {
          const bounds = L.latLngBounds(data.map((s: any) => [s.lat, s.lng]));
          map.fitBounds(bounds, { padding: [40, 40] });
        }

        setTimeout(() => {
          map.invalidateSize();
        }, 150);
      } catch (e) {
        if (!cancelled) {
          setShops([]);
          setDebug("failed to load shops");
          console.error(e);
        }
      }
    }

    loadShops();

    return () => {
      cancelled = true;
    };
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
          className="w-full"
          style={{
            height: "calc(100vh - 80px)",
            minHeight: 500,
            zIndex: 10,
          }}
        />
      </div>
    </AppShell>
  );
}