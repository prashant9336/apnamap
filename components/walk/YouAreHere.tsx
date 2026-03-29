"use client";
import { motion } from "framer-motion";

export default function YouAreHere({ locality }: { locality: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="mx-3 mt-3 flex items-center gap-3 px-3.5 py-2.5 rounded-xl"
      style={{ background: "rgba(31,187,90,0.08)", border: "1px solid rgba(31,187,90,0.22)" }}>
      {/* Sonar */}
      <div className="relative w-5 h-5 flex-shrink-0">
        {[1, 2].map((i) => (
          <motion.div key={i} className="absolute inset-0 rounded-full"
            style={{ border: "1.5px solid rgba(31,187,90,0.5)" }}
            animate={{ scale: [0.3, 2], opacity: [0.8, 0] }}
            transition={{ duration: 2.2, delay: i * 0.9, repeat: Infinity, ease: "easeOut" }} />
        ))}
        <motion.div className="absolute inset-0 m-auto rounded-full" style={{ width: 8, height: 8, background: "var(--green)", boxShadow: "0 0 10px var(--green)" }}
          animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} />
      </div>
      <div>
        <p className="text-xs font-bold leading-tight" style={{ color: "var(--green)" }}>You are here</p>
        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.42)" }}>{locality} · GPS active</p>
      </div>
      <div className="ml-auto flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: "rgba(31,187,90,0.65)" }}>
        <motion.span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--green)" }}
          animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
        Live
      </div>
    </motion.div>
  );
}
