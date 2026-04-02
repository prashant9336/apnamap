"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useRouter } from "next/navigation";
import { formatDistance } from "@/lib/geo/distance";
import type { WalkShop, Offer } from "@/types";

/* ── Category tints ──────────────────────────────────────────────── */
const CAT_SKIN: Record<string, string> = {
  "sweet-shop":    "rgba(255,140,0,0.10)",
  "restaurant":    "rgba(255,140,0,0.09)",
  "street-food":   "rgba(255,107,53,0.10)",
  "grocery":       "rgba(34,197,94,0.07)",
  "fashion":       "rgba(236,72,153,0.10)",
  "electronics":   "rgba(56,189,248,0.08)",
  "salon":         "rgba(167,139,250,0.09)",
  "mobile-repair": "rgba(56,189,248,0.08)",
  "jewellery":     "rgba(232,168,0,0.09)",
  "pharmacy":      "rgba(34,197,94,0.07)",
  "coaching":      "rgba(99,179,237,0.08)",
  "gym":           "rgba(52,211,153,0.07)",
};

/* ── Category icon box colors ────────────────────────────────────── */
const CAT_ICON_BG: Record<string, { bg: string; border: string }> = {
  "sweet-shop":    { bg: "rgba(255,140,0,0.12)",   border: "rgba(255,140,0,0.20)"   },
  "restaurant":    { bg: "rgba(255,140,0,0.10)",   border: "rgba(255,140,0,0.18)"   },
  "street-food":   { bg: "rgba(255,107,53,0.10)",  border: "rgba(255,107,53,0.18)"  },
  "grocery":       { bg: "rgba(34,197,94,0.09)",   border: "rgba(34,197,94,0.16)"   },
  "fashion":       { bg: "rgba(236,72,153,0.10)",  border: "rgba(236,72,153,0.18)"  },
  "electronics":   { bg: "rgba(56,189,248,0.10)",  border: "rgba(56,189,248,0.18)"  },
  "salon":         { bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.18)" },
  "mobile-repair": { bg: "rgba(56,189,248,0.10)",  border: "rgba(56,189,248,0.18)"  },
  "jewellery":     { bg: "rgba(232,168,0,0.10)",   border: "rgba(232,168,0,0.18)"   },
  "pharmacy":      { bg: "rgba(34,197,94,0.09)",   border: "rgba(34,197,94,0.16)"   },
  "coaching":      { bg: "rgba(99,179,237,0.10)",  border: "rgba(99,179,237,0.18)"  },
  "gym":           { bg: "rgba(52,211,153,0.09)",  border: "rgba(52,211,153,0.16)"  },
};
const CAT_ICON_FB = { bg: "rgba(255,255,255,0.07)", border: "rgba(255,255,255,0.10)" };

/* ── Status helper ───────────────────────────────────────────────── */
function parseTimeMins(t: string | null): number | null {
  if (!t) return null;
  const parts = t.split(":");
  const h = parseInt(parts[0] ?? "0");
  const m = parseInt(parts[1] ?? "0");
  return h * 60 + m;
}

interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
}

function getStatus(shop: WalkShop): StatusConfig {
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const closeMins   = parseTimeMins(shop.close_time);
  const openMins    = parseTimeMins(shop.open_time);

  if (shop.is_open) {
    // Closing soon: within 45 min of close time
    if (closeMins !== null) {
      const minsLeft = closeMins - currentMins;
      if (minsLeft > 0 && minsLeft <= 45) {
        return {
          label:  `🟡 Closes in ${minsLeft}m`,
          color:  "#E8A800",
          bg:     "rgba(232,168,0,0.10)",
          border: "1px solid rgba(232,168,0,0.24)",
        };
      }
    }
    return {
      label:  "🟢 Open now",
      color:  "#1FBB5A",
      bg:     "rgba(31,187,90,0.10)",
      border: "1px solid rgba(31,187,90,0.22)",
    };
  }

  // Closed — show opens-at time if available
  const opensLabel = openMins !== null
    ? `🔴 Opens ${shop.open_time}`
    : "🔴 Closed";
  return {
    label:  opensLabel,
    color:  "rgba(255,255,255,0.30)",
    bg:     "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
  };
}

/* ── Props ───────────────────────────────────────────────────────── */
interface Props { shop: WalkShop; index: number; side: "left" | "right" }

/* ── ShopCard ────────────────────────────────────────────────────── */
export default function ShopCard({ shop, index, side }: Props) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px 0px" });
  const router = useRouter();

  const slug    = shop.category?.slug ?? "";
  const skinBg  = CAT_SKIN[slug] ?? "rgba(255,255,255,0.05)";
  const iconCfg = CAT_ICON_BG[slug] ?? CAT_ICON_FB;
  const icon    = shop.category?.icon ?? "🏪";
  const catName = shop.category?.name ?? "Shop";
  const offer   = shop.top_offer;
  const dx      = side === "left" ? -16 : 16;

  // ── derived signals ─────────────────────────────────────────────
  const hasRating     = (shop.avg_rating ?? 0) > 0 && (shop.review_count ?? 0) > 0;
  const isNew         = !hasRating;
  const isTrending    = !!shop.is_featured;
  const isRecommended = hasRating && shop.avg_rating >= 4.0 && shop.review_count >= 5;
  const validDist     = (shop.distance_m ?? 0) > 0 && shop.distance_m < 50_000;
  const endingSoon    = !!(offer?.ends_at &&
    new Date(offer.ends_at).getTime() - Date.now() < 86_400_000 * 3);

  const status = getStatus(shop);
  const hasTags = isNew || isTrending || isRecommended || endingSoon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: dx, scale: 0.97 }}
      animate={inView ? { opacity: 1, x: 0, scale: 1 } : {}}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.25, 0, 0, 1] }}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.96 }}
      onClick={() => router.push(`/shop/${shop.slug}`)}
      className="relative overflow-hidden cursor-pointer group"
      style={{
        borderRadius: 13,
        border: "1px solid rgba(255,255,255,0.068)",
        transition: "border-color 0.2s",
      }}
    >
      {/* Category skin tint */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse at ${side === "left" ? "0% 0%" : "100% 0%"}, ${skinBg}, transparent 60%)`,
        opacity: 0.65, borderRadius: "inherit",
      }} />

      {/* Grid texture */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)",
        backgroundSize: "10px 10px",
      }} />

      {/* Hover glow */}
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-250" style={{
        background: "radial-gradient(ellipse at 50% 0%,rgba(255,94,26,0.07),transparent 65%)",
        borderRadius: "inherit",
      }} />

      {/* ── Card body ───────────────────────────────────────────── */}
      <div style={{ position: "relative", zIndex: 1, padding: "10px 10px 9px" }}>

        {/* Row 1: icon + name + subtitle (UNCHANGED — name fix preserved) */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: iconCfg.bg, border: `1px solid ${iconCfg.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17,
          }}>
            {icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Shop name — DO NOT CHANGE */}
            <div className="font-syne" style={{
              fontSize: "12.5px", fontWeight: 700, color: "#EDEEF5",
              lineHeight: 1.3,
              display: "-webkit-box", WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {shop.name}
            </div>
            {/* Subtitle: category · smart status badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3, minWidth: 0 }}>
              <span style={{
                fontSize: "10px", color: "rgba(255,255,255,0.20)",
                flexShrink: 1, minWidth: 0,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {catName}
              </span>
              {/* 3-state status badge */}
              <span style={{
                flexShrink: 0, whiteSpace: "nowrap",
                fontSize: "7.5px", fontWeight: 700,
                padding: "1.5px 5px", borderRadius: 100,
                color:   status.color,
                background: status.bg,
                border:  status.border,
              }}>
                {status.label}
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: rating (only if real) + distance (only if valid) */}
        {(hasRating || validDist) && (
          <div style={{
            display: "flex", alignItems: "center",
            gap: 6, marginBottom: 6, fontSize: "11px",
          }}>
            {hasRating && (
              <>
                <span style={{ color: "#E8A800", fontWeight: 700 }}>
                  ★ {shop.avg_rating.toFixed(1)}
                </span>
                <span style={{ fontSize: "9.5px", color: "rgba(255,255,255,0.22)" }}>
                  ({shop.review_count})
                </span>
                {validDist && (
                  <span style={{ color: "rgba(255,255,255,0.10)" }}>·</span>
                )}
              </>
            )}
            {validDist && (
              <span style={{ color: "#1FBB5A", fontWeight: 600 }}>
                📍 {formatDistance(shop.distance_m)}
              </span>
            )}
          </div>
        )}

        {/* Row 3: compact offer chip */}
        {offer && <OfferChip offer={offer} />}

        {/* Row 4: trust signals — only rendered when at least one fires */}
        {hasTags && (
          <div style={{
            display: "flex", alignItems: "center",
            gap: 5, flexWrap: "wrap", marginTop: 2,
          }}>
            {isNew && !isTrending && !isRecommended && (
              <span style={{
                fontSize: "9px", fontWeight: 700,
                color: "rgba(31,187,90,0.85)",
                background: "rgba(31,187,90,0.07)",
                border: "1px solid rgba(31,187,90,0.16)",
                padding: "1.5px 6px", borderRadius: 100,
              }}>
                🆕 New on ApnaMap
              </span>
            )}
            {isTrending && (
              <span style={{ fontSize: "9.5px", color: "#FF5E1A", fontWeight: 600 }}>
                🔥 Trending
              </span>
            )}
            {isRecommended && (
              <span style={{ fontSize: "9.5px", color: "#E8A800", fontWeight: 600 }}>
                ⭐ Recommended
              </span>
            )}
            {endingSoon && (
              <span style={{ fontSize: "9.5px", color: "#E8A800", fontWeight: 600 }}>
                ⚡ Ending soon
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ── Compact offer chip — replaces heavy Tier1/2/3 blocks ─────────
   Single line: [icon + label] — [truncated title]
   Keeps offer secondary to shop name, no animation overhead          */
function OfferChip({ offer }: { offer: Offer }) {
  const { tier, discount_type, title } = offer;

  let prefix: string;
  let color: string;
  let bg: string;
  let border: string;

  if (tier === 1) {
    prefix = "🔥 Big Deal";
    color  = "#FF6A30";
    bg     = "rgba(255,80,0,0.08)";
    border = "1px solid rgba(255,80,0,0.20)";
  } else if (discount_type === "bogo" || discount_type === "free") {
    prefix = "🟢 Combo";
    color  = "#1FBB5A";
    bg     = "rgba(31,187,90,0.07)";
    border = "1px solid rgba(31,187,90,0.16)";
  } else if (tier === 2) {
    prefix = "⚡ Deal";
    color  = "#E8A800";
    bg     = "rgba(232,168,0,0.07)";
    border = "1px solid rgba(232,168,0,0.16)";
  } else {
    prefix = "🎯 Offer";
    color  = "rgba(255,255,255,0.38)";
    bg     = "rgba(255,255,255,0.04)";
    border = "1px solid rgba(255,255,255,0.07)";
  }

  const shortTitle = title.length > 20 ? title.slice(0, 18) + "…" : title;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 4,
      padding: "3.5px 8px", borderRadius: 7, marginBottom: 5,
      background: bg, border,
      overflow: "hidden",
    }}>
      <span style={{ fontSize: "10px", fontWeight: 700, color, flexShrink: 0 }}>
        {prefix}
      </span>
      <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.18)", flexShrink: 0 }}>
        —
      </span>
      <span style={{
        fontSize: "10px", fontWeight: 500,
        color: "rgba(255,255,255,0.50)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {shortTitle}
      </span>
    </div>
  );
}
