"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { useGeo } from "@/hooks/useGeo";

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);

  const { geo, detect } = useGeo();
  const [shops, setShops] = useState<any[]>([]);

  // Initialize map once
  useEffect(() => {
    if (leafletRef.current || !mapRef.current) return;

    import("leaflet").then((L) => {
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

      const map = L.map(mapRef.current!, {
        center: [startLat, startLng],
        zoom: 15,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      leafletRef.current = { map, L };

      setTimeout(() => {
        map.invalidateSize();
      }, 300);
    });

    return () => {
      if (leafletRef.current?.map) {
        leafletRef.current.map.remove();
        leafletRef.current = null;
      }
      markersRef.current = [];
      userMarkerRef.current = null;
    };
  }, []);

  // Update user marker and recenter map
  useEffect(() => {
    if (!leafletRef.current) return;

    const { map, L } = leafletRef.current;
    const lat = geo.lat ?? 25.442;
    const lng = geo.lng ?? 81.8517;

    map.setView([lat, lng], 15);

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
    } else {
      const userIcon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#FF5E1A;border:2px solid #fff;box-shadow:0 0 10px rgba(255,94,26,0.7)"></div>`,
        className: "",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      userMarkerRef.current = L.marker([lat, lng], { icon: userIcon })
        .addTo(map)
        .bindPopup("📍 You are here");
    }
  }, [geo.lat, geo.lng]);

  // 🔥 Recenter map when location updates
useEffect(() => {
  if (!leafletRef.current || geo.lat === null || geo.lng === null) return;

  const { map } = leafletRef.current;

  map.setView([geo.lat, geo.lng], 15);

}, [geo.lat, geo.lng]);

  // Fetch shops whenever location changes, with fallback location
  useEffect(() => {
    if (!leafletRef.current) return;

    const { map, L } = leafletRef.current;
    const lat = geo.lat ?? 25.442;
    const lng = geo.lng ?? 81.8517;

    fetch(`/api/shops?lat=${lat}&lng=${lng}&radius=10000`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then(({ shops: data }) => {
        const safeData = Array.isArray(data) ? data : [];
        setShops(safeData);

        // Remove old shop markers
        markersRef.current.forEach((marker) => {
          map.removeLayer(marker);
        });
        markersRef.current = [];

        safeData.forEach((shop: any) => {
          if (typeof shop.lat !== "number" || typeof shop.lng !== "number") {
            return;
          }

          const icon = L.divIcon({
            html: `<div style="background:#1a1d2a;border:1.5px solid rgba(255,94,26,0.6);border-radius:8px;padding:3px 6px;font-size:11px;font-weight:700;color:#FF7A40;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5)">${shop.category?.icon ?? "🏪"} ${shop.name?.split(" ")[0] ?? "Shop"}</div>`,
            className: "",
            iconAnchor: [0, 0],
          });

          const marker = L.marker([shop.lat, shop.lng], { icon })
            .addTo(map)
            .bindPopup(
              `<b>${shop.name ?? "Shop"}</b><br>${shop.category?.name ?? ""}<br><a href="/shop/${shop.slug ?? ""}" style="color:#FF5E1A">View shop →</a>`
            );

          markersRef.current.push(marker);
        });
      })
      .catch((err) => {
        console.error("Failed to load shops:", err);
        setShops([]);
      });
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
          className="flex-1"
          style={{ zIndex: 10, minHeight: "500px" }}
        />
      </div>
    </AppShell>
  );
}