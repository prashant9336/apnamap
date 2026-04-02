"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type FormDealType  = "big_deal" | "flash_deal";
type DiscountType  = "percent" | "flat" | "bogo" | "free";

interface Props {
  shopId:    string;
  dealType:  FormDealType;
  onClose:   () => void;
  onCreated: (deal: Record<string, unknown>) => void;
}

const DISCOUNT_OPTS: { key: DiscountType; label: string }[] = [
  { key: "percent", label: "%" },
  { key: "flat",    label: "₹" },
  { key: "bogo",    label: "BOGO" },
  { key: "free",    label: "Free" },
];

const FLASH_PRESETS: { label: string; hours: number }[] = [
  { label: "1 hr",  hours: 1 },
  { label: "2 hr",  hours: 2 },
  { label: "4 hr",  hours: 4 },
  { label: "Today", hours: 0 }, // special: remainder of today
];

export default function DealFormModal({ shopId, dealType, onClose, onCreated }: Props) {
  const [title,         setTitle]         = useState("");
  const [discountType,  setDiscountType]  = useState<DiscountType>("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [flashHours,    setFlashHours]    = useState<number>(2);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");

  const isFlash   = dealType === "flash_deal";
  const heading   = isFlash ? "⚡ Flash Deal" : "🔥 Big Deal";
  const btnColor  = isFlash ? "#E8A800" : "#FF5E1A";

  async function handleSubmit() {
    if (!title.trim()) { setError("Deal title is required"); return; }

    // For "Today" preset, compute hours until midnight
    const expiresIn = flashHours === 0
      ? Math.max(1, Math.ceil(
          (new Date().setHours(23, 59, 59, 999) - Date.now()) / 3_600_000
        ))
      : flashHours;

    const body = {
      shop_id:          shopId,
      title:            title.trim(),
      deal_type:        dealType,
      discount_type:    discountValue.trim() ? discountType : "other",
      discount_value:   discountValue.trim() ? parseFloat(discountValue) : null,
      expires_in_hours: isFlash ? expiresIn : null,
    };

    try {
      setSaving(true);
      setError("");
      const res  = await fetch("/api/vendor/deals", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to post deal");
      onCreated(json.deal);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to post deal");
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.72)", backdropFilter: "blur(5px)",
        }}
      >
        {/* Sheet */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          onClick={e => e.stopPropagation()}
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            borderRadius: "20px 20px 0 0",
            background: "#0D1016",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "20px 20px 36px",
            maxHeight: "90vh", overflowY: "auto",
          }}
        >
          {/* Handle */}
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: "rgba(255,255,255,0.12)", margin: "0 auto 20px",
          }} />

          {/* Heading */}
          <div className="font-syne" style={{
            fontSize: "18px", fontWeight: 800, color: "#EDEEF5", marginBottom: 20,
          }}>
            {heading}
          </div>

          {/* ── Title ─────────────────────────────────────────── */}
          <FieldLabel>Deal Title</FieldLabel>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={isFlash ? "e.g. Flash Sale — all items" : "e.g. Grand Diwali Offer"}
            autoFocus
            style={inputStyle}
          />

          {/* ── Discount type ──────────────────────────────────── */}
          <FieldLabel>Discount (optional)</FieldLabel>
          <div style={{ display: "flex", gap: 8, marginTop: 6, marginBottom: 6 }}>
            {DISCOUNT_OPTS.map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setDiscountType(opt.key)}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 9,
                  fontSize: "11px", fontWeight: 700, cursor: "pointer",
                  background: discountType === opt.key ? `${btnColor}1A` : "rgba(255,255,255,0.05)",
                  border:     discountType === opt.key ? `1px solid ${btnColor}55` : "1px solid rgba(255,255,255,0.08)",
                  color:      discountType === opt.key ? btnColor : "rgba(255,255,255,0.40)",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Discount value — only for % and ₹ */}
          {(discountType === "percent" || discountType === "flat") && (
            <input
              type="number"
              value={discountValue}
              onChange={e => setDiscountValue(e.target.value)}
              placeholder={discountType === "percent" ? "e.g. 30" : "e.g. 100"}
              style={{ ...inputStyle, marginBottom: 16 }}
            />
          )}
          {(discountType === "bogo" || discountType === "free") && (
            <div style={{ height: 16 }} />
          )}

          {/* ── Flash timer (Flash Deal only) ───────────────────── */}
          {isFlash && (
            <>
              <FieldLabel>Expires in</FieldLabel>
              <div style={{ display: "flex", gap: 8, marginTop: 6, marginBottom: 20 }}>
                {FLASH_PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setFlashHours(p.hours)}
                    style={{
                      flex: 1, padding: "9px 0", borderRadius: 10,
                      fontSize: "12px", fontWeight: 700, cursor: "pointer",
                      background: flashHours === p.hours ? "rgba(232,168,0,0.14)" : "rgba(255,255,255,0.05)",
                      border:     flashHours === p.hours ? "1px solid rgba(232,168,0,0.38)" : "1px solid rgba(255,255,255,0.08)",
                      color:      flashHours === p.hours ? "#E8A800" : "rgba(255,255,255,0.40)",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div style={{
              marginBottom: 14, padding: "9px 12px", borderRadius: 9,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)",
              fontSize: "12px", color: "#f87171",
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
            style={{
              width: "100%", padding: "14px", borderRadius: 13,
              background: btnColor, color: "#fff",
              fontWeight: 800, fontSize: "15px",
              border: "none", cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif",
              opacity: saving || !title.trim() ? 0.5 : 1,
            }}
          >
            {saving ? "Posting…" : `Post ${heading}`}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: "11px", fontWeight: 600,
      color: "rgba(255,255,255,0.40)",
      letterSpacing: "0.5px", textTransform: "uppercase",
      marginBottom: 6,
    }}>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%",
  marginTop: 0, marginBottom: 16,
  padding: "12px 13px", borderRadius: 11,
  fontSize: "14px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "#EDEEF5", outline: "none",
  boxSizing: "border-box",
  fontFamily: "'DM Sans',sans-serif",
};
