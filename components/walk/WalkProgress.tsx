"use client";
import { motion } from "framer-motion";

const SHORT: Record<string,string> = {
  "Civil Lines":"Civil Lines","Chowk Bazar":"Chowk Bazar","Katra Market":"Katra Market",
  "Rambagh":"Rambagh","Naini":"Naini",
};

export default function WalkProgress({
  scrollPct, localities, activeIdx,
}: { scrollPct: number; localities: string[]; activeIdx: number }) {
  if (!localities.length) return null;
  const totalKm = Math.max(localities.length * 1.05, 1);
  const walked  = Math.min(scrollPct * totalKm * 1.1, totalKm).toFixed(1);

  return (
    <div style={{
      flexShrink: 0,
      padding: "8px 14px 6px",
      background: "rgba(5,7,12,0.9)",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "11px", fontWeight: 600, color: "#FF5E1A" }}>
          <motion.span
            style={{ display: "inline-block" }}
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.1, 0.9], x: [0, 2, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          >
            👣
          </motion.span>
          <span>You've walked <strong>{walked} km</strong> digitally</span>
        </div>
        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.20)" }}>
          of {totalKm.toFixed(1)} km
        </div>
      </div>

      {/* Track */}
      <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
        {localities.map((name, i) => {
          const done    = i < activeIdx;
          const current = i === activeIdx;
          const isLast  = i === localities.length - 1;
          return (
            <div key={`${name}-${i}`} style={{ display: "flex", alignItems: "center", flex: isLast ? "none" : 1, minWidth: 0 }}>
              {/* Node */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, position: "relative", zIndex: 1 }}>
                <motion.div
                  animate={current ? {
                    boxShadow: ["0 0 4px rgba(255,94,26,0.5)","0 0 14px rgba(255,94,26,0.8), 0 0 24px rgba(255,94,26,0.3)","0 0 4px rgba(255,94,26,0.5)"]
                  } : {}}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: done ? "#1FBB5A" : current ? "#FF5E1A" : "rgba(255,255,255,0.12)",
                    border: `1.5px solid ${done ? "#1FBB5A" : current ? "#FF5E1A" : "rgba(255,255,255,0.15)"}`,
                    boxShadow: done ? "0 0 8px rgba(31,187,90,0.6)" : undefined,
                    transition: "all .4s",
                  }}
                />
                <div style={{
                  fontSize: "8.5px", fontWeight: 600, whiteSpace: "nowrap",
                  color: done ? "#1FBB5A" : current ? "#FF5E1A" : "rgba(255,255,255,0.20)",
                  transition: "color .4s",
                }}>
                  {SHORT[name] ?? name.split(" ")[0]}
                </div>
              </div>

              {/* Segment */}
              {!isLast && (
                <div style={{
                  flex: 1, height: 2, margin: "0 2px", marginBottom: 11,
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: 1, position: "relative", overflow: "hidden",
                }}>
                  <motion.div
                    style={{ position: "absolute", top: 0, left: 0, height: "100%", borderRadius: 1 }}
                    animate={{ width: done ? "100%" : current ? "60%" : "0%" }}
                    transition={{ duration: 0.6, ease: [0.25,0,0,1] }}
                  >
                    <div style={{
                      width: "100%", height: "100%",
                      background: done ? "#1FBB5A" : "linear-gradient(to right,#1FBB5A,#FF5E1A)",
                    }} />
                  </motion.div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
