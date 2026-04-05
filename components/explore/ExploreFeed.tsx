"use client";
/**
 * ExploreFeed — vertical snap reel of deal + shop cards.
 *
 * The feed is NEVER empty:
 *   - API always returns fallback shop cards + invite CTA
 *   - Error path shows an inline retry card, not an empty screen
 *
 * Performance:
 * - scroll-snap-type: y mandatory → native 60fps snapping
 * - IntersectionObserver (threshold 0.6) tracks active card
 * - Batch loads 15 items; prefetches next batch 3 cards before end
 * - transform + opacity only
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useGeo } from "@/hooks/useGeo";
import ExploreCard, { type ExploreItem } from "./ExploreCard";

const BATCH               = 15;
const PREFETCH_THRESHOLD  = 3;

/* ── Skeleton ────────────────────────────────────────────────────── */
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

/* ── Inline retry card (shown inside the reel, not as empty screen) */
function RetryCard({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{
      scrollSnapAlign: "start", flexShrink: 0,
      height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 16,
      padding: "0 32px 80px",
    }}>
      <div style={{ fontSize: 40 }}>🔄</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.55)", textAlign: "center" }}>
        Couldn't load deals
      </div>
      <button
        onClick={onRetry}
        style={{
          padding: "10px 24px", borderRadius: 12,
          background: "#FF5E1A", color: "#fff",
          fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Try Again
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
  const [fetchError,  setFetchError]  = useState(false);

  const offsetRef    = useRef(0);
  const fetchingRef  = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /* ── Fetch batch ───────────────────────────────────────────────── */
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
        setFetchError(false);
      } else {
        setItems(prev => [...prev, ...batch]);
        offsetRef.current += batch.length;
      }

      setHasMore(batch.length === BATCH);
    } catch {
      if (reset) setFetchError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  }, [geo.lat, geo.lng]);

  /* Initial load once geo settles */
  useEffect(() => {
    if (geo.loading) return;
    setLoading(true);
    fetchBatch(true);
  }, [geo.loading]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── IntersectionObserver: active card tracking + prefetch ────── */
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

          if (hasMore && !loadingMore && idx >= items.length - PREFETCH_THRESHOLD) {
            setLoadingMore(true);
            fetchBatch(false);
          }
        }
      },
      { root: container, threshold: 0.6 },
    );

    cards.forEach(c => obs.observe(c));
    return () => obs.disconnect();
  }, [items, hasMore, loadingMore, fetchBatch]);

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <div style={{ height: "100%", background: "#05070C", position: "relative" }}>
      <style>{`
        @keyframes explore-pulse {
          0%,100% { opacity:0.5; } 50% { opacity:0.15; }
        }
      `}</style>

      {loading ? (
        <Skeleton />
      ) : fetchError ? (
        /* Error — show retry card directly in the reel layout */
        <div style={{
          height: "100%", overflowY: "scroll",
          scrollSnapType: "y mandatory", overscrollBehavior: "contain",
          scrollbarWidth: "none",
        }} className="scroll-none">
          <RetryCard onRetry={() => { setLoading(true); fetchBatch(true); }} />
        </div>
      ) : (
        <>
          {/* Progress dots — right rail */}
          <div style={{
            position: "absolute", right: 12, top: "50%",
            transform: "translateY(-50%)",
            display: "flex", flexDirection: "column", gap: 5,
            zIndex: 10, pointerEvents: "none",
          }}>
            {items.slice(0, Math.min(items.length, 12)).map((item, i) => {
              const isInvite = item.itemType === "invite_cta";
              return (
                <div key={i} style={{
                  width:        i === activeIdx ? 4 : 3,
                  height:       i === activeIdx ? 18 : isInvite ? 8 : 5,
                  borderRadius: 4,
                  background:   i === activeIdx
                    ? "#FF5E1A"
                    : isInvite
                    ? "rgba(255,94,26,0.35)"
                    : "rgba(255,255,255,0.20)",
                  transition: "all 280ms cubic-bezier(0.25,0,0,1)",
                }} />
              );
            })}
            {items.length > 12 && (
              <div style={{
                width: 3, height: 3, borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
              }} />
            )}
          </div>

          {/* Scroll container */}
          <div
            ref={containerRef}
            style={{
              height:                  "100%",
              overflowY:               "scroll",
              scrollSnapType:          "y mandatory",
              overscrollBehavior:      "contain",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth:          "none",
              msOverflowStyle:         "none",
            }}
            className="scroll-none"
          >
            {items.map((item, idx) => (
              <div
                key={item.offerId}
                data-explore-idx={idx}
                style={{ height: "100%", flexShrink: 0 }}
              >
                <ExploreCard item={item} isActive={idx === activeIdx} />
              </div>
            ))}

            {loadingMore && (
              <div style={{
                height: "100%", display: "flex",
                alignItems: "center", justifyContent: "center",
                scrollSnapAlign: "start", flexShrink: 0,
              }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.22)" }}>
                  Loading more…
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
