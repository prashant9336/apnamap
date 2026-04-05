"use client";
/**
 * ExploreFeed — TikTok/Reels-style vertical scroll of deal cards.
 *
 * Performance contract:
 * - CSS scroll-snap-type: y mandatory → native 60fps snapping, no JS scroll math
 * - IntersectionObserver per card → zero RAF loops, no scroll listeners
 * - Items are loaded in batches of 15; more fetched when 3 from end
 * - Max ~45 items in DOM at once (manageable; each card has no heavy media)
 * - transform + opacity only → compositor-only animations
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useGeo } from "@/hooks/useGeo";
import ExploreCard, { type ExploreItem } from "./ExploreCard";

const BATCH  = 15;
const PREFETCH_THRESHOLD = 3; // fetch more when this many cards from end

/* ── Skeleton placeholder ────────────────────────────────────────── */
function Skeleton() {
  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 16,
    }}>
      {[72, 28, 52, 40, 48].map((h, i) => (
        <div key={i} style={{
          width:        i === 0 ? 72 : `${h + 100 + (i % 2) * 60}px`,
          height:       i === 0 ? 72 : h,
          borderRadius: i === 0 ? 22 : 10,
          background:   "rgba(255,255,255,0.06)",
          animation:    `explore-pulse 1.6s ${i * 0.12}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────────── */
function EmptyState({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 14,
      padding: "0 32px",
    }}>
      <div style={{ fontSize: 48 }}>🏙️</div>
      <div className="font-syne" style={{ fontSize: 18, fontWeight: 800, color: "#EDEEF5", textAlign: "center" }}>
        No active deals nearby
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", textAlign: "center" }}>
        Check back soon — shops add deals throughout the day.
      </div>
      <button
        onClick={onRetry}
        style={{
          marginTop: 8, padding: "10px 22px", borderRadius: 12,
          background: "#FF5E1A", color: "#fff",
          fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Refresh
      </button>
    </div>
  );
}

/* ── Main feed ───────────────────────────────────────────────────── */
export default function ExploreFeed() {
  const { geo } = useGeo();

  const [items,       setItems]       = useState<ExploreItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(true);
  const [activeIdx,   setActiveIdx]   = useState(0);
  const [error,       setError]       = useState(false);

  const offsetRef   = useRef(0);
  const fetchingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /* ── Fetch a batch of deals ──────────────────────────────────── */
  const fetchBatch = useCallback(async (reset = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    const off = reset ? 0 : offsetRef.current;
    const lat = geo.lat ?? 25.4358;
    const lng = geo.lng ?? 81.8463;

    try {
      const res  = await fetch(
        `/api/explore?lat=${lat}&lng=${lng}&limit=${BATCH}&offset=${off}`,
        { cache: "no-store" },
      );
      const json = await res.json() as { items?: ExploreItem[]; error?: string };
      const batch = Array.isArray(json.items) ? json.items : [];

      if (reset) {
        setItems(batch);
        offsetRef.current = batch.length;
        setActiveIdx(0);
        setError(false);
      } else {
        setItems(prev => [...prev, ...batch]);
        offsetRef.current += batch.length;
      }

      setHasMore(batch.length === BATCH);
    } catch {
      if (reset) setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  }, [geo.lat, geo.lng]);

  /* Initial load — runs once geo is ready */
  useEffect(() => {
    if (geo.loading) return;
    setLoading(true);
    fetchBatch(true);
  }, [geo.loading]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── IntersectionObserver: track active card + trigger preload ─ */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || items.length === 0) return;

    const cards = Array.from(container.querySelectorAll<HTMLElement>("[data-explore-idx]"));

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = parseInt((entry.target as HTMLElement).dataset.exploreIdx ?? "0");
          setActiveIdx(idx);

          /* Preload next batch when 3 from the end */
          if (hasMore && !loadingMore && idx >= items.length - PREFETCH_THRESHOLD) {
            setLoadingMore(true);
            fetchBatch(false);
          }
        }
      },
      {
        root:       container,
        threshold:  0.6,  // card must be 60% visible to be "active"
      },
    );

    cards.forEach(c => obs.observe(c));
    return () => obs.disconnect();
  }, [items, hasMore, loadingMore, fetchBatch]);

  if (loading) {
    return (
      <div style={{ height: "100%", background: "#05070C", position: "relative" }}>
        <style>{`
          @keyframes explore-pulse {
            0%,100% { opacity:0.5; } 50% { opacity:0.15; }
          }
        `}</style>
        <Skeleton />
      </div>
    );
  }

  if (error || items.length === 0) {
    return (
      <div style={{ height: "100%", background: "#05070C" }}>
        <EmptyState onRetry={() => { setLoading(true); fetchBatch(true); }} />
      </div>
    );
  }

  return (
    <div
      style={{ height: "100%", background: "#05070C", position: "relative" }}
    >
      {/* Inject pulse keyframe once */}
      <style>{`
        @keyframes explore-pulse {
          0%,100% { opacity:0.5; } 50% { opacity:0.15; }
        }
      `}</style>

      {/* Progress dots — right rail */}
      <div style={{
        position:   "absolute", right: 12, top: "50%",
        transform:  "translateY(-50%)",
        display:    "flex", flexDirection: "column", gap: 5,
        zIndex:     10, pointerEvents: "none",
      }}>
        {items.slice(0, Math.min(items.length, 12)).map((_, i) => (
          <div key={i} style={{
            width:        i === activeIdx ? 4 : 3,
            height:       i === activeIdx ? 18 : 5,
            borderRadius: 4,
            background:   i === activeIdx ? "#FF5E1A" : "rgba(255,255,255,0.20)",
            transition:   "all 280ms cubic-bezier(0.25,0,0,1)",
          }} />
        ))}
        {items.length > 12 && (
          <div style={{
            width: 3, height: 3, borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
          }} />
        )}
      </div>

      {/* Scroll container with native snap */}
      <div
        ref={containerRef}
        style={{
          height:               "100%",
          overflowY:            "scroll",
          scrollSnapType:       "y mandatory",
          overscrollBehavior:   "contain",
          WebkitOverflowScrolling: "touch",
          /* Hide scrollbar — purely cosmetic */
          scrollbarWidth:       "none",
          msOverflowStyle:      "none",
        }}
        className="scroll-none"
      >
        {items.map((item, idx) => (
          <div
            key={item.offerId}
            data-explore-idx={idx}
            style={{ height: "100%", flexShrink: 0 }}
          >
            <ExploreCard
              item={item}
              isActive={idx === activeIdx}
            />
          </div>
        ))}

        {/* Loading more indicator */}
        {loadingMore && (
          <div style={{
            height:         "100%", display: "flex",
            alignItems:     "center", justifyContent: "center",
            scrollSnapAlign:"start", flexShrink: 0,
          }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>
              Loading more deals…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
