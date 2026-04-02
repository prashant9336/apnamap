"use client";
import { useState } from "react";
import { motion } from "framer-motion";

export interface VendorDeal {
  id:             string;
  title:          string;
  description?:   string | null;
  discount_type:  string;
  discount_value: number | null;
  tier:           1 | 2 | 3;
  is_active:      boolean;
  is_mystery:     boolean;
  ends_at:        string | null;
  view_count:     number;
  click_count:    number;
  created_at:     string;
}

interface Props {
  deal:     VendorDeal;
  onExpire: (id: string) => Promise<void>;
  onEdit:   (deal: VendorDeal) => void;
}

export default function DealCard({ deal, onExpire, onEdit }: Props) {
  const [expiring,   setExpiring]   = useState(false);
  const [boostTapped, setBoostTapped] = useState(false);

  const isExpired =
    !deal.is_active || (!!deal.ends_at && new Date(deal.ends_at) <= new Date());
  const status = isExpired ? "expired" : "active";

  const ctr    = deal.view_count > 0 ? deal.click_count / deal.view_count : 0;
  const ctrPct = Math.round(ctr * 100);

  /* Type badge ─────────────────────────────────────────────────── */
  const BADGE: Record<number, { label: string; color: string; bg: string }> = {
    1: { label: "🔥 Big Deal", color: "#FF6A30", bg: "rgba(255,80,0,0.09)"   },
    2: { label: "⚡ Flash",    color: "#E8A800", bg: "rgba(232,168,0,0.09)"  },
    3: { label: "🎯 Basic",    color: "rgba(255,255,255,0.35)", bg: "rgba(255,255,255,0.05)" },
  };
  const badge = deal.is_mystery
    ? { label: "🎁 Mystery", color: "#A78BFA", bg: "rgba(167,139,250,0.09)" }
    : (BADGE[deal.tier] ?? BADGE[3]);

  /* Discount label ─────────────────────────────────────────────── */
  let discLabel = "";
  if (deal.discount_type === "percent" && deal.discount_value)
    discLabel = `${deal.discount_value}% off`;
  else if (deal.discount_type === "flat" && deal.discount_value)
    discLabel = `₹${deal.discount_value} off`;
  else if (deal.discount_type === "bogo") discLabel = "Buy 1 Get 1";
  else if (deal.discount_type === "free") discLabel = "Free";

  async function handleExpire() {
    if (!window.confirm("Mark this deal as expired?")) return;
    setExpiring(true);
    await onExpire(deal.id);
    setExpiring(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding:    "14px",
        borderRadius: 14,
        background: isExpired
          ? "rgba(255,255,255,0.025)"
          : "rgba(255,255,255,0.038)",
        border: isExpired
          ? "1px solid rgba(255,255,255,0.07)"
          : "1px solid rgba(255,94,26,0.14)",
        opacity: isExpired ? 0.6 : 1,
      }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: "13px", fontWeight: 700, color: "#EDEEF5",
            marginBottom: 4, lineHeight: 1.3,
          }}>
            {deal.title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{
              fontSize: "9px", fontWeight: 700,
              color: badge.color, background: badge.bg,
              padding: "2px 7px", borderRadius: 100,
            }}>
              {badge.label}
            </span>
            {discLabel && (
              <span style={{ fontSize: "10px", fontWeight: 600, color: badge.color }}>
                · {discLabel}
              </span>
            )}
          </div>
        </div>

        {/* Status pill */}
        <div style={{
          flexShrink: 0, padding: "3px 8px", borderRadius: 100,
          fontSize: "9px", fontWeight: 700,
          background: status === "active" ? "rgba(31,187,90,0.10)" : "rgba(255,255,255,0.05)",
          color:      status === "active" ? "#1FBB5A"               : "rgba(255,255,255,0.30)",
          border: `1px solid ${status === "active" ? "rgba(31,187,90,0.22)" : "rgba(255,255,255,0.07)"}`,
        }}>
          {status === "active" ? "● Active" : "● Expired"}
        </div>
      </div>

      {/* ── Analytics grid ─────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
        {[
          { icon: "👁",  label: "Views",  value: deal.view_count.toLocaleString("en-IN") },
          { icon: "👆",  label: "Clicks", value: deal.click_count.toLocaleString("en-IN") },
          { icon: "📈",  label: "CTR",    value: `${ctrPct}%` },
        ].map(s => (
          <div key={s.label} style={{
            padding: "8px 6px", borderRadius: 9, textAlign: "center",
            background: "rgba(255,255,255,0.04)",
            border:     "1px solid rgba(255,255,255,0.07)",
          }}>
            <div style={{ fontSize: "12px", marginBottom: 2 }}>{s.icon}</div>
            <div className="font-syne" style={{
              fontSize: "13px", fontWeight: 800, color: "#EDEEF5",
            }}>
              {s.value}
            </div>
            <div style={{ fontSize: "8.5px", color: "rgba(255,255,255,0.28)", marginTop: 1 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* CTR progress bar */}
      {deal.view_count > 0 && (
        <div style={{
          height: 3, borderRadius: 4,
          background: "rgba(255,255,255,0.07)", overflow: "hidden", marginBottom: 10,
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, ctrPct * 3)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
              height: "100%", borderRadius: 4,
              background: ctrPct > 8 ? "#FF5E1A" : "#1FBB5A",
            }}
          />
        </div>
      )}

      {/* Expiry notice */}
      {deal.ends_at && (
        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.28)", marginBottom: 10 }}>
          ⏱{" "}
          {status === "active"
            ? `Expires ${new Date(deal.ends_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
            : `Expired ${new Date(deal.ends_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
        </div>
      )}

      {/* ── Action row (active deals only) ─────────────────────── */}
      {status === "active" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7 }}>
          {/* Edit */}
          <button
            type="button"
            onClick={() => onEdit(deal)}
            style={{
              padding: "8px 0", borderRadius: 9, fontSize: "11px", fontWeight: 700,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
              color: "rgba(255,255,255,0.55)", cursor: "pointer",
            }}
          >
            ✏️ Edit
          </button>

          {/* Expire */}
          <button
            type="button"
            onClick={handleExpire}
            disabled={expiring}
            style={{
              padding: "8px 0", borderRadius: 9, fontSize: "11px", fontWeight: 700,
              background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.16)",
              color: "#f87171", cursor: "pointer", opacity: expiring ? 0.5 : 1,
            }}
          >
            {expiring ? "…" : "⏱ Expire"}
          </button>

          {/* Boost — UI only, no payment */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.93 }}
            onClick={() => setBoostTapped(true)}
            style={{
              padding: "8px 0", borderRadius: 9, fontSize: "11px", fontWeight: 800,
              background: boostTapped ? "rgba(167,139,250,0.14)" : "rgba(255,94,26,0.09)",
              border: boostTapped ? "1px solid rgba(167,139,250,0.30)" : "1px solid rgba(255,94,26,0.22)",
              color: boostTapped ? "#A78BFA" : "#FF5E1A", cursor: "pointer",
            }}
          >
            {boostTapped ? "✓ Soon" : "🚀 Boost"}
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
