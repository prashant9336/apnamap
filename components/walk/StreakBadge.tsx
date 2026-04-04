"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface StreakData {
  streak_count: number;
  reward_unlocked: boolean;
  reward_code: string | null;
  last_visit_date: string;
}

interface Props {
  localityId: string;
  localityName: string;
}

const STREAK_GOAL = 3; // days to unlock reward

/**
 * Self-fetching streak badge for a locality.
 * POSTs to /api/streak on mount — the API is idempotent for the same day
 * (returns already_counted_today), so it's safe to call every render.
 * Displays: flame + streak count + progress bar + reward state.
 */
export default function StreakBadge({ localityId, localityName }: Props) {
  const [streak, setStreak]     = useState<StreakData | null>(null);
  const [showReward, setShowReward] = useState(false);
  const called = useRef(false);

  useEffect(() => {
    if (called.current || !localityId) return;
    called.current = true;

    fetch("/api/streak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locality_id: localityId }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.streak) {
          setStreak(data.streak as StreakData);
          if (data.status === "reward_unlocked") {
            setTimeout(() => setShowReward(true), 600);
          }
        }
      })
      .catch(() => {/* non-critical */});
  }, [localityId]);

  // Don't render anything until we have streak data
  if (!streak) return null;

  const count    = streak.streak_count;
  const unlocked = streak.reward_unlocked;
  const progress = Math.min(1, count / STREAK_GOAL);
  const pct      = Math.round(progress * 100);

  // Flame intensity by streak count
  const flame = count >= 7 ? "🔥🔥" : count >= 3 ? "🔥" : "🕯️";

  return (
    <>
      {/* Streak badge pill */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        style={{
          margin: "8px 12px 0",
          padding: "9px 12px",
          borderRadius: 11,
          background: unlocked
            ? "rgba(232,168,0,0.07)"
            : "rgba(255,94,26,0.05)",
          border: `1px solid ${unlocked ? "rgba(232,168,0,0.22)" : "rgba(255,94,26,0.15)"}`,
          display: "flex", flexDirection: "column", gap: 7,
        }}
      >
        {/* Top row: flame + count + label */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "16px", lineHeight: 1 }}>{flame}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: "11px", fontWeight: 700, color: "#EDEEF5",
              lineHeight: 1.2,
            }}>
              {count}-day streak in {localityName}
            </div>
            <div style={{
              fontSize: "10px", color: "rgba(255,255,255,0.35)",
              marginTop: 2, lineHeight: 1,
            }}>
              {unlocked
                ? "🎁 Reward unlocked!"
                : count >= STREAK_GOAL - 1
                  ? `1 more day to unlock your reward`
                  : `${STREAK_GOAL - count} more days to unlock a reward`}
            </div>
          </div>
          {/* Count badge */}
          <div style={{
            flexShrink: 0, minWidth: 32, textAlign: "center",
            padding: "4px 8px", borderRadius: 100,
            background: unlocked ? "rgba(232,168,0,0.12)" : "rgba(255,94,26,0.10)",
            border: `1px solid ${unlocked ? "rgba(232,168,0,0.28)" : "rgba(255,94,26,0.22)"}`,
          }}>
            <span style={{
              fontSize: "13px", fontWeight: 800,
              color: unlocked ? "#E8A800" : "#FF8A57",
              fontFamily: "'Syne', sans-serif",
            }}>
              {count}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        {!unlocked && (
          <div style={{
            height: 4, borderRadius: 100,
            background: "rgba(255,255,255,0.06)",
            overflow: "hidden",
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: [0.25, 0, 0, 1], delay: 0.2 }}
              style={{
                height: "100%", borderRadius: 100,
                background: "linear-gradient(90deg, #FF5E1A, #FF8A57)",
              }}
            />
          </div>
        )}

        {/* Reward code if unlocked */}
        {unlocked && streak.reward_code && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 10px", borderRadius: 8,
            background: "rgba(232,168,0,0.08)",
            border: "1px solid rgba(232,168,0,0.20)",
          }}>
            <span style={{ fontSize: "12px" }}>🎁</span>
            <div>
              <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>
                YOUR REWARD CODE
              </div>
              <div style={{
                fontSize: "12px", fontWeight: 800, color: "#E8A800",
                fontFamily: "'Syne', sans-serif", letterSpacing: "1px",
                marginTop: 1,
              }}>
                {streak.reward_code}
              </div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: "9.5px", color: "rgba(255,255,255,0.30)" }}>
              Show at any shop
            </div>
          </div>
        )}
      </motion.div>

      {/* Reward unlock toast */}
      <AnimatePresence>
        {showReward && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ duration: 0.35 }}
            onAnimationComplete={() => {
              setTimeout(() => setShowReward(false), 3500);
            }}
            style={{
              position: "fixed", bottom: 96, left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1000,
              padding: "12px 20px", borderRadius: 14,
              background: "rgba(12,14,20,0.96)",
              border: "1px solid rgba(232,168,0,0.35)",
              boxShadow: "0 4px 32px rgba(232,168,0,0.15)",
              display: "flex", alignItems: "center", gap: 10,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: "20px" }}>🎉</span>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#E8A800" }}>
                3-day streak unlocked!
              </div>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.40)", marginTop: 2 }}>
                Show your reward code at any shop
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
