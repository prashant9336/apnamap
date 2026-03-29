"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useRouter } from "next/navigation";
import { formatDistance } from "@/lib/geo/distance";
import type { WalkShop } from "@/types";

const TIER_STYLES = {
  1: {
    wrap: "linear-gradient(135deg,rgba(255,60,0,0.20) 0%,rgba(255,140,0,0.10) 100%)",
    border: "rgba(255,80,0,0.36)", color: "#FF6830", label: "⭐ Big Deal",
    anim: { boxShadow: ["0 0 0 rgba(255,80,0,0)", "0 0 14px rgba(255,80,0,0.28)", "0 0 0 rgba(255,80,0,0)"] },
  },
  2: {
    wrap: "rgba(232,168,0,0.10)", border: "rgba(232,168,0,0.26)", color: "var(--gold)", label: null,
    anim: { boxShadow: ["0 0 0 rgba(232,168,0,0)", "0 0 8px rgba(232,168,0,0.18)", "0 0 0 rgba(232,168,0,0)"] },
  },
  3: {
    wrap: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.10)", color: "var(--t2)", label: null,
    anim: {},
  },
};

const CAT_COLORS: Record<string, string> = {
  "sweet-shop": "rgba(255,140,0,0.10)", restaurant: "rgba(255,94,26,0.09)",
  "street-food": "rgba(255,107,53,0.09)", grocery: "rgba(31,187,90,0.08)",
  fashion: "rgba(236,72,153,0.09)", electronics: "rgba(56,189,248,0.08)",
  salon: "rgba(167,139,250,0.09)", "mobile-repair": "rgba(96,165,250,0.08)",
  jewellery: "rgba(232,168,0,0.09)", pharmacy: "rgba(16,185,129,0.08)",
};

interface Props { shop: WalkShop; index: number; side: "left" | "right" }

export default function ShopCard({ shop, index, side }: Props) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-30px 0px" });
  const router = useRouter();
  const dx     = side === "left" ? -16 : 16;
  const offer  = shop.top_offer;
  const tier   = offer?.tier ?? 3;
  const ts     = TIER_STYLES[tier as 1 | 2 | 3];
  const catBg  = CAT_COLORS[shop.category?.slug ?? ""] ?? "rgba(255,255,255,0.04)";

  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, x: dx }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.42, delay: index * 0.05, ease: [0.25, 0, 0, 1] }}
      whileTap={{ scale: 0.97 }}
      onClick={() => router.push(`/shop/${shop.slug}`)}
      className="relative rounded-xl overflow-hidden cursor-pointer group"
      style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.034)" }}>

      {/* Category tint */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at ${side === "left" ? "0%" : "100%"} 0%, ${catBg}, transparent 60%)` }} />
      {/* Grid texture */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)", backgroundSize: "10px 10px" }} />
      {/* Hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%,rgba(255,94,26,0.07),transparent 65%)" }} />

      {/* CONTENT */}
      <div className="relative z-10 p-2.5">
        {/* Row 1 */}
        <div className="flex items-start gap-2 mb-1.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
            style={{ background: catBg, border: "1px solid rgba(255,255,255,0.08)" }}>
            {shop.category?.icon ?? "🏪"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-1">
              <h3 className="font-syne font-bold leading-tight text-xs flex-1"
                style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {shop.name}
              </h3>
              <span className="flex-shrink-0 text-[8.5px] font-bold px-1.5 py-0.5 rounded-full"
                style={shop.is_open
                  ? { background: "rgba(31,187,90,0.13)", color: "var(--green)", border: "1px solid rgba(31,187,90,0.26)" }
                  : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {shop.is_open ? "● OPEN" : "○ CLOSED"}
              </span>
            </div>
            <p className="text-[9.5px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{shop.category?.name}</p>
          </div>
        </div>

        {/* Row 2: rating + distance */}
        <div className="flex items-center gap-1.5 mb-1.5 text-[10.5px]">
          <span style={{ color: "var(--gold)" }}>★</span>
          <span className="font-semibold" style={{ color: "var(--gold)" }}>{shop.avg_rating.toFixed(1)}</span>
          <span style={{ color: "rgba(255,255,255,0.25)" }}>({shop.review_count})</span>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
          <span className="font-semibold" style={{ color: "var(--green)" }}>📍 {formatDistance(shop.distance_m)}</span>
        </div>

        {/* Offer strip */}
        {offer && (
          <motion.div className="rounded-lg px-2 py-1.5 mb-1.5 text-[10.5px] font-bold relative overflow-hidden"
            style={{ background: ts.wrap, border: `1px solid ${ts.border}`, color: ts.color }}
            animate={ts.anim} transition={{ duration: 2.5, repeat: Infinity }}>
            {ts.label && <span className="block text-[8px] font-black uppercase tracking-wide mb-0.5 opacity-70">{ts.label}</span>}
            {tier === 3 && <span className="mr-1">🟢</span>}{offer.title}

            {/* Shimmer for tier 1 */}
            {tier === 1 && (
              <motion.div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)", backgroundSize: "200% 100%" }}
                animate={{ backgroundPosition: ["-200% 0", "200% 0"] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }} />
            )}
          </motion.div>
        )}

        {/* Social proof */}
        <div className="flex items-center gap-2 flex-wrap">
          {shop.is_featured && <span className="text-[9px]" style={{ color: "var(--accent)" }}>🔥 Trending</span>}
          {offer?.ends_at && new Date(offer.ends_at).getTime() - Date.now() < 86400000 * 3 && (
            <span className="text-[9px]" style={{ color: "var(--gold)" }}>⚡ Ending soon</span>
          )}
          {shop.view_count > 100 && (
            <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.28)" }}>
              👀 {shop.view_count > 999 ? `${Math.floor(shop.view_count / 100) * 100}+` : shop.view_count} views
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
