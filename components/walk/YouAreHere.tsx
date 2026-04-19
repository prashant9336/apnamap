"use client";
import { motion } from "framer-motion";

export default function YouAreHere({ locality }: { locality: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0, 0, 1] }}
      style={{
        margin: "12px 12px 0",
        padding: "10px 13px",
        borderRadius: 12,
        background: "rgba(31,187,90,0.09)",
        border: "1px solid rgba(31,187,90,0.25)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      {/* Sonar icon */}
      <div style={{ position: "relative", width: 20, height: 20, flexShrink: 0 }}>
        {[0, 1].map(i => (
          <motion.div
            key={i}
            style={{
              position: "absolute", inset: 0,
              border: "1.5px solid rgba(31,187,90,0.55)",
              borderRadius: "50%",
            }}
            animate={{ scale: [0.25, 2.0], opacity: [0.9, 0] }}
            transition={{ duration: 2.4, delay: i * 0.9, repeat: Infinity, ease: "easeOut" }}
          />
        ))}
        <div style={{
          position: "absolute",
          top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          width: 9, height: 9,
          background: "#1FBB5A",
          borderRadius: "50%",
          boxShadow: "0 0 10px #1FBB5A",
        }} />
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#1FBB5A" }}>
          Nearest to you · {locality}
        </div>
        <div style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.42)", marginTop: 1 }}>
          Shops sorted by distance from your location
        </div>
      </div>

      {/* Live badge */}
      <div style={{
        marginLeft: "auto",
        display: "flex", alignItems: "center", gap: 4,
        fontSize: "9px", fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "1px", color: "rgba(31,187,90,0.65)",
      }}>
        <motion.div
          style={{ width: 5, height: 5, borderRadius: "50%", background: "#1FBB5A" }}
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
        Live
      </div>
    </motion.div>
  );
}
