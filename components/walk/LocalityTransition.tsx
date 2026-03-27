"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

export default function LocalityTransition({ fromName, toName }: { fromName: string; toName: string }) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10px 0px" });
  return (
    <div ref={ref} style={{ position: "relative", margin: "8px 0", display: "flex", alignItems: "center", justifyContent: "center", padding: "14px 0" }}>
      {/* Horizontal rule */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: "50%", transform: "translateY(-50%)",
        height: 1,
        background: "linear-gradient(to right,transparent,rgba(255,255,255,0.07),transparent)",
      }} />

      {/* Pill */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
        style={{
          position: "relative", zIndex: 1,
          display: "flex", alignItems: "center", gap: 7,
          padding: "7px 15px", borderRadius: 100,
          background: "#080B12",
          border: "1px solid rgba(255,255,255,0.08)",
          fontSize: "11.5px", color: "rgba(255,255,255,0.32)",
        }}
      >
        {/* Dots */}
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          {[true, false, false].map((active, i) => (
            <div key={i} style={{
              width: 4, height: 4, borderRadius: "50%",
              background: active ? "#FF5E1A" : "rgba(255,255,255,0.15)",
              boxShadow: active ? "0 0 5px #FF5E1A" : "none",
            }} />
          ))}
        </div>

        <span>Leaving {fromName}</span>

        <motion.span
          style={{ fontSize: "14px" }}
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          🚶
        </motion.span>

        <span style={{ color: "#FF5E1A", fontWeight: 700 }}>→</span>
      </motion.div>
    </div>
  );
}
