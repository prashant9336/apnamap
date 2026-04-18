"use client";
import { motion } from "framer-motion";
import type { MatchConfidence } from "@/types";

interface Props {
  locality:     string;
  confidence?:  MatchConfidence | null;
  gpsConfirmed: boolean;
  gpsError?:    string | null;
  accuracy?:    number | null;
  onDetect?:    () => void;
}

export default function YouAreHere({ locality, confidence, gpsConfirmed, gpsError, accuracy, onDetect }: Props) {
  const isDetecting  = !gpsConfirmed;
  const hasError     = !!gpsError;
  // Match ERROR_ACCURACY_M in useGeo: 500–2000m is "approximate" (medium confidence),
  // only >2000m is a true error that warrants the red "Location issue" state.
  const poorAccuracy = accuracy != null && accuracy > 2000;
  const isMedium     = gpsConfirmed && !hasError && !poorAccuracy && confidence === "medium";
  const isLow        = gpsConfirmed && !hasError && !poorAccuracy && confidence === "low";

  /* ── Colour palette by state ── */
  const palette =
    isDetecting || isLow
      ? { bg: "rgba(255,200,50,0.07)", border: "rgba(255,200,50,0.22)", dot: "#E8A800", text: "#E8A800" }
    : hasError || poorAccuracy
      ? { bg: "rgba(239,68,68,0.07)", border: "rgba(239,68,68,0.22)", dot: "#f87171", text: "#f87171" }
    : isMedium
      ? { bg: "rgba(255,200,50,0.07)", border: "rgba(255,200,50,0.22)", dot: "#E8A800", text: "#E8A800" }
    : { bg: "rgba(31,187,90,0.09)", border: "rgba(31,187,90,0.25)", dot: "#1FBB5A", text: "#1FBB5A" };

  const statusLine =
    isDetecting
      ? "Detecting your location…"
    : isLow
      ? "Updating your locality…"
    : hasError
      ? gpsError!
    : poorAccuracy
      ? `±${Math.round(accuracy!)}m accuracy · ${locality}`
    : isMedium
      ? `${locality} · approximate`
      : `${locality} · GPS confirmed`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0, 0, 1] }}
      style={{
        margin: "12px 12px 0",
        padding: "10px 13px",
        borderRadius: 12,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      {/* Sonar / spinner icon */}
      <div style={{ position: "relative", width: 20, height: 20, flexShrink: 0 }}>
        {isDetecting ? (
          /* Spinning ring while detecting */
          <motion.div
            style={{
              position: "absolute", inset: 0,
              border: `1.5px solid ${palette.dot}`,
              borderTopColor: "transparent",
              borderRadius: "50%",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        ) : (
          /* Sonar rings when confirmed */
          [0, 1].map(i => (
            <motion.div
              key={i}
              style={{
                position: "absolute", inset: 0,
                border: `1.5px solid ${palette.dot}55`,
                borderRadius: "50%",
              }}
              animate={{ scale: [0.25, 2.0], opacity: [0.9, 0] }}
              transition={{ duration: 2.4, delay: i * 0.9, repeat: Infinity, ease: "easeOut" }}
            />
          ))
        )}
        <div style={{
          position: "absolute",
          top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          width: 9, height: 9,
          background: palette.dot,
          borderRadius: "50%",
          boxShadow: `0 0 10px ${palette.dot}`,
        }} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "11.5px", fontWeight: 700, color: palette.text }}>
          {isDetecting ? "Finding you…"
           : hasError ? "Location issue"
           : isLow ? "Updating locality…"
           : isMedium ? "Approximate location"
           : "You are here"}
        </div>
        <div style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.42)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {statusLine}
        </div>
      </div>

      {/* Right side: Live badge or Update button */}
      {!isDetecting && onDetect && (
        <button
          onClick={onDetect}
          style={{
            marginLeft: "auto",
            flexShrink: 0,
            fontSize: "9px", fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.8px",
            padding: "4px 8px", borderRadius: 6,
            background: `${palette.dot}18`,
            border: `1px solid ${palette.dot}40`,
            color: palette.text,
            cursor: "pointer",
          }}
        >
          Update
        </button>
      )}
      {isDetecting && (
        <div style={{
          marginLeft: "auto",
          display: "flex", alignItems: "center", gap: 4,
          fontSize: "9px", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "1px", color: `${palette.dot}99`,
          flexShrink: 0,
        }}>
          <motion.div
            style={{ width: 5, height: 5, borderRadius: "50%", background: palette.dot }}
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          GPS
        </div>
      )}
      {gpsConfirmed && !onDetect && (
        <div style={{
          marginLeft: "auto",
          display: "flex", alignItems: "center", gap: 4,
          fontSize: "9px", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "1px", color: `${palette.dot}99`,
          flexShrink: 0,
        }}>
          <motion.div
            style={{ width: 5, height: 5, borderRadius: "50%", background: palette.dot }}
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
          Live
        </div>
      )}
    </motion.div>
  );
}
