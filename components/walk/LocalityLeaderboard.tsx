"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { classifyDealEngineType } from "@/lib/deal-engine";
import type { RankedShop } from "@/lib/deal-engine";
import type { WalkLocality } from "@/types";

interface Props {
  locality: Omit<WalkLocality, "shops"> & { shops: RankedShop[] };
}

/**
 * Collapsible accordion showing the top 3 scored deals in this locality.
 * Appears above each LocalitySection so users instantly see the best offers.
 * Pure display — no extra API calls, all data is already in memory.
 */
export default function LocalityLeaderboard({ locality }: Props) {
  const [open, setOpen] = useState(false);

  // Top 3 shops that have an offer and a real score
  const top3 = locality.shops
    .filter(s => s.top_offer && s.dealScore > 0)
    .slice(0, 3);

  if (top3.length === 0) return null;

  const now = Date.now();
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div style={{ margin: "8px 12px 0" }}>
      {/* Collapsed trigger row */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 6,
          padding: "7px 11px", borderRadius: open ? "10px 10px 0 0" : 10,
          background: "rgba(255,94,26,0.06)",
          border: "1px solid rgba(255,94,26,0.18)",
          borderBottom: open ? "1px solid rgba(255,94,26,0.08)" : undefined,
          cursor: "pointer",
          transition: "border-radius 0.2s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: "13px" }}>🏆</span>
          <span style={{
            fontSize: "11px", fontWeight: 700,
            color: "rgba(255,255,255,0.55)",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            Top deals in {locality.name}
          </span>
          {/* Preview pills — top 2 deal types */}
          {!open && top3.slice(0, 2).map((s, i) => {
            const dt = classifyDealEngineType(s.top_offer!, now);
            const label = dt === "big_deal" ? "🔥 Big" : dt === "flash_deal" ? "⚡ Flash" : dt === "mystery" ? "🎁" : "🎯";
            return (
              <span key={s.id} style={{
                fontSize: "9px", fontWeight: 700,
                padding: "1.5px 6px", borderRadius: 100,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
                color: "rgba(255,255,255,0.38)",
              }}>
                {medals[i]} {label}
              </span>
            );
          })}
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ fontSize: "11px", color: "rgba(255,255,255,0.30)" }}
        >
          ▾
        </motion.span>
      </button>

      {/* Expanded list */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="board"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0, 0, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              background: "rgba(255,94,26,0.04)",
              border: "1px solid rgba(255,94,26,0.18)",
              borderTop: "none",
              borderRadius: "0 0 10px 10px",
              padding: "4px 0",
            }}>
              {top3.map((shop, idx) => {
                const offer = shop.top_offer!;
                const dt = classifyDealEngineType(offer, now);
                const offerLabel =
                  offer.discount_type === "percent" && offer.discount_value
                    ? `${offer.discount_value}% off`
                    : offer.discount_type === "flat" && offer.discount_value
                      ? `₹${offer.discount_value} off`
                      : offer.discount_type === "bogo"
                        ? "Buy 1 Get 1"
                        : offer.title.length > 20
                          ? offer.title.slice(0, 18) + "…"
                          : offer.title;

                const typeColor =
                  dt === "big_deal"   ? "#FF6A30" :
                  dt === "flash_deal" ? "#E8A800" :
                  dt === "mystery"    ? "#A78BFA" : "rgba(255,255,255,0.38)";

                return (
                  <div
                    key={shop.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "7px 12px",
                      borderBottom: idx < top3.length - 1
                        ? "1px solid rgba(255,255,255,0.04)"
                        : "none",
                    }}
                  >
                    {/* Medal */}
                    <span style={{ fontSize: "14px", flexShrink: 0, lineHeight: 1 }}>
                      {medals[idx]}
                    </span>

                    {/* Shop icon */}
                    <span style={{ fontSize: "14px", flexShrink: 0, lineHeight: 1 }}>
                      {shop.category?.icon ?? "🏪"}
                    </span>

                    {/* Shop name + offer */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: "11px", fontWeight: 700,
                        color: "#EDEEF5", lineHeight: 1.2,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {shop.name}
                      </div>
                      <div style={{
                        fontSize: "10px", color: typeColor, fontWeight: 600,
                        marginTop: 2, lineHeight: 1,
                      }}>
                        {dt === "mystery" ? "🎁 Mystery Deal" :
                         dt === "big_deal" ? `🔥 ${offerLabel}` :
                         dt === "flash_deal" ? `⚡ ${offerLabel}` :
                         `🎯 ${offerLabel}`}
                      </div>
                    </div>

                    {/* Score pill */}
                    <div style={{
                      flexShrink: 0,
                      padding: "3px 7px", borderRadius: 100,
                      background: "rgba(255,94,26,0.08)",
                      border: "1px solid rgba(255,94,26,0.18)",
                    }}>
                      <span style={{
                        fontSize: "9.5px", fontWeight: 700,
                        color: "#FF8A57",
                      }}>
                        {shop.dealScore}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
