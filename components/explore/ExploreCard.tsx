"use client";
/**
 * ExploreCard — one full-screen snap card in the Explore reel.
 *
 * itemType variants:
 *   "deal"       — real active offer, hero discount value
 *   "shop"       — nearby shop with no active deal, placeholder CTA
 *   "invite_cta" — static end-of-feed card to invite local shops
 *
 * Animation rules: transform + opacity only, no layout props.
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
  itemType:      "deal" | "shop" | "invite_cta";
  isNew:         boolean;
}

/* ── Per-tier tokens (deals) ─────────────────────────────────────── */
const TIER: Record<1 | 2 | 3, { badge: string; label: string; glow: string; bar: string }> = {
  1: { badge: "🔥", label: "BIG DEAL",   glow: "rgba(255,94,26,0.18)",  bar: "#FF5E1A" },
  2: { badge: "⚡", label: "FLASH DEAL", glow: "rgba(232,168,0,0.18)",  bar: "#E8A800" },
  3: { badge: "🎯", label: "DEAL",       glow: "rgba(31,187,90,0.12)",  bar: "#1FBB5A" },
};

/* ── Shop card tokens ────────────────────────────────────────────── */
const SHOP_TOKEN  = { badge: "📍", label: "NEARBY SHOP", glow: "rgba(99,179,237,0.12)",  bar: "#63B3ED" };
const NEW_TOKEN   = { badge: "✨", label: "NEW SHOP",     glow: "rgba(167,139,250,0.15)", bar: "#A78BFA" };

interface Props {
  item:     ExploreItem;
  isActive: boolean;
}

export default function ExploreCard({ item, isActive }: Props) {
  const router  = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);

  /* Entrance animation — runs when isActive flips */
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    if (isActive) {
      el.style.transition = "transform 320ms cubic-bezier(0.25,0,0,1), opacity 260ms ease";
      el.style.transform  = "translateY(0) scale(1)";
      el.style.opacity    = "1";
    } else {
      el.style.transition = "none";
      el.style.transform  = "translateY(14px) scale(0.97)";
      el.style.opacity    = "0.5";
    }
  }, [isActive]);

  if (item.itemType === "invite_cta") {
    return <InviteCard isActive={isActive} />;
  }

  const isShop  = item.itemType === "shop";
  const token   = isShop ? (item.isNew ? NEW_TOKEN : SHOP_TOKEN) : TIER[item.offerTier];
  const ctaLabel = isShop
    ? (item.isNew ? "Be First to Visit →" : "Visit Shop →")
    : "View Deal →";

  const handleCta = () => router.push(`/shop/${item.shopSlug}`);

  /* Hero text — deals show discount, shops show shop name */
  const heroText  = isShop
    ? item.shopName
    : item.isMystery ? "🎁 Mystery Deal" : item.discountLabel;
  const heroSize  = isShop ? 34 : item.isMystery ? 28 : 52;
  const heroColor = isShop ? "#EDEEF5" : item.isMystery ? "rgba(255,255,255,0.45)" : "#EDEEF5";

  return (
    <div
      style={{
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
      {/* Glow backdrop */}
      <div style={{
        position:   "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse at 50% 38%, ${token.glow} 0%, transparent 70%)`,
      }} />

      {/* "NEW" ribbon — top-left corner for new shops */}
      {item.isNew && (
        <div style={{
          position:   "absolute", top: 16, left: 16,
          padding:    "4px 10px",
          borderRadius: 8,
          background: "rgba(167,139,250,0.15)",
          border:     "1px solid rgba(167,139,250,0.35)",
          fontSize:   10, fontWeight: 700, letterSpacing: "0.1em",
          color:      "#A78BFA",
        }}>
          NEW ON APNAMAP
        </div>
      )}

      {/* Content wrapper — animates as unit */}
      <div
        ref={cardRef}
        style={{
          width:         "100%",
          maxWidth:      420,
          display:       "flex",
          flexDirection: "column",
          alignItems:    "center",
          transform:     "translateY(14px) scale(0.97)",
          opacity:       0.5,
          willChange:    "transform, opacity",
        }}
      >
        {/* Category icon */}
        <div style={{
          width:         72, height: 72,
          borderRadius:  22,
          background:    "rgba(255,255,255,0.06)",
          border:        "2px solid rgba(255,255,255,0.10)",
          display:       "flex", alignItems: "center", justifyContent: "center",
          fontSize:      36,
          marginBottom:  18,
          boxShadow:     `0 0 32px ${token.glow}`,
        }}>
          {item.categoryIcon || "🏪"}
        </div>

        {/* Tier / type badge */}
        <div style={{
          display:       "flex", alignItems: "center", gap: 5,
          padding:       "5px 12px",
          borderRadius:  100,
          background:    `${token.bar}22`,
          border:        `1px solid ${token.bar}55`,
          fontSize:      11, fontWeight: 700, letterSpacing: "0.08em",
          color:         token.bar,
          marginBottom:  14,
        }}>
          {token.badge} {token.label}
          {item.timeLeft && (
            <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
              · {item.timeLeft}
            </span>
          )}
        </div>

        {/* Hero text */}
        <div
          className="font-syne"
          style={{
            fontSize:      heroSize,
            fontWeight:    800,
            color:         heroColor,
            letterSpacing: heroSize >= 40 ? "-1.5px" : "-0.5px",
            lineHeight:    1.05,
            textAlign:     "center",
            marginBottom:  10,
            maxWidth:      300,
          }}
        >
          {heroText}
        </div>

        {/* Sub-label */}
        <div style={{
          fontSize:      14, fontWeight: 500,
          color:         "rgba(255,255,255,0.50)",
          textAlign:     "center",
          marginBottom:  20,
          maxWidth:      260,
          lineHeight:    1.4,
        }}>
          {isShop ? item.offerTitle : item.offerTitle}
        </div>

        {/* Shop info row (for deal cards only — shop cards already show name as hero) */}
        {!isShop && (
          <div style={{
            display:       "flex", alignItems: "center", gap: 10,
            padding:       "10px 16px",
            borderRadius:  14,
            background:    "rgba(255,255,255,0.04)",
            border:        "1px solid rgba(255,255,255,0.08)",
            width:         "100%",
            marginBottom:  24,
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
                  <span style={{ color: "#1FBB5A" }}>📍 {formatDistance(item.distance_m)}</span></>
                )}
              </div>
            </div>
            <div style={{
              flexShrink: 0, padding: "3px 9px", borderRadius: 100,
              fontSize: 10, fontWeight: 600,
              background: item.isOpen ? "rgba(31,187,90,0.12)" : "rgba(255,255,255,0.05)",
              color:      item.isOpen ? "#1FBB5A"               : "rgba(255,255,255,0.28)",
              border:     `1px solid ${item.isOpen ? "rgba(31,187,90,0.25)" : "rgba(255,255,255,0.08)"}`,
            }}>
              {item.isOpen ? "Open" : "Closed"}
            </div>
          </div>
        )}

        {/* Locality + distance for shop cards (shown below hero) */}
        {isShop && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 12, color: "rgba(255,255,255,0.35)",
            marginBottom: 28,
          }}>
            {item.localityName && <span>{item.localityName}</span>}
            {item.localityName && item.distance_m != null && <span>·</span>}
            {item.distance_m != null && (
              <span style={{ color: "#1FBB5A" }}>📍 {formatDistance(item.distance_m)}</span>
            )}
            {item.isOpen !== undefined && (
              <><span>·</span>
              <span style={{ color: item.isOpen ? "#1FBB5A" : "rgba(255,255,255,0.28)" }}>
                {item.isOpen ? "Open" : "Closed"}
              </span></>
            )}
          </div>
        )}

        {/* CTA */}
        <div style={{ width: "100%" }}>
          <button
            onClick={handleCta}
            style={{
              width:         "100%", padding: "14px 0",
              borderRadius:  14,
              background:    token.bar,
              color:         "#fff",
              fontWeight:    700, fontSize: 15,
              border:        "none", cursor: "pointer",
              fontFamily:    "'DM Sans', sans-serif",
              boxShadow:     `0 4px 20px ${token.glow}`,
              letterSpacing: "0.01em",
            }}
          >
            {ctaLabel}
          </button>
        </div>
      </div>

      {/* Scroll hint */}
      {isActive && (
        <div style={{
          position:   "absolute", bottom: 28, left: "50%",
          transform:  "translateX(-50%)",
          display:    "flex", flexDirection: "column", alignItems: "center", gap: 4,
          opacity:    0.28, pointerEvents: "none",
        }}>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.6)" }} />
          <div style={{ fontSize: 9, color: "#fff", letterSpacing: "0.08em" }}>SCROLL</div>
        </div>
      )}
    </div>
  );
}

/* ── Invite CTA card ─────────────────────────────────────────────── */
function InviteCard({ isActive }: { isActive: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    if (isActive) {
      el.style.transition = "transform 320ms cubic-bezier(0.25,0,0,1), opacity 260ms ease";
      el.style.transform  = "translateY(0) scale(1)";
      el.style.opacity    = "1";
    } else {
      el.style.transition = "none";
      el.style.transform  = "translateY(14px) scale(0.97)";
      el.style.opacity    = "0.5";
    }
  }, [isActive]);

  const handleShare = useCallback(() => {
    const text = "Discover deals from local shops near you on ApnaMap!";
    if (navigator.share) {
      navigator.share({ title: "ApnaMap", text, url: window.location.origin }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(`${text} ${window.location.origin}`).catch(() => {});
    }
  }, []);

  return (
    <div
      style={{
        scrollSnapAlign: "start",
        flexShrink:      0,
        height:          "100%",
        width:           "100%",
        position:        "relative",
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        padding:         "0 24px 80px",
        background:      "#05070C",
        overflow:        "hidden",
      }}
    >
      {/* Glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at 50% 40%, rgba(255,94,26,0.10) 0%, transparent 65%)",
      }} />

      <div
        ref={cardRef}
        style={{
          width:         "100%",
          maxWidth:      400,
          display:       "flex",
          flexDirection: "column",
          alignItems:    "center",
          textAlign:     "center",
          transform:     "translateY(14px) scale(0.97)",
          opacity:       0.5,
          willChange:    "transform, opacity",
        }}
      >
        {/* Icon */}
        <div style={{
          width:        80, height: 80,
          borderRadius: 24,
          background:   "rgba(255,94,26,0.10)",
          border:       "2px solid rgba(255,94,26,0.20)",
          display:      "flex", alignItems: "center", justifyContent: "center",
          fontSize:     38,
          marginBottom: 20,
          boxShadow:    "0 0 40px rgba(255,94,26,0.15)",
        }}>
          🤝
        </div>

        <div className="font-syne" style={{
          fontSize: 26, fontWeight: 800,
          color: "#EDEEF5", letterSpacing: "-0.5px",
          marginBottom: 10, lineHeight: 1.2,
        }}>
          Invite Shops Near You
        </div>

        <div style={{
          fontSize: 14, color: "rgba(255,255,255,0.45)",
          lineHeight: 1.6, maxWidth: 280, marginBottom: 32,
        }}>
          Know a local shop that isn't on ApnaMap yet? Help your neighborhood go digital.
        </div>

        <button
          onClick={handleShare}
          style={{
            width:        "100%", padding: "14px 0",
            borderRadius: 14,
            background:   "#FF5E1A",
            color:        "#fff",
            fontWeight:   700, fontSize: 15,
            border:       "none", cursor: "pointer",
            fontFamily:   "'DM Sans', sans-serif",
            boxShadow:    "0 4px 24px rgba(255,94,26,0.30)",
            marginBottom: 12,
          }}
        >
          Share ApnaMap →
        </button>

        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.22)" }}>
          More shops = more deals for everyone
        </div>
      </div>
    </div>
  );
}
