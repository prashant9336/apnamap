"use client";

import { useRef, useLayoutEffect, useCallback } from "react";

interface Props {
  localities:      string[];
  activeIdx:       number;
  nearestIdx?:     number;   // index of GPS-nearest locality — gets a 📍 pin
  /** Continuous 0-1 fraction of the scroll container's scrollable height. */
  scrollProgress:  number;
  onLocality?:     (index: number) => void;
}

/**
 * LocalityIndicator
 *
 * Visual structure (top → bottom):
 *
 *   Civil Lines    Rambagh    Katra      ← clickable label row
 *   ─────────────────────────────        ← dim background track
 *   ████████░░░░░░░░░░░░░░░░░░░░         ← orange progress line (scaleX)
 *                ●                       ← dot slides via translateX
 *
 * Animation contract:
 *   • Background track  — static, full width between label centers
 *   • Progress line     — transform: scaleX(scrollProgress)
 *                         transformOrigin: left center
 *                         NO width change → GPU composited, zero layout shift
 *   • Dot               — transform: translateX(x)
 *                         x interpolated between measured label-center positions
 *                         based on scrollProgress
 *
 * Both the line and the dot are mutated via direct DOM ref writes inside
 * useLayoutEffect, so they update synchronously after each React paint
 * without scheduling an extra React commit.
 *
 * Performance: O(1) on every scroll tick — no querySelectorAll, no
 * getBoundingClientRect inside the hot path.
 */
export default function LocalityIndicator({
  localities,
  activeIdx,
  nearestIdx = 0,
  scrollProgress,
  onLocality,
}: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const trackBgRef    = useRef<HTMLDivElement>(null);
  const trackFgRef    = useRef<HTMLDivElement>(null);
  const dotRef        = useRef<HTMLDivElement>(null);

  // Measured center-x of each label, relative to containerRef left edge.
  // Populated once after first paint, re-measured on resize.
  const labelCenters  = useRef<number[]>([]);
  const labelRefs     = useRef<Array<HTMLButtonElement | null>>([]);

  const DOT_R    = 4;   // dot radius px
  const DOT_SIZE = DOT_R * 2;

  /* ── Measure label positions ──────────────────────────────────── */
  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    labelCenters.current = labelRefs.current.map(el => {
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return r.left - cRect.left + r.width / 2;
    });
    // Reposition track background to span first→last label
    applyProgress(scrollProgress);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localities]);   // re-measure when locality list changes

  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  /* ── Apply progress to DOM directly (no extra React render) ───── */
  const applyProgress = useCallback((p: number) => {
    const centers = labelCenters.current;
    if (!centers.length) return;

    const n         = centers.length;
    const firstX    = centers[0];
    const lastX     = centers[n - 1];
    const trackW    = Math.max(0, lastX - firstX);

    // Position + size the track background once
    if (trackBgRef.current) {
      trackBgRef.current.style.left  = `${firstX}px`;
      trackBgRef.current.style.width = `${trackW}px`;
    }

    // Progress line: same geometry, scaleX driven by p
    if (trackFgRef.current) {
      trackFgRef.current.style.left      = `${firstX}px`;
      trackFgRef.current.style.width     = `${trackW}px`;
      trackFgRef.current.style.transform = `scaleX(${p})`;
    }

    // Dot: interpolate between label centers
    let dotX: number;
    if (n === 1) {
      dotX = firstX;
    } else {
      // raw position along the label array (0 → N-1)
      const raw     = p * (n - 1);
      const seg     = Math.min(Math.floor(raw), n - 2); // segment index (0 → N-2)
      const frac    = raw - seg;                         // fraction within segment (0-1)
      dotX = centers[seg] + frac * (centers[seg + 1] - centers[seg]);
    }

    if (dotRef.current) {
      dotRef.current.style.transform = `translateX(${dotX - DOT_R}px)`;
    }
  }, [DOT_R]);

  // Run applyProgress every time scrollProgress prop changes
  useLayoutEffect(() => {
    applyProgress(scrollProgress);
  }, [scrollProgress, applyProgress]);

  /* ── Active-label color update (label states) ─────────────────── */
  // We keep this in React state (labels are few, paint is cheap)
  // activeIdx is already derived from scroll in WalkView

  if (!localities.length) return null;

  return (
    <div style={{
      flexShrink: 0,
      padding: "8px 14px 12px",
      background: "rgba(5,7,12,0.92)",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      {/*
       * Outer wrapper: relative-positioned so track + dot can be
       * absolutely positioned below the label row.
       */}
      <div
        ref={containerRef}
        style={{ position: "relative", paddingBottom: 10 }}
      >
        {/* ── Label row ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          overflowX: localities.length > 6 ? "auto" : "visible",
          marginBottom: 6,
        }}
          className="scroll-none"
        >
          {localities.map((name, i) => {
            const isDone    = i < activeIdx;
            const isCurrent = i === activeIdx;
            const isNearest = i === nearestIdx;
            const short     = name.split(" ")[0].slice(0, 11);

            return (
              <button
                key={`${name}-${i}`}
                ref={el => { labelRefs.current[i] = el; }}
                onClick={() => onLocality?.(i)}
                aria-label={`Jump to ${name}`}
                aria-current={isCurrent ? "true" : undefined}
                style={{
                  background: "none",
                  border: "none",
                  padding: "2px 3px",
                  cursor: onLocality ? "pointer" : "default",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize:   isCurrent ? "11.5px" : "10.5px",
                  fontWeight: isCurrent ? 700 : 500,
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                  transition: "color 160ms ease, font-size 160ms ease",
                  color: isCurrent
                    ? "#EDEEF5"
                    : isDone
                      ? "#1FBB5A"
                      : "rgba(255,255,255,0.28)",
                  position: "relative",
                }}
              >
                {/* GPS "you are here" dot on nearest locality */}
                {isNearest && nearestIdx >= 0 && (
                  <span style={{
                    position: "absolute",
                    top: -5,
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: "7px",
                    lineHeight: 1,
                  }}>📍</span>
                )}
                {short}
              </button>
            );
          })}
        </div>

        {/* ── Background track ── */}
        <div
          ref={trackBgRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: DOT_SIZE / 2 - 1,   // vertically centered on dot
            height: 2,
            borderRadius: 2,
            background: "rgba(255,255,255,0.09)",
            // left + width set by measure() via ref
          }}
        />

        {/* ── Progress line (scaleX animated) ── */}
        <div
          ref={trackFgRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: DOT_SIZE / 2 - 1,
            height: 2,
            borderRadius: 2,
            // Gradient: green (done) → orange (leading edge)
            background: "linear-gradient(to right, #1FBB5A 0%, #FF5E1A 100%)",
            // scaleX set by applyProgress() — NO width changes
            transformOrigin: "left center",
            transform: "scaleX(0)",
            willChange: "transform",
          }}
        />

        {/* ── Sliding dot ── */}
        <div
          ref={dotRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width:  DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: "50%",
            background: "#FF5E1A",
            boxShadow: "0 0 7px rgba(255,94,26,0.80), 0 0 14px rgba(255,94,26,0.30)",
            // transform set by applyProgress() via ref
            transform: "translateX(-9999px)", // hidden until first measure
            willChange: "transform",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
