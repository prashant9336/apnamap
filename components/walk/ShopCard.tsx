"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useRouter } from "next/navigation";
import { formatDistance } from "@/lib/geo/distance";
import type { WalkShop } from "@/types";

/* Category tints — matches HTML data-cat colors exactly */
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

/* Category icon box colors */
const CAT_ICON_BG: Record<string, { bg: string; border: string }> = {
  "sweet-shop":    { bg: "rgba(255,140,0,0.12)",   border: "rgba(255,140,0,0.20)"  },
  "restaurant":    { bg: "rgba(255,140,0,0.10)",   border: "rgba(255,140,0,0.18)"  },
  "street-food":   { bg: "rgba(255,107,53,0.10)",  border: "rgba(255,107,53,0.18)" },
  "grocery":       { bg: "rgba(34,197,94,0.09)",   border: "rgba(34,197,94,0.16)"  },
  "fashion":       { bg: "rgba(236,72,153,0.10)",  border: "rgba(236,72,153,0.18)" },
  "electronics":   { bg: "rgba(56,189,248,0.10)",  border: "rgba(56,189,248,0.18)" },
  "salon":         { bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.18)"},
  "mobile-repair": { bg: "rgba(56,189,248,0.10)",  border: "rgba(56,189,248,0.18)" },
  "jewellery":     { bg: "rgba(232,168,0,0.10)",   border: "rgba(232,168,0,0.18)"  },
  "pharmacy":      { bg: "rgba(34,197,94,0.09)",   border: "rgba(34,197,94,0.16)"  },
  "coaching":      { bg: "rgba(99,179,237,0.10)",  border: "rgba(99,179,237,0.18)" },
  "gym":           { bg: "rgba(52,211,153,0.09)",  border: "rgba(52,211,153,0.16)" },
};
const CAT_ICON_FB = { bg: "rgba(255,255,255,0.07)", border: "rgba(255,255,255,0.10)" };

interface Props { shop: WalkShop; index: number; side: "left"|"right" }

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
  const tier    = (offer?.tier ?? 3) as 1|2|3;
  const dx      = side === "left" ? -16 : 16;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: dx, scale: 0.97 }}
      animate={inView ? { opacity: 1, x: 0, scale: 1 } : {}}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.25,0,0,1] }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => router.push(`/shop/${shop.slug}`)}
      className="relative overflow-hidden cursor-pointer group"
      style={{ borderRadius: 13, border: "1px solid rgba(255,255,255,0.068)" }}
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

      {/* Card body */}
      <div style={{ position: "relative", zIndex: 1, padding: "10px 10px 9px" }}>

        {/* Row 1: icon + name + open pill */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 7 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: iconCfg.bg, border: `1px solid ${iconCfg.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17,
          }}>
            {icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Badge sits top-right; name gets remaining space and clamps */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
              <div className="font-syne" style={{
                fontSize: "12.5px", fontWeight: 700, color: "#EDEEF5",
                lineHeight: 1.25, flex: 1, minWidth: 0,
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                {shop.name}
              </div>
              <span style={{
                flexShrink: 0, whiteSpace: "nowrap",
                fontSize: "8.5px", fontWeight: 700, padding: "2px 5px", borderRadius: 100,
                ...(shop.is_open
                  ? { background: "rgba(31,187,90,0.13)", color: "#1FBB5A", border: "1px solid rgba(31,187,90,0.26)" }
                  : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.20)", border: "1px solid rgba(255,255,255,0.068)" }),
              }}>
                {shop.is_open ? "● OPEN" : "○ CLOSED"}
              </span>
            </div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.20)", marginTop: 2 }}>
              {catName}
            </div>
          </div>
        </div>

        {/* Row 2: rating + distance */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7, fontSize: "11px" }}>
          <div style={{ color: "#E8A800", fontWeight: 700, display: "flex", alignItems: "center", gap: 2 }}>
            ★ <span>{(shop.avg_rating ?? 0).toFixed(1)}</span>
          </div>
          <span style={{ fontSize: "9.5px", color: "rgba(255,255,255,0.20)" }}>
            ({shop.review_count ?? 0})
          </span>
          <span style={{ color: "rgba(255,255,255,0.10)" }}>·</span>
          <span style={{ color: "#1FBB5A", fontWeight: 600 }}>
            📍 {formatDistance(shop.distance_m)}
          </span>
        </div>

        {/* Offer block — tier-specific */}
        {offer && tier === 1 && <Tier1 title={offer.title} />}
        {offer && tier === 2 && <Tier2 title={offer.title} offerType={offer.discount_type} />}
        {offer && tier === 3 && <Tier3 title={offer.title} />}

        {/* Tags */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: "9.5px" }}>
          {shop.is_featured && <span style={{ color: "#FF5E1A" }}>🔥 Trending here</span>}
          {offer?.ends_at && new Date(offer.ends_at).getTime() - Date.now() < 86400000 * 3 && (
            <span style={{ color: "#E8A800" }}>⚡ Ending soon</span>
          )}
          {(shop.view_count ?? 0) > 50 && (
            <span style={{ color: "rgba(255,255,255,0.20)" }}>
              👀 {shop.view_count} viewing
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* Tier 1 — Big Deal */
function Tier1({ title }: { title: string }) {
  return (
    <motion.div
      style={{
        padding: "8px 10px", borderRadius: 9, marginBottom: 7,
        position: "relative", overflow: "hidden",
        background: "linear-gradient(135deg,rgba(255,60,0,0.22) 0%,rgba(255,140,0,0.12) 100%)",
        border: "1px solid rgba(255,80,0,0.38)",
        color: "#FF6A30", fontSize: "12px", fontWeight: 800, letterSpacing: "0.3px",
      }}
      animate={{ boxShadow: ["0 0 0 rgba(255,80,0,0)","0 0 14px rgba(255,80,0,0.28), inset 0 0 14px rgba(255,80,0,0.06)","0 0 0 rgba(255,80,0,0)"] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Shimmer */}
      <motion.div
        className="absolute pointer-events-none"
        style={{ top: 0, bottom: 0, width: "60%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)" }}
        animate={{ left: ["-100%", "200%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <span style={{ display: "block", fontSize: "8px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "rgba(255,100,30,0.7)", marginBottom: 2 }}>
        ⭐ Big Deal
      </span>
      {title}
    </motion.div>
  );
}

/* Tier 2 — Flash / Green offer */
function Tier2({ title, offerType }: { title: string; offerType: string }) {
  const isGreen = offerType === "free" || offerType === "bogo";
  return (
    <motion.div
      style={{
        padding: "6px 9px", borderRadius: 8, marginBottom: 7,
        fontSize: "11px", fontWeight: 700,
        ...(isGreen
          ? { background: "rgba(31,187,90,0.10)", border: "1px solid rgba(31,187,90,0.25)", color: "#1FBB5A" }
          : { background: "rgba(232,168,0,0.12)", border: "1px solid rgba(232,168,0,0.26)", color: "#E8A800" }),
      }}
      animate={{ boxShadow: ["none", isGreen ? "0 0 8px rgba(31,187,90,0.18)" : "0 0 8px rgba(232,168,0,0.18)", "none"] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      {isGreen ? "🟢 " : "⚡ "}{title}
    </motion.div>
  );
}

/* Tier 3 — Basic pill */
function Tier3({ title }: { title: string }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 8px", borderRadius: 100, marginBottom: 5,
      fontSize: "10px", fontWeight: 600,
      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.068)",
      color: "rgba(255,255,255,0.42)",
    }}>
      🟢 {title}
    </div>
  );
}
