"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

export default function LocalityTransition({ fromName, toName }: { fromName: string; toName: string }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="relative my-3 flex items-center justify-center py-4">
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px" style={{ background: "linear-gradient(to right,transparent,rgba(255,255,255,0.07),transparent)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={inView ? { opacity: 1, scale: 1 } : {}}
        className="relative z-10 flex items-center gap-2 px-4 py-2 rounded-full text-[11.5px]"
        style={{ background: "#080A14", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.32)" }}>
        <div className="flex gap-1 items-center">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} className="rounded-full"
              style={{ width: i === 1 ? 6 : 4, height: i === 1 ? 6 : 4, background: i === 1 ? "var(--accent)" : "rgba(255,255,255,0.18)" }}
              animate={i === 1 ? { x: [0, 3, 0] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }} />
          ))}
        </div>
        <span>Leaving {fromName}</span>
        <motion.span className="text-sm" animate={{ x: [0, 4, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>🚶</motion.span>
        <span style={{ color: "var(--accent)" }}>→</span>
      </motion.div>
    </div>
  );
}
