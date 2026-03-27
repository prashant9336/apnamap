"use client";
import { motion } from "framer-motion";

export default function RoadDivider({ height }: { height: number }) {
  const h = Math.max(height, 200);
  return (
    <div
      className="flex-shrink-0 relative overflow-hidden"
      style={{
        width: 50,
        minHeight: h,
        background: "linear-gradient(to bottom,rgba(255,255,255,0.018) 0%,rgba(255,255,255,0.028) 50%,rgba(255,255,255,0.018) 100%)",
        borderLeft:  "1px solid rgba(255,255,255,0.04)",
        borderRight: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {/* Asphalt texture — ::before equivalent */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "repeating-linear-gradient(180deg,transparent 0px,transparent 14px,rgba(255,255,255,0.012) 14px,rgba(255,255,255,0.012) 15px)",
      }} />

      {/* Ambient road glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 50%,rgba(255,200,80,0.04) 0%,transparent 70%)" }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Center dashes */}
      <div className="absolute overflow-hidden" style={{ left: "50%", top: 0, bottom: 0, width: 2, transform: "translateX(-50%)" }}>
        <motion.div
          style={{
            width: "100%", height: "300%",
            background: "repeating-linear-gradient(180deg,rgba(255,255,255,0.22) 0px,rgba(255,255,255,0.22) 11px,transparent 11px,transparent 24px)",
          }}
          animate={{ y: ["0%", "33.33%"] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Vehicles DOWN (left lane) */}
      <Veh dir="dn" left={7} w={9} h={20} color="rgba(255,140,60,0.4)" dur={3.6} delay={0} totalH={h} />
      <Veh dir="dn" left={7} w={9} h={15} color="rgba(255,140,60,0.4)" dur={5.1} delay={1.8} totalH={h} />

      {/* Vehicles UP (right lane) */}
      <Veh dir="up" right={7} w={9} h={18} color="rgba(180,220,255,0.35)" dur={4.3} delay={0.9} totalH={h} />
      <Veh dir="up" right={7} w={9} h={22} color="rgba(180,220,255,0.35)" dur={3.2} delay={2.7} totalH={h} />
    </div>
  );
}

function Veh({ dir, left, right, w, h, color, dur, delay, totalH }: {
  dir: "dn"|"up"; left?: number; right?: number;
  w: number; h: number; color: string; dur: number; delay: number; totalH: number;
}) {
  const dn = dir === "dn";
  const pos: React.CSSProperties = dn
    ? { left: left ?? 7, top: 0 }
    : { right: right ?? 7, bottom: 0 };

  return (
    <motion.div
      className="absolute overflow-hidden"
      style={{ width: w, height: h, borderRadius: 4, ...pos, boxShadow: `0 0 8px ${color}`, color }}
      animate={dn
        ? { y: ["-100%", `${totalH + totalH * 0.1}px`] }
        : { y: [`${totalH + totalH * 0.1}px`, "-100%"] }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: "linear" }}
    >
      {/* Beam cone */}
      <div style={{
        position: "absolute",
        ...(dn ? { bottom: h - 4, left: "50%", transform: "translateX(-50%)" } : { top: h - 4, left: "50%", transform: "translateX(-50%)" }),
        width: 0, height: 0,
        borderLeft: "14px solid transparent",
        borderRight: "14px solid transparent",
        ...(dn
          ? { borderBottom: "35px solid rgba(255,240,120,0.07)" }
          : { borderTop:    "35px solid rgba(255,240,120,0.07)" }),
      }} />
      {/* Light bar */}
      <div style={{
        position: "absolute", left: 0, right: 0, height: 4,
        ...(dn ? { bottom: 0, background: "rgba(255,60,20,0.9)" } : { top: 0, background: "rgba(255,255,180,0.95)" }),
      }} />
    </motion.div>
  );
}
