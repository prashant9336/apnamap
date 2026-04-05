"use client";
/**
 * ExploreCard — one full-screen deal card in the Explore reel.
 *
 * Design rules:
 * - transform + opacity only, no layout props animated
 * - Dark card with per-tier colour glow
 * - Hero discount value as largest text element
 * - Two CTAs: "View Deal" + heart save
 */

import { useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatDistance } from "@/lib/geo/distance";

export interface ExploreItem {
  offerId:       string;
  offerTitle:    string;
  offerTier:     1 | 2 | 3;
  discountType:  string;
  discountLabel: string;
  discountValue: number | null;
  endsAt:        string | null;
  timeLeft:      string | null;
  isMystery:     boolean;
  isFeatured:    boolean;
  shopId:        string;
  shopName:      string;
  shopSlug:      string;
  isOpen:        boolean;
  logoUrl:       string | null;
  categoryName:  string;
  categoryIcon:  string;
  categorySlug:  string;
  localityName:  string;
  distance_m:    number | null;
}

/* ── Per-tier visual tokens ──────────────────────────────────────── */
const TIER: Record<1 | 2 | 3, { badge: string; label: string; glow: string; bar: string }> = {
  1: { badge: "🔥", label: "BIG DEAL",   glow: "rgba(255,94,26,0.18)",  bar: "#FF5E1A" },
  2: { badge: "⚡", label: "FLASH DEAL", glow: "rgba(232,168,0,0.18)",  bar: "#E8A800" },
  3: { badge: "🎯", label: "DEAL",       glow: "rgba(31,187,90,0.12)",  bar: "#1FBB5A" },
};

interface Props {
  item:       ExploreItem;
  isActive:   boolean;        // currently snapped into view
  onVisible?: () => void;     // fires when this card enters the snap zone
}

export default function ExploreCard({ item, isActive, onVisible }: Props) {
  const router     = useRouter();
  const cardRef    = useRef<HTMLDivElement>(null);
  const notified   = useRef(false);
  const tier       = TIER[item.offerTier];

  /* Notify parent once per visibility cycle */
  useEffect(() => {
    if (isActive && !notified.current) {
      notified.current = true;
      onVisible?.();
    }
    if (!isActive) notified.current = false;
  }, [isActive, onVisible]);

  /* Entrance: fade + slide up when becoming active */
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    if (isActive) {
      el.style.transition = "transform 320ms cubic-bezier(0.25,0,0,1), opacity 260ms ease";
      el.style.transform  = "translateY(0) scale(1)";
      el.style.opacity    = "1";
    } else {
      el.style.transition = "none";
      el.style.transform  = "translateY(12px) scale(0.97)";
      el.style.opacity    = "0.55";
    }
  }, [isActive]);

  const goToShop = useCallback(() => {
    router.push(`/shop/${item.shopSlug}`);
  }, [router, item.shopSlug]);

  return (
    <div
      style={{
        /* Snap target — full-screen slide */
        scrollSnapAlign:  "start",
        flexShrink:       0,
        height:           "100%",
        width:            "100%",
        position:         "relative",
        display:          "flex",
        flexDirection:    "column",
        alignItems:       "center",
        justifyContent:   "center",
        padding:          "0 20px 80px",
        background:       "#05070C",
        overflow:         "hidden",
      }}
    >
      {/* Tier glow backdrop */}
      <div style={{
        position:   "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse at 50% 38%, ${tier.glow} 0%, transparent 70%)`,
      }} />

      {/* Content wrapper — animates as unit */}
      <div
        ref={cardRef}
        style={{
          width:          "100%",
          maxWidth:       420,
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          gap:            0,
          transform:      "translateY(12px) scale(0.97)",
          opacity:        0.55,
          willChange:     "transform, opacity",
        }}
      >
        {/* Category icon ring */}
        <div style={{
          width:          72, height: 72,
          borderRadius:   22,
          background:     "rgba(255,255,255,0.06)",
          border:         `2px solid rgba(255,255,255,0.10)`,
          display:        "flex", alignItems: "center", justifyContent: "center",
          fontSize:       36,
          marginBottom:   18,
          boxShadow:      `0 0 32px ${tier.glow}`,
        }}>
          {item.categoryIcon}
        </div>

        {/* Tier badge */}
        <div style={{
          display:        "flex", alignItems: "center", gap: 5,
          padding:        "5px 12px",
          borderRadius:   100,
          background:     `${tier.bar}22`,
          border:         `1px solid ${tier.bar}55`,
          fontSize:       11, fontWeight: 700, letterSpacing: "0.08em",
          color:          tier.bar,
          marginBottom:   14,
        }}>
          {tier.badge} {tier.label}
          {item.timeLeft && (
            <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
              · {item.timeLeft}
            </span>
          )}
        </div>

        {/* Hero discount */}
        <div
          className="font-syne"
          style={{
            fontSize:     item.isMystery ? 28 : 52,
            fontWeight:   800,
            color:        item.isMystery ? "rgba(255,255,255,0.45)" : "#EDEEF5",
            letterSpacing:"-1.5px",
            lineHeight:   1.05,
            textAlign:    "center",
            marginBottom: 10,
          }}
        >
          {item.isMystery ? "🎁 Mystery Deal" : item.discountLabel}
        </div>

        {/* Offer title */}
        <div style={{
          fontSize:     14, fontWeight: 500,
          color:        "rgba(255,255,255,0.55)",
          textAlign:    "center",
          marginBottom: 20,
          maxWidth:     260,
          lineHeight:   1.4,
        }}>
          {item.offerTitle}
        </div>

        {/* Shop row */}
        <div style={{
          display:        "flex", alignItems: "center", gap: 10,
          padding:        "10px 16px",
          borderRadius:   14,
          background:     "rgba(255,255,255,0.04)",
          border:         "1px solid rgba(255,255,255,0.08)",
          width:          "100%",
          marginBottom:   24,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 14, fontWeight: 700, color: "#EDEEF5",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {item.shopName}
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2,
            }}>
              <span>{item.categoryName}</span>
              {item.localityName && <><span>·</span><span>{item.localityName}</span></>}
              {item.distance_m != null && (
                <><span>·</span>
                <span style={{ color: "#1FBB5A" }}>
                  📍 {formatDistance(item.distance_m)}
                </span></>
              )}
            </div>
          </div>

          {/* Open/closed pill */}
          <div style={{
            flexShrink: 0,
            padding:    "3px 9px",
            borderRadius: 100,
            fontSize:   10, fontWeight: 600,
            background: item.isOpen ? "rgba(31,187,90,0.12)" : "rgba(255,255,255,0.05)",
            color:      item.isOpen ? "#1FBB5A"               : "rgba(255,255,255,0.28)",
            border:     `1px solid ${item.isOpen ? "rgba(31,187,90,0.25)" : "rgba(255,255,255,0.08)"}`,
          }}>
            {item.isOpen ? "Open" : "Closed"}
          </div>
        </div>

        {/* CTA row */}
        <div style={{ display: "flex", gap: 10, width: "100%" }}>
          <button
            onClick={goToShop}
            style={{
              flex:         1, padding: "14px 0",
              borderRadius: 14,
              background:   tier.bar,
              color:        "#fff",
              fontWeight:   700, fontSize: 15,
              border:       "none", cursor: "pointer",
              fontFamily:   "'DM Sans', sans-serif",
              boxShadow:    `0 4px 20px ${tier.glow}`,
              letterSpacing: "0.01em",
            }}
          >
            View Deal →
          </button>
        </div>
      </div>

      {/* Bottom scroll hint — only on active card */}
      {isActive && (
        <div style={{
          position:   "absolute", bottom: 28, left: "50%",
          transform:  "translateX(-50%)",
          display:    "flex", flexDirection: "column", alignItems: "center", gap: 4,
          opacity:    0.3, pointerEvents: "none",
        }}>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.6)" }} />
          <div style={{ fontSize: 9, color: "#fff", letterSpacing: "0.08em" }}>SCROLL</div>
        </div>
      )}
    </div>
  );
}
