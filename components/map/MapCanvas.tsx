"use client";
/**
 * MapCanvas — MapLibre GL JS map for ApnaMap
 *
 * Replaces the old Leaflet implementation with:
 *   • WebGL-rendered tiles  → 60fps smooth panning/zooming on mobile
 *   • Native GeoJSON clustering → no per-marker DOM nodes
 *   • Viewport-based shop loading → only fetches what's visible
 *   • Pulse user-location marker
 *
 * Tile provider (no API key required by default):
 *   CartoDB dark_all raster tiles, same as before but rendered via WebGL.
 *
 * Upgrading to vector tiles:
 *   Set env var  NEXT_PUBLIC_MAPTILER_KEY=<key>  (free at maptiler.com)
 *   and the style URL below will automatically switch to MapTiler Dataviz Dark.
 */

import { useEffect, useRef, useCallback } from "react";
import maplibregl, { type Map as MLMap, type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/* ── Types ───────────────────────────────────────────────────────── */
export interface MapShop {
  id:          string;
  name:        string;
  slug:        string;
  lat:         number;
  lng:         number;
  is_open:     boolean;
  distance_m?: number | null;
  category?:   { name: string; slug: string; icon: string } | null;
  locality?:   { name: string } | null;
  top_offer?:  { title: string; tier: number } | null;
}

interface Props {
  userLat:       number | null;
  userLng:       number | null;
  onShopClick:   (shop: MapShop) => void;
  onShopsLoaded: (shops: MapShop[]) => void;
}

/* ── Map style ───────────────────────────────────────────────────── */
function buildStyle(): maplibregl.StyleSpecification {
  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;

  /* Vector tiles (MapTiler Dataviz Dark) — premium, India-accurate */
  if (maptilerKey) {
    return {
      version: 8 as const,
      glyphs:  `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${maptilerKey}`,
      sources: {
        "maptiler-tiles": {
          type: "raster",
          tiles: [`https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}.png?key=${maptilerKey}`],
          tileSize: 256,
          attribution: "© MapTiler © OpenStreetMap contributors",
        },
      },
      layers: [{ id: "background", type: "raster", source: "maptiler-tiles" }],
    };
  }

  /* Default: CartoDB Dark raster tiles — free, no key, India-accurate OSM */
  return {
    version: 8 as const,
    sources: {
      "carto-dark": {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
          "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
          "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
          "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        ],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors © CartoDB",
      },
    },
    layers: [{ id: "background", type: "raster", source: "carto-dark" }],
  };
}

/* ── Empty GeoJSON FeatureCollection ─────────────────────────────── */
const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

/* ── Debounce util ───────────────────────────────────────────────── */
function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let t: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }) as T;
}

/* ── MapCanvas ───────────────────────────────────────────────────── */
export default function MapCanvas({ userLat, userLng, onShopClick, onShopsLoaded }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<MLMap | null>(null);
  const userMarker   = useRef<maplibregl.Marker | null>(null);
  const shopDataRef  = useRef<MapShop[]>([]);        // latest fetched shops
  const loadingRef   = useRef(false);

  /* ── Fetch shops for current map bounds ──────────────────────── */
  const fetchShopsForBounds = useCallback(async (map: MLMap) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    const b      = map.getBounds();
    const params = new URLSearchParams({
      minLat: String(b.getSouth()),
      maxLat: String(b.getNorth()),
      minLng: String(b.getWest()),
      maxLng: String(b.getEast()),
    });

    try {
      const res  = await fetch(`/api/shops?${params.toString()}`, { cache: "no-store" });
      const json = await res.json() as { shops?: MapShop[] };
      const shops = Array.isArray(json.shops) ? json.shops : [];
      shopDataRef.current = shops;

      /* Update GeoJSON source — MapLibre re-renders only the diff */
      const source = map.getSource("shops") as GeoJSONSource | undefined;
      if (source) {
        source.setData({
          type: "FeatureCollection",
          features: shops
            .filter(s => s.lat != null && s.lng != null)
            .map(s => ({
              type: "Feature" as const,
              geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
              properties: {
                id:        s.id,
                name:      s.name,
                slug:      s.slug,
                icon:      s.category?.icon ?? "🏪",
                is_open:   s.is_open,
                has_deal:  !!s.top_offer,
                tier:      s.top_offer?.tier ?? 0,
              },
            })),
        });
      }

      onShopsLoaded(shops);
    } catch {
      /* silent — map keeps showing last good data */
    } finally {
      loadingRef.current = false;
    }
  }, [onShopsLoaded]);

  const debouncedFetch = useCallback(
    debounce((map: MLMap) => fetchShopsForBounds(map), 400),
    [fetchShopsForBounds],
  );

  /* ── Init map once ───────────────────────────────────────────── */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container:   containerRef.current,
      style:       buildStyle(),
      center:      [userLng ?? 81.8463, userLat ?? 25.4358],
      zoom:        14,
      minZoom:     10,
      maxZoom:     19,
      /* Smooth feel ─────────────────────────────── */
      dragRotate: false,  // disable rotate on mobile (confusing)
      touchPitch: false,  // disable pitch on mobile
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );

    map.on("load", () => {
      /* ── Shop GeoJSON source with clustering ───────────────── */
      map.addSource("shops", {
        type:          "geojson",
        data:          EMPTY_FC,
        cluster:       true,
        clusterMaxZoom:14,    // individual markers appear at zoom ≥ 14
        clusterRadius: 48,
      });

      /* Cluster background circle */
      map.addLayer({
        id:     "clusters",
        type:   "circle",
        source: "shops",
        filter: ["has", "point_count"],
        paint:  {
          "circle-color": [
            "step", ["get", "point_count"],
            "#FF5E1A",   5,    // < 5 shops  → orange
            "#E8A800",   20,   // < 20 shops → gold
            "#A78BFA",         // 20+        → purple (high density)
          ],
          "circle-radius": [
            "step", ["get", "point_count"],
            22, 5, 28, 20, 34,
          ],
          "circle-opacity":        0.88,
          "circle-stroke-width":   2,
          "circle-stroke-color":   "rgba(255,255,255,0.22)",
        },
      });

      /* Cluster count label */
      map.addLayer({
        id:     "cluster-count",
        type:   "symbol",
        source: "shops",
        filter: ["has", "point_count"],
        layout: {
          "text-field":           ["get", "point_count_abbreviated"],
          "text-size":            12,
          "text-font":            ["Noto Sans Regular"],
          "text-allow-overlap":   true,
        },
        paint: { "text-color": "#ffffff", "text-halo-color": "rgba(0,0,0,0.3)", "text-halo-width": 1 },
      });

      /* Individual shop dots — appear when zoom ≥ clusterMaxZoom */
      map.addLayer({
        id:     "shop-points",
        type:   "circle",
        source: "shops",
        filter: ["!", ["has", "point_count"]],
        paint:  {
          "circle-color": [
            "case",
            ["==", ["get", "tier"], 1], "#FF5E1A",   // big deal → orange
            ["==", ["get", "tier"], 2], "#E8A800",   // flash    → gold
            ["get",  "is_open"],        "#1FBB5A",   // open     → green
            "#555E6E",                               // closed   → grey
          ],
          "circle-radius":        10,
          "circle-stroke-width":  2,
          "circle-stroke-color":  "rgba(255,255,255,0.75)",
          "circle-opacity":       0.92,
        },
      });

      /* Shop icon emoji label on individual dots */
      map.addLayer({
        id:     "shop-icons",
        type:   "symbol",
        source: "shops",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "text-field":           ["get", "icon"],
          "text-size":            11,
          "text-allow-overlap":   true,
          "text-ignore-placement":true,
          "text-offset":          [0, -0.05],
        },
        paint: { "text-color": "#ffffff" },
      });

      /* ── Tap: cluster → zoom in; shop → callback ───────────── */
      map.on("click", "clusters", async (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        const clusterId = (features[0]?.properties as any)?.cluster_id as number | undefined;
        if (clusterId == null) return;
        const src = map.getSource("shops") as GeoJSONSource;
        try {
          const zoom = await src.getClusterExpansionZoom(clusterId);
          const geom = features[0]?.geometry as GeoJSON.Point | undefined;
          if (!geom) return;
          map.easeTo({ center: geom.coordinates as [number, number], zoom: zoom + 0.5, duration: 350 });
        } catch { /* ignore */ }
      });

      map.on("click", "shop-points", (e) => {
        const props = e.features?.[0]?.properties as { id: string } | undefined;
        if (!props) return;
        const shop = shopDataRef.current.find(s => s.id === props.id);
        if (shop) onShopClick(shop);
      });

      /* Pointer cursor on interactive layers */
      ["clusters", "shop-points"].forEach(layer => {
        map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = "";        });
      });

      /* ── Initial shop load ──────────────────────────────────── */
      fetchShopsForBounds(map);
    });

    /* Reload on pan / zoom end */
    map.on("moveend", () => debouncedFetch(map));

    mapRef.current = map;
    return () => {
      userMarker.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Update user location marker ─────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || userLat == null || userLng == null) return;

    if (!userMarker.current) {
      /* Build a pulsing dot using a CSS-animated HTMLElement */
      const el = document.createElement("div");
      el.style.cssText = `
        position:relative; width:18px; height:18px;
        border-radius:50%; background:rgba(56,189,248,0.95);
        border:2.5px solid #fff;
        box-shadow:0 0 0 0 rgba(56,189,248,0.6);
        animation:map-pulse 2s infinite;
      `;
      /* Inject keyframe once */
      if (!document.getElementById("map-pulse-kf")) {
        const s = document.createElement("style");
        s.id = "map-pulse-kf";
        s.textContent = `
          @keyframes map-pulse {
            0%   { box-shadow:0 0 0 0   rgba(56,189,248,0.55); }
            70%  { box-shadow:0 0 0 12px rgba(56,189,248,0);   }
            100% { box-shadow:0 0 0 0   rgba(56,189,248,0);    }
          }
        `;
        document.head.appendChild(s);
      }
      userMarker.current = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([userLng, userLat])
        .addTo(map);
    } else {
      userMarker.current.setLngLat([userLng, userLat]);
    }

    /* Fly to user on first valid GPS fix */
    if (!mapRef.current?.isMoving()) {
      map.flyTo({ center: [userLng, userLat], zoom: 14, speed: 1.4, curve: 1.2, essential: true });
    }
  }, [userLat, userLng]);

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, minHeight: 0, width: "100%", background: "#05070C" }}
    />
  );
}
