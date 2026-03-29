"use client";
import { motion } from "framer-motion";

export default function RoadDivider({ height }: { height: number }) {
  return (
    <div className="flex-shrink-0 relative overflow-hidden" style={{
      width: 50, minHeight: height,
      background: "rgba(255,255,255,0.022)",
      borderLeft: "1px solid rgba(255,255,255,0.04)",
      borderRight: "1px solid rgba(255,255,255,0.04)",
    }}>
      {/* Ambient glow */}
      <motion.div className="absolute inset-0" animate={{ opacity: [0.4, 0.9, 0.4] }} transition={{ duration: 4, repeat: Infinity }}
        style={{ background: "radial-gradient(ellipse at 50% 50%,rgba(255,200,80,0.04),transparent 70%)" }} />

      {/* Dashes */}
      <div className="absolute overflow-hidden" style={{ left: "50%", transform: "translateX(-50%)", top: 0, bottom: 0, width: 2 }}>
        <motion.div style={{ height: "300%", background: "repeating-linear-gradient(to bottom,rgba(255,255,255,0.22) 0,rgba(255,255,255,0.22) 11px,transparent 11px,transparent 24px)" }}
          animate={{ y: [0, "-33.33%"] }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} />
      </div>

      {/* Vehicles going down */}
      {[{ delay: 0, dur: 3.8, w: 9, h: 20, x: 7 }, { delay: 1.9, dur: 5.2, w: 9, h: 15, x: 7 }].map((v, i) => (
        <motion.div key={`d${i}`} className="absolute rounded-sm overflow-hidden"
          style={{ left: v.x, width: v.w, height: v.h, background: "rgba(255,150,60,0.42)", boxShadow: "0 0 6px rgba(255,150,60,0.3)", top: 0 }}
          animate={{ y: ["-100%", `${height + 40}px`] }}
          transition={{ duration: v.dur, delay: v.delay, repeat: Infinity, ease: "linear" }}>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(255,60,20,0.9)" }} />
        </motion.div>
      ))}

      {/* Vehicles going up */}
      {[{ delay: 0.9, dur: 4.3, w: 9, h: 18, x: 32 }, { delay: 2.7, dur: 3.5, w: 9, h: 22, x: 32 }].map((v, i) => (
        <motion.div key={`u${i}`} className="absolute rounded-sm overflow-hidden"
          style={{ right: 7, width: v.w, height: v.h, background: "rgba(180,220,255,0.38)", boxShadow: "0 0 5px rgba(180,220,255,0.22)", bottom: 0 }}
          animate={{ y: [`${height + 40}px`, "-100%"] }}
          transition={{ duration: v.dur, delay: v.delay, repeat: Infinity, ease: "linear" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,200,0.9)" }} />
        </motion.div>
      ))}
    </div>
  );
}
