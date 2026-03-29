"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import ShopCard from "./ShopCard";
import RoadDivider from "./RoadDivider";
import type { WalkLocality } from "@/types";

const CROWD_STYLES = {
  hot:   { dot: "var(--accent)", badge: "rgba(255,94,26,0.13)", color: "var(--accent)", border: "rgba(255,94,26,0.28)", emoji: "🔥", text: "Most visited today" },
  busy:  { dot: "var(--gold)",   badge: "rgba(232,168,0,0.11)",  color: "var(--gold)",   border: "rgba(232,168,0,0.26)",  emoji: "⚡", text: "Busy right now" },
  quiet: { dot: "rgba(255,255,255,0.3)", badge: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.28)", border: "rgba(255,255,255,0.08)", emoji: "🔵", text: "Quiet now" },
};

export default function LocalitySection({ locality, index }: { locality: WalkLocality; index: number }) {
  const ref   = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px 0px" });

  const leftShops  = locality.shops.filter((_, i) => i % 2 === 0);
  const rightShops = locality.shops.filter((_, i) => i % 2 !== 0);
  const maxRows    = Math.max(leftShops.length, rightShops.length);
  const crowd      = CROWD_STYLES[locality.crowd_badge];

  return (
    <motion.div ref={ref} initial={{ opacity: 0, x: -8 }} animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.45, ease: [0.25, 0, 0, 1] }}>

      {/* Locality header */}
      <div className="flex items-end justify-between mx-3 mt-5 mb-1">
        <div>
          <h2 className="font-syne font-black text-2xl leading-none" style={{ letterSpacing: "-0.5px" }}>{locality.name}</h2>
          {locality.description && (
            <p className="text-xs italic mt-1" style={{ color: "var(--t3)" }}>{locality.description}</p>
          )}
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono px-2 py-1 rounded inline-block" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "var(--t3)" }}>
            {index === 0 ? "You are here" : `${(index * 1.8).toFixed(1)} km`}
          </div>
          <div className="text-[9.5px] mt-1" style={{ color: "var(--t4)" }}>{locality.shops.length} shops</div>
        </div>
      </div>

      {/* Crowd intelligence */}
      <div className="flex items-center gap-2 mx-3 mb-1">
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: crowd.dot, boxShadow: `0 0 5px ${crowd.dot}` }} />
        <span className="text-xs" style={{ color: "var(--t2)" }}>{locality.crowd_count} {locality.crowd_label}</span>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: crowd.badge, color: crowd.color, border: `1px solid ${crowd.border}` }}>
          {crowd.emoji} {crowd.text}
        </span>
      </div>

      {/* Cluster label */}
      <div className="flex items-center gap-2 mx-3 my-1.5">
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
        <span className="text-[9.5px] font-bold uppercase tracking-wider" style={{ color: "var(--t3)" }}>
          {locality.name} Market Strip
        </span>
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
      </div>

      {/* Street */}
      <div className="flex items-stretch" style={{ minHeight: maxRows * 164 }}>
        {/* Left column */}
        <div className="scol-l flex flex-col gap-2 flex-1 px-1.5 py-2 min-w-0">
          {leftShops.map((shop, i) => (
            <ShopCard key={shop.id} shop={shop} index={i} side="left" />
          ))}
        </div>

        {/* Road */}
        <RoadDivider height={maxRows * 164} />

        {/* Right column */}
        <div className="scol-r flex flex-col gap-2 flex-1 px-1.5 py-2 min-w-0">
          {rightShops.map((shop, i) => (
            <ShopCard key={shop.id} shop={shop} index={i} side="right" />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
