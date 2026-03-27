"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { useGeo } from "@/hooks/useGeo";

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);

  const { geo, detect } = useGeo();
  const [shops, setShops] = useState<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [debug, setDebug] = useState<string>("initializing");

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
        center: [geo.lat, geo.lng],
        zoom: 15,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);

      leafletRef.current = { L, map };
      markersLayerRef.current = markersLayer;
      setMapReady(true);
      setDebug("map ready");

      setTimeout(() => map.invalidateSize(), 300);
    }

    initMap();

    return () => {
      mounted = false;
      if (leafletRef.current?.map) {
        leafletRef.current.map.remove();
        leafletRef.current = null;
      }
      markersLayerRef.current = null;
    };
  }, [geo.lat, geo.lng]);

  useEffect(() => {
    if (!leafletRef.current || !markersLayerRef.current || !mapReady) return;

    const { map, L } = leafletRef.current;
    const markersLayer = markersLayerRef.current;

    markersLayer.clearLayers();

    map.setView([geo.lat, geo.lng], 15);

    L.marker([geo.lat, geo.lng])
      .bindPopup("📍 You are here / Katra test location")
      .addTo(markersLayer);

    setTimeout(() => map.invalidateSize(), 150);
  }, [geo.lat, geo.lng, mapReady]);

  useEffect(() => {
    if (!leafletRef.current || !markersLayerRef.current || !mapReady) return;

    let cancelled = false;

    async function loadShops() {
      try {
        setDebug("loading shops...");

        const url = `/api/shops?lat=${geo.lat}&lng=${geo.lng}&radius=10000`;
        console.log("Fetching shops from:", url);

        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json();

        console.log("Shop API status:", res.status);
        console.log("Shop API response:", json);

        if (!res.ok) {
          if (!cancelled) {
            setShops([]);
            setDebug(`api failed: ${json?.error || "unknown error"}`);
          }
          return;
        }

        const data = Array.isArray(json?.shops) ? json.shops : [];

        if (cancelled) return;

        setShops(data);
        setDebug(`loaded ${data.length} shops`);

        const { L, map } = leafletRef.current;
        const markersLayer = markersLayerRef.current;

        markersLayer.clearLayers();

        L.marker([geo.lat, geo.lng])
          .bindPopup("📍 You are here / Katra test location")
          .addTo(markersLayer);

        data.forEach((shop: any) => {
          if (
            !shop ||
            typeof shop.lat !== "number" ||
            typeof shop.lng !== "number"
          ) {
            console.log("Skipped invalid shop:", shop);
            return;
          }

          const marker = L.marker([shop.lat, shop.lng]).addTo(markersLayer);

          marker.bindPopup(`
            <div>
              <b>${shop.name ?? "Shop"}</b><br/>
              ${shop.address ?? ""}<br/>
              <small>${shop.slug ?? ""}</small>
            </div>
          `);
        });

        if (data.length > 0) {
          const bounds = L.latLngBounds([
            [geo.lat, geo.lng],
            ...data.map((shop: any) => [shop.lat, shop.lng]),
          ]);
          map.fitBounds(bounds, { padding: [40, 40] });
        }
      } catch (err: any) {
        console.error("Shop fetch/render crash:", err);
        if (!cancelled) {
          setShops([]);
          setDebug(`crash: ${err?.message || "unknown crash"}`);
        }
      }
    }

    loadShops();

    return () => {
      cancelled = true;
    };
  }, [geo.lat, geo.lng, mapReady]);

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