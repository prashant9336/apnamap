"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import VoiceRecorder from "./VoiceRecorder";
import VoiceDraftPreview from "./VoiceDraftPreview";
import type { VoicePostDraft } from "@/types";

type Phase = "record" | "processing" | "preview" | "success";

const PHASE_SUBTITLE: Record<Phase, string> = {
  record:     "Speak in Hindi, Hinglish, or English",
  processing: "Preparing your post draft…",
  preview:    "Review and edit before posting",
  success:    "Your offer is live!",
};

interface Props {
  shopId: string;
  onClose: () => void;
  /** Called after successful publish so parent can refresh its post list */
  onPublished?: () => void;
}

export default function VoicePostModal({ shopId, onClose, onPublished }: Props) {
  const [phase,   setPhase]   = useState<Phase>("record");
  const [draft,   setDraft]   = useState<VoicePostDraft | null>(null);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  // ── Step 2: transcript received → call API ──────────────────────
  const handleTranscript = useCallback(async (transcript: string) => {
    setPhase("processing");
    setError("");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/vendor/voice-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ transcript, shop_id: shopId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to process recording");
      setDraft(data.draft as VoicePostDraft);
      setPhase("preview");
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
      setPhase("record");
    }
  }, [shopId]);

  // ── Step 3a: Publish now ────────────────────────────────────────
  const handlePublish = useCallback(async (updated: VoicePostDraft) => {
    if (!updated.id) return;
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      // 1. Mark draft as published via API
      const res = await fetch("/api/vendor/voice-post", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ ...updated, is_published: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Publish failed");

      // 2. Also push to quick_posts so it appears in real-time feed
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const expiresAt = updated.valid_until
          ? new Date(updated.valid_until).toISOString()
          : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        await supabase.from("quick_posts").insert({
          shop_id:    shopId,
          user_id:    user.id,
          post_type:  updated.deal_type ?? "flash_deal",
          message:    (updated.description || updated.title).slice(0, 200),
          is_active:  true,
          expires_at: expiresAt,
        });
      }

      setPhase("success");
      onPublished?.();
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [shopId, onPublished]);

  // ── Step 3b: Save draft only ────────────────────────────────────
  const handleSaveDraft = useCallback(async (updated: VoicePostDraft) => {
    if (!updated.id) return;
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/vendor/voice-post", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ ...updated, is_published: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [onClose]);

  const handleRecordAgain = useCallback(() => {
    setDraft(null);
    setError("");
    setPhase("record");
  }, []);

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(5,7,12,0.80)",
          backdropFilter: "blur(6px)",
        }}
      />

      {/* Bottom sheet */}
      <motion.div
        key="sheet"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          zIndex: 201,
          background: "#0D1017",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px 20px 0 0",
          maxHeight: "92dvh",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Drag handle */}
        <div style={{
          flexShrink: 0, display: "flex",
          justifyContent: "center", paddingTop: 10,
        }}>
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: "rgba(255,255,255,0.12)",
          }} />
        </div>

        {/* Header */}
        <div style={{
          flexShrink: 0, display: "flex",
          alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px 8px",
        }}>
          <div>
            <h3 style={{
              margin: 0, fontSize: 15, fontWeight: 800,
              color: "#EDEEF5", fontFamily: "'Syne',sans-serif",
            }}>
              🎙️ Speak Your Offer
            </h3>
            <p style={{
              margin: "3px 0 0", fontSize: 11,
              color: "rgba(255,255,255,0.28)",
            }}>
              {PHASE_SUBTITLE[phase]}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 30, height: 30, borderRadius: "50%",
              border: "none", cursor: "pointer",
              background: "rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.45)",
              fontSize: 14, display: "flex",
              alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable content area — bottom padding clears home indicator in PWA/TWA */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 16px", paddingBottom: "max(env(safe-area-inset-bottom, 0px), 32px)" }}>

          {/* Error banner */}
          {error && (
            <div style={{
              padding: "8px 12px", borderRadius: 8, marginBottom: 12,
              background: "rgba(239,68,68,0.09)",
              border: "1px solid rgba(239,68,68,0.22)",
              color: "#f87171", fontSize: 12,
            }}>
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">

            {/* ── Record phase ── */}
            {phase === "record" && (
              <motion.div
                key="record"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <VoiceRecorder onTranscript={handleTranscript} />

                {/* Example hints */}
                <div style={{
                  marginTop: 4, fontSize: 11,
                  color: "rgba(255,255,255,0.18)",
                  textAlign: "center", lineHeight: 1.7,
                }}>
                  Examples:<br />
                  "Aaj ladies suit par 40% off, sirf aaj ke liye, Civil Lines"<br />
                  "Do jeans lo ek free, Katra shop, weekend tak"<br />
                  "Naya summer collection aaya hai, kids wear"
                </div>
              </motion.div>
            )}

            {/* ── Processing phase ── */}
            {phase === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", padding: "48px 16px", gap: 16,
                }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                  style={{
                    width: 42, height: 42, borderRadius: "50%",
                    border: "3px solid rgba(255,94,26,0.18)",
                    borderTopColor: "#FF5E1A",
                  }}
                />
                <p style={{
                  fontSize: 13, color: "rgba(255,255,255,0.42)", margin: 0,
                }}>
                  Preparing your post draft…
                </p>
              </motion.div>
            )}

            {/* ── Preview phase ── */}
            {phase === "preview" && draft && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <VoiceDraftPreview
                  draft={draft}
                  onPublish={handlePublish}
                  onSaveDraft={handleSaveDraft}
                  onRecordAgain={handleRecordAgain}
                  loading={loading}
                />
              </motion.div>
            )}

            {/* ── Success phase ── */}
            {phase === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", padding: "44px 16px 20px",
                  gap: 12, textAlign: "center",
                }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 14, delay: 0.1 }}
                  style={{ fontSize: 52 }}
                >
                  🎉
                </motion.div>
                <h3 style={{
                  margin: 0, fontSize: 20, fontWeight: 800,
                  color: "#EDEEF5", fontFamily: "'Syne',sans-serif",
                }}>
                  Offer is Live!
                </h3>
                <p style={{
                  margin: 0, fontSize: 13,
                  color: "rgba(255,255,255,0.38)", lineHeight: 1.6,
                }}>
                  Customers near your shop can see your offer now.
                </p>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  style={{
                    marginTop: 10, padding: "12px 36px",
                    borderRadius: 100, border: "none",
                    background: "linear-gradient(135deg,#FF5E1A,#FF8C3A)",
                    color: "#fff", fontSize: 14, fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 0 20px rgba(255,94,26,0.4)",
                  }}
                >
                  Done
                </motion.button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
