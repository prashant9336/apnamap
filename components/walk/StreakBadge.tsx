"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface RewardOffer {
  id: string;
  title: string;
  shop_name: string;
  expires_at: string | null;
}

interface StreakData {
  streak_count: number;
  reward_unlocked: boolean;
  reward_offer_id: string | null;
  reward_expires_at: string | null;
  reward_redeemed_at: string | null;
  last_visit_date: string;
}

interface Props {
  localityId: string;
  localityName: string;
}

function daysUntil(iso: string | null): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const d = Math.ceil(ms / 86_400_000);
  return d === 1 ? "Expires tomorrow" : `Expires in ${d} days`;
}

export default function StreakBadge({ localityId, localityName }: Props) {
  const [streak,      setStreak]      = useState<StreakData | null>(null);
  const [rewardOffer, setRewardOffer] = useState<RewardOffer | null>(null);
  const [streakGoal,  setStreakGoal]  = useState(3);
  const [showToast,   setShowToast]   = useState(false);
  const [redeeming,   setRedeeming]   = useState(false);
  const [redeemed,    setRedeemed]    = useState(false);
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
        if (!data?.streak) return;
        setStreak(data.streak as StreakData);
        if (data.reward_offer) setRewardOffer(data.reward_offer as RewardOffer);
        if (data.streak_goal)  setStreakGoal(data.streak_goal);
        if (data.streak.reward_redeemed_at) setRedeemed(true);
        if (data.status === "reward_unlocked") {
          setTimeout(() => setShowToast(true), 600);
        }
      })
      .catch(() => {/* non-critical */});
  }, [localityId]);

  async function markUsed() {
    if (redeeming || redeemed) return;
    setRedeeming(true);
    try {
      const res = await fetch("/api/streak/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locality_id: localityId }),
      });
      if (res.ok) {
        setRedeemed(true);
        setStreak(s => s ? { ...s, reward_redeemed_at: new Date().toISOString() } : s);
      }
    } finally {
      setRedeeming(false);
    }
  }

  if (!streak) return null;

  const count       = streak.streak_count;
  const unlocked    = streak.reward_unlocked;
  const goal        = streakGoal;
  const progress    = Math.min(1, count / goal);
  const pct         = Math.round(progress * 100);
  const expiryLabel = daysUntil(streak.reward_expires_at);
  const isExpired   = expiryLabel === "Expired";
  const flame       = count >= 7 ? "🔥🔥" : count >= goal ? "🔥" : "🕯️";

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
          background: unlocked ? "rgba(232,168,0,0.07)" : "rgba(255,94,26,0.05)",
          border: `1px solid ${unlocked ? "rgba(232,168,0,0.22)" : "rgba(255,94,26,0.15)"}`,
          display: "flex", flexDirection: "column", gap: 7,
        }}
      >
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "16px", lineHeight: 1 }}>{flame}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#EDEEF5", lineHeight: 1.2 }}>
              {count}-day streak in {localityName}
            </div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", marginTop: 2, lineHeight: 1 }}>
              {unlocked
                ? redeemed        ? "✓ Reward used"
                  : isExpired     ? "Reward expired"
                  : "🎁 Reward unlocked!"
                : count >= goal - 1
                  ? "1 more day to unlock your reward"
                  : `${goal - count} more days to unlock a reward`}
            </div>
          </div>
          {/* Count badge */}
          <div style={{
            flexShrink: 0, minWidth: 32, textAlign: "center",
            padding: "4px 8px", borderRadius: 100,
            background: unlocked ? "rgba(232,168,0,0.12)" : "rgba(255,94,26,0.10)",
            border: `1px solid ${unlocked ? "rgba(232,168,0,0.28)" : "rgba(255,94,26,0.22)"}`,
          }}>
            <span style={{ fontSize: "13px", fontWeight: 800, color: unlocked ? "#E8A800" : "#FF8A57", fontFamily: "'Syne', sans-serif" }}>
              {count}
            </span>
          </div>
        </div>

        {/* Progress bar (only while building) */}
        {!unlocked && (
          <div style={{ height: 4, borderRadius: 100, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: [0.25, 0, 0, 1], delay: 0.2 }}
              style={{ height: "100%", borderRadius: 100, background: "linear-gradient(90deg, #FF5E1A, #FF8A57)" }}
            />
          </div>
        )}

        {/* Reward card — active & unredeemed */}
        {unlocked && rewardOffer && !redeemed && !isExpired && (
          <div style={{
            padding: "8px 10px", borderRadius: 9,
            background: "rgba(232,168,0,0.08)",
            border: "1px solid rgba(232,168,0,0.20)",
            display: "flex", flexDirection: "column", gap: 5,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)", fontWeight: 600, letterSpacing: "0.5px" }}>
                  YOUR REWARD
                </div>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "#E8A800", marginTop: 2, lineHeight: 1.3 }}>
                  {rewardOffer.title}
                </div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
                  at {rewardOffer.shop_name}
                </div>
              </div>
              <span style={{ fontSize: "20px", flexShrink: 0 }}>🎁</span>
            </div>
            {expiryLabel && (
              <div style={{ fontSize: "9.5px", color: "rgba(255,255,255,0.30)" }}>
                ⏰ {expiryLabel}
              </div>
            )}
            <button
              onClick={markUsed}
              disabled={redeeming}
              style={{
                marginTop: 2, padding: "7px 0", borderRadius: 7, width: "100%",
                background: redeeming ? "rgba(31,187,90,0.25)" : "#1FBB5A",
                color: "#fff", fontSize: "11px", fontWeight: 700,
                border: "none", cursor: redeeming ? "default" : "pointer",
                opacity: redeeming ? 0.7 : 1,
              }}
            >
              {redeeming ? "Marking…" : "✓ Mark as Used"}
            </button>
          </div>
        )}

        {/* Redeemed state */}
        {unlocked && redeemed && (
          <div style={{
            padding: "7px 10px", borderRadius: 9,
            background: "rgba(31,187,90,0.07)", border: "1px solid rgba(31,187,90,0.20)",
            fontSize: "11px", color: "#1FBB5A", fontWeight: 600,
          }}>
            ✓ Reward redeemed — come back tomorrow to start a new streak!
          </div>
        )}

        {/* Expired state */}
        {unlocked && isExpired && !redeemed && (
          <div style={{
            padding: "7px 10px", borderRadius: 9,
            background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)",
            fontSize: "11px", color: "#f87171", fontWeight: 600,
          }}>
            Reward expired. Keep your streak going for the next one!
          </div>
        )}

        {/* Unlocked but no offer available */}
        {unlocked && !rewardOffer && !redeemed && !isExpired && (
          <div style={{
            padding: "7px 10px", borderRadius: 9,
            background: "rgba(232,168,0,0.06)", border: "1px solid rgba(232,168,0,0.18)",
            fontSize: "11px", color: "#E8A800", fontWeight: 600,
          }}>
            🎁 Streak unlocked! Check back soon — new offers are on the way.
          </div>
        )}
      </motion.div>

      {/* Unlock toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ duration: 0.35 }}
            onAnimationComplete={() => { setTimeout(() => setShowToast(false), 3500); }}
            style={{
              position: "fixed", bottom: 96, left: "50%", transform: "translateX(-50%)",
              zIndex: 1000, padding: "12px 20px", borderRadius: 14,
              background: "rgba(12,14,20,0.96)",
              border: "1px solid rgba(232,168,0,0.35)",
              boxShadow: "0 4px 32px rgba(232,168,0,0.15)",
              display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: "20px" }}>🎉</span>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#E8A800" }}>
                {goal}-day streak unlocked!
              </div>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.40)", marginTop: 2 }}>
                {rewardOffer ? `${rewardOffer.title} at ${rewardOffer.shop_name}` : "Check your reward above"}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
