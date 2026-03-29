"use client";
import { motion } from "framer-motion";

interface Props {
  scrollPct:   number;
  localities:  string[];
  activeIdx:   number;
}

export default function WalkProgress({ scrollPct, localities, activeIdx }: Props) {
  const totalKm  = localities.length * 1.2;
  const walkedKm = Math.min(scrollPct * totalKm * 1.15, totalKm).toFixed(1);

  return (
    <div className="flex-shrink-0 px-4 py-2.5" style={{ background: "rgba(5,7,12,0.9)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--accent)" }}>
          <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity }}>👣</motion.span>
          <span>You've walked <strong>{walkedKm} km</strong> digitally</span>
        </div>
        <span className="text-[10px] font-mono" style={{ color: "var(--t3)" }}>of {totalKm.toFixed(1)} km</span>
      </div>

      {/* Node track */}
      <div className="flex items-center">
        {localities.map((name, i) => {
          const isDone    = i < activeIdx;
          const isCurrent = i === activeIdx;
          return (
            <div key={name} className="flex items-center" style={{ flex: i < localities.length - 1 ? 1 : "none" }}>
              <div className="flex flex-col items-center gap-1 relative z-10">
                <motion.div
                  animate={isCurrent ? { boxShadow: ["0 0 4px rgba(255,94,26,0.4)", "0 0 14px rgba(255,94,26,0.85)", "0 0 4px rgba(255,94,26,0.4)"] } : {}}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: isDone ? "var(--green)" : isCurrent ? "var(--accent)" : "rgba(255,255,255,0.12)",
                    border: `1.5px solid ${isDone ? "var(--green)" : isCurrent ? "var(--accent)" : "rgba(255,255,255,0.15)"}`,
                    boxShadow: isDone ? "0 0 7px rgba(31,187,90,0.55)" : undefined,
                  }} />
                <span className="text-[8px] font-semibold whitespace-nowrap"
                  style={{ color: isDone ? "var(--green)" : isCurrent ? "var(--accent)" : "var(--t3)" }}>
                  {name.split(" ")[0]}
                </span>
              </div>

              {/* Connector */}
              {i < localities.length - 1 && (
                <div className="flex-1 h-0.5 mx-0.5 mb-3 rounded overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <motion.div className="h-full rounded"
                    style={{ background: isDone ? "var(--green)" : "transparent" }}
                    animate={{ width: isDone ? "100%" : isCurrent ? "55%" : "0%" }}
                    transition={{ duration: 0.5 }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
