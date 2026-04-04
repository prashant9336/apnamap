"use client";

import { useRef, useLayoutEffect, useState, useCallback } from "react";

interface Props {
  localities:  string[];
  activeIdx:   number;
  onLocality?: (index: number) => void;
}

/**
 * Scroll-driven locality indicator.
 *
 * Design:
 *   Civil Lines  ─  Rambagh  ─  Katra
 *                      ●
 *
 * The dot slides using transform: translateX() — zero layout shift.
 * Transition is 180 ms cubic-bezier(0.25,0,0,1) for a snappy feel.
 *
 * Active locality label: white + slightly larger.
 * Inactive labels: dim (25 % opacity).
 * Completed localities (before active): green tint.
 *
 * Clicking a label scrolls the walk view to that locality.
 */
export default function LocalityIndicator({ localities, activeIdx, onLocality }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRefs    = useRef<Array<HTMLButtonElement | null>>([]);
  const [dotX, setDotX] = useState(0);

  // Measure the center x of the active label within the container
  // Uses useLayoutEffect so measurement happens after paint (no flicker)
  const updateDot = useCallback(() => {
    const container = containerRef.current;
    const label     = labelRefs.current[activeIdx];
    if (!container || !label) return;

    const cRect = container.getBoundingClientRect();
    const lRect = label.getBoundingClientRect();
    // Center of the label relative to container left edge
    const center = lRect.left - cRect.left + lRect.width / 2;
    setDotX(center);
  }, [activeIdx]);

  useLayoutEffect(() => {
    updateDot();
    // Re-measure on window resize (orientation change on mobile)
    window.addEventListener("resize", updateDot);
    return () => window.removeEventListener("resize", updateDot);
  }, [updateDot]);

  if (!localities.length) return null;

  const DOT_SIZE   = 6;
  const DASH_COLOR = "rgba(255,255,255,0.12)";

  return (
    <div style={{
      flexShrink: 0,
      padding: "7px 14px 10px",
      background: "rgba(5,7,12,0.90)",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      {/* ── Locality name rail ── */}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          // Horizontal scroll when localities overflow on narrow screens
          overflowX: localities.length > 5 ? "auto" : "visible",
          paddingBottom: 10, // room for the dot row below
        }}
        className="scroll-none"
      >
        {localities.map((name, i) => {
          const isDone    = i < activeIdx;
          const isCurrent = i === activeIdx;
          // Short label: first word (or first 8 chars if one very long word)
          const short = name.split(" ")[0].slice(0, 10);

          return (
            <div
              key={`${name}-${i}`}
              style={{
                display: "flex",
                alignItems: "center",
                flex: i < localities.length - 1 ? 1 : "none",
                minWidth: 0,
              }}
            >
              <button
                ref={el => { labelRefs.current[i] = el; }}
                onClick={() => onLocality?.(i)}
                style={{
                  background: "none",
                  border: "none",
                  padding: "0 2px",
                  cursor: onLocality ? "pointer" : "default",
                  flexShrink: 0,
                  // transition on color + font-size for active state
                  transition: "color 180ms ease, opacity 180ms ease",
                  color: isCurrent
                    ? "#EDEEF5"
                    : isDone
                      ? "#1FBB5A"
                      : "rgba(255,255,255,0.25)",
                  fontSize: isCurrent ? "11.5px" : "10.5px",
                  fontWeight: isCurrent ? 700 : 500,
                  fontFamily: "'DM Sans', sans-serif",
                  whiteSpace: "nowrap",
                  lineHeight: 1,
                }}
                aria-label={`Go to ${name}`}
                aria-current={isCurrent ? "true" : undefined}
              >
                {short}
              </button>

              {/* Dash connector between localities */}
              {i < localities.length - 1 && (
                <div style={{
                  flex: 1,
                  height: 1,
                  margin: "0 4px",
                  background: isDone
                    ? "rgba(31,187,90,0.35)"
                    : DASH_COLOR,
                  transition: "background 300ms ease",
                }} />
              )}
            </div>
          );
        })}

        {/* ── Sliding dot — transform only, no layout shift ── */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width:  DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: "50%",
            background: "#FF5E1A",
            boxShadow: "0 0 6px rgba(255,94,26,0.70)",
            // translateX centers the dot under the active label
            transform: `translateX(${dotX - DOT_SIZE / 2}px)`,
            transition: "transform 180ms cubic-bezier(0.25, 0, 0, 1)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
