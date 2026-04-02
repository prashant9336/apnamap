"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { DealType, VoicePostDraft } from "@/types";

const DEAL_OPTIONS: { value: DealType; label: string }[] = [
  { value: "flash_deal",    label: "⚡ Flash Deal"    },
  { value: "big_deal",      label: "🔥 Big Deal"      },
  { value: "combo_offer",   label: "🎁 Combo Offer"   },
  { value: "new_arrival",   label: "🆕 New Arrival"   },
  { value: "festive_offer", label: "🎉 Festive Offer" },
  { value: "limited_stock", label: "⏳ Limited Stock" },
  { value: "clearance",     label: "🏷️ Clearance"    },
  { value: "regular_offer", label: "🎯 Special Offer" },
];

const labelStyle: React.CSSProperties = {
  display: "block", marginBottom: 5,
  fontSize: 10, fontWeight: 700,
  color: "rgba(255,255,255,0.28)",
  textTransform: "uppercase", letterSpacing: "0.8px",
};

const inputBase: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "9px 11px", borderRadius: 9,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "#EDEEF5", outline: "none",
  fontFamily: "inherit",
};

interface Props {
  draft: VoicePostDraft;
  onPublish: (draft: VoicePostDraft) => Promise<void>;
  onSaveDraft: (draft: VoicePostDraft) => Promise<void>;
  onRecordAgain: () => void;
  loading?: boolean;
}

export default function VoiceDraftPreview({
  draft: initial,
  onPublish,
  onSaveDraft,
  onRecordAgain,
  loading,
}: Props) {
  const [draft, setDraft] = useState<VoicePostDraft>(initial);

  function set<K extends keyof VoicePostDraft>(key: K, value: VoicePostDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  const canPost = draft.title.trim().length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Transcript callout */}
      {draft.cleaned_transcript && (
        <div style={{
          padding: "8px 12px", borderRadius: 9,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          fontSize: 11, color: "rgba(255,255,255,0.32)",
          lineHeight: 1.6, fontStyle: "italic",
        }}>
          "{draft.cleaned_transcript}"
        </div>
      )}

      {/* Deal type pills */}
      <div>
        <span style={labelStyle}>Deal Type</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {DEAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => set("deal_type", opt.value)}
              disabled={loading}
              style={{
                padding: "4px 10px", borderRadius: 100,
                fontSize: 11, fontWeight: 600,
                cursor: "pointer", border: "none",
                transition: "all 0.15s",
                ...(draft.deal_type === opt.value
                  ? {
                      background: "rgba(255,94,26,0.18)",
                      color: "#FF5E1A",
                      outline: "1px solid rgba(255,94,26,0.38)",
                    }
                  : {
                      background: "rgba(255,255,255,0.05)",
                      color: "rgba(255,255,255,0.35)",
                      outline: "1px solid rgba(255,255,255,0.08)",
                    }),
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label style={labelStyle}>Title</label>
        <input
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          maxLength={80}
          disabled={loading}
          style={{ ...inputBase, fontSize: 13, fontWeight: 600 }}
        />
      </div>

      {/* Description */}
      <div>
        <label style={labelStyle}>Description</label>
        <textarea
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          maxLength={200}
          disabled={loading}
          style={{ ...inputBase, fontSize: 12, lineHeight: 1.5, resize: "none" }}
        />
      </div>

      {/* Offer value + validity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>Offer Value</label>
          <input
            value={draft.offer_value_text ?? ""}
            onChange={(e) => set("offer_value_text", e.target.value)}
            placeholder="e.g. 30% off"
            disabled={loading}
            style={{ ...inputBase, fontSize: 12 }}
          />
        </div>
        <div>
          <label style={labelStyle}>Valid Until</label>
          <input
            value={draft.validity_text ?? ""}
            onChange={(e) => set("validity_text", e.target.value)}
            placeholder="e.g. Today only"
            disabled={loading}
            style={{ ...inputBase, fontSize: 12 }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 2 }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onPublish(draft)}
          disabled={loading || !canPost}
          style={{
            padding: "13px", borderRadius: 12, border: "none",
            cursor: loading || !canPost ? "not-allowed" : "pointer",
            background: "linear-gradient(135deg,#FF5E1A,#FF8C3A)",
            color: "#fff", fontSize: 14, fontWeight: 700,
            boxShadow: "0 0 20px rgba(255,94,26,0.35)",
            opacity: loading || !canPost ? 0.6 : 1,
            transition: "opacity 0.2s",
          }}
        >
          {loading ? "Publishing…" : "🚀 Post Now"}
        </motion.button>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => onSaveDraft(draft)}
            disabled={loading}
            style={{
              flex: 1, padding: "11px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.10)",
              cursor: "pointer",
              background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.55)",
              fontSize: 13, fontWeight: 600,
            }}
          >
            💾 Save Draft
          </button>
          <button
            onClick={onRecordAgain}
            disabled={loading}
            style={{
              flex: 1, padding: "11px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.10)",
              cursor: "pointer",
              background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.55)",
              fontSize: 13, fontWeight: 600,
            }}
          >
            🎙 Record Again
          </button>
        </div>
      </div>
    </div>
  );
}
