"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import ShopCard from "./ShopCard";
import RoadDivider from "./RoadDivider";
import type { WalkLocality } from "@/types";

const STRIP_LABEL: Record<string,string> = {
  "civil-lines":  "Main Market Strip",
  "chowk-bazar":  "Heritage Bazaar Cluster",
  "katra-market": "Katra Market Cluster",
  "rambagh":      "Residential Market Strip",
  "naini":        "Industrial Wholesale Strip",
};

export default function LocalitySection({ locality, index }: { locality: WalkLocality; index: number }) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px 0px" });

  const left  = locality.shops.filter((_, i) => i % 2 === 0);
  const right = locality.shops.filter((_, i) => i % 2 !== 0);

  // Crowd config from badge
  const crowdCfg = {
    hot:   { dotBg: "#FF5E1A", dotShadow: "#FF5E1A", badgeClass: "hot",  badgeStyle: { background:"rgba(255,94,26,0.14)",  color:"#FF5E1A", border:"1px solid rgba(255,94,26,0.28)"  }, em: "🔥", lbl: "Most visited today" },
    busy:  { dotBg: "#E8A800", dotShadow: "#E8A800", badgeClass: "busy", badgeStyle: { background:"rgba(232,168,0,0.12)",  color:"#E8A800", border:"1px solid rgba(232,168,0,0.26)"  }, em: "⚡", lbl: "Busy right now" },
    quiet: { dotBg: "rgba(255,255,255,0.30)", dotShadow: "transparent", badgeClass: "quiet", badgeStyle: { background:"rgba(255,255,255,0.05)", color:"rgba(255,255,255,0.20)", border:"1px solid rgba(255,255,255,0.068)" }, em: "🔵", lbl: "Quiet now" },
  };
  const cc = crowdCfg[locality.crowd_badge] ?? crowdCfg.quiet;

  const distLabel = index === 0
    ? "You are here"
    : locality.shops[0]
      ? `${(locality.shops[0].distance_m / 1000).toFixed(1)} km away`
      : `~${(index * 1.05).toFixed(1)} km`;

  const strip = STRIP_LABEL[locality.slug] ?? `${locality.name} Cluster`;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 8 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, ease: [0.25,0,0,1] }}
      data-loc={locality.name}
    >
      {/* Locality header — matches .loc-head */}
      <div
        data-section-bg="1"
        style={{
          display: "flex", alignItems: "flex-end", justifyContent: "space-between",
          margin: "20px 13px 4px",
          willChange: "transform",
        }}>
        <div>
          <h2 className="font-syne" style={{
            fontSize: "24px", fontWeight: 800, color: "#EDEEF5",
            letterSpacing: "-0.6px", lineHeight: 1,
          }}>
            {locality.name}
          </h2>
          {locality.description && (
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.20)", fontStyle: "italic", marginTop: 3 }}>
              {locality.description}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{
            fontSize: "10px", fontFamily: "'DM Mono',monospace",
            color: "rgba(255,255,255,0.20)",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.068)",
            borderRadius: 5, padding: "3px 8px", display: "inline-block", marginBottom: 2,
          }}>
            {distLabel}
          </div>
          <div style={{ fontSize: "9.5px", color: "rgba(255,255,255,0.10)" }}>
            {locality.shops.length} shops
          </div>
        </div>
      </div>

      {/* Crowd row — matches .loc-crowd */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 0.1, duration: 0.4 }}
        style={{ display: "flex", alignItems: "center", gap: 5, margin: "4px 13px 0", fontSize: "10.5px" }}
      >
        <motion.div
          style={{ width: 6, height: 6, borderRadius: "50%", background: cc.dotBg, boxShadow: `0 0 6px ${cc.dotShadow}` }}
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        <span style={{ color: "rgba(255,255,255,0.42)", fontWeight: 500 }}>
          {locality.crowd_count} people here now
        </span>
        <span style={{ fontSize: "9px", fontWeight: 700, padding: "1.5px 7px", borderRadius: 100, ...cc.badgeStyle }}>
          {cc.em} {cc.lbl}
        </span>
      </motion.div>

      {/* Dense cluster label — matches .dense-label */}
      <div style={{ margin: "6px 13px 2px", display: "flex", alignItems: "center", gap: 7, fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.20)", textTransform: "uppercase", letterSpacing: "1px" }}>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
        <span>{strip}</span>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
      </div>

      {/* Street — matches .street */}
      <div style={{ display: "flex", alignItems: "stretch", padding: "4px 0" }}>
        {/* Left col */}
        <div className="scol-l" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8, padding: "4px 7px" }}>
          {left.map((s, i) => <ShopCard key={s.id} shop={s} index={i} side="left" />)}
        </div>

        {/* Road */}
        <RoadDivider height={Math.max(left.length, right.length, 1) * 185 + 8} />

        {/* Right col */}
        <div className="scol-r" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8, padding: "4px 7px" }}>
          {right.map((s, i) => <ShopCard key={s.id} shop={s} index={i} side="right" />)}
        </div>
      </div>
    </motion.div>
  );
}
