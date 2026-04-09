"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import DealFormModal             from "./DealFormModal";
import DealCard, { type VendorDeal } from "./DealCard";
import VoicePostModal            from "./VoicePostModal";

async function getToken(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession();
  return session?.access_token ?? "";
}

interface Props {
  shopId:   string;
  shopName: string;
}

/* ── Quick Post bar (inline WhatsApp-style) ─────────────────────── */
function QuickPostBar({
  shopId,
  onPosted,
}: {
  shopId:   string;
  onPosted: () => void;
}) {
  const [text,    setText]    = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!text.trim()) return;
    setSending(true);
    try {
      const tok = await getToken();
      await fetch("/api/vendor/deals", {
        method:  "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tok}` },
        body: JSON.stringify({ shop_id: shopId, title: text.trim(), deal_type: "new_deal" }),
      });
      setText("");
      onPosted();
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 9, alignItems: "flex-end", marginTop: 12 }}>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        rows={2}
        placeholder="Type a quick update for your customers…"
        style={{
          flex: 1, padding: "10px 12px", borderRadius: 11, resize: "none",
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)",
          color: "var(--t1)", fontSize: "13px", outline: "none",
          fontFamily: "'DM Sans',sans-serif",
        }}
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={sending || !text.trim()}
        style={{
          padding: "11px 16px", borderRadius: 11,
          background: "#1FBB5A", color: "#fff",
          fontWeight: 800, fontSize: "13px",
          border: "none", cursor: "pointer",
          opacity: sending || !text.trim() ? 0.5 : 1,
          flexShrink: 0, fontFamily: "'DM Sans',sans-serif",
        }}
      >
        {sending ? "…" : "Send"}
      </button>
    </div>
  );
}

/* ── Edit modal — minimal bottom-sheet ─────────────────────────── */
function EditDealModal({
  deal,
  onClose,
  onSave,
}: {
  deal:    VendorDeal;
  onClose: () => void;
  onSave:  (deal: VendorDeal, title: string) => Promise<void>;
}) {
  const [title,  setTitle]  = useState(deal.title);
  const [saving, setSaving] = useState(false);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "rgba(0,0,0,0.72)", backdropFilter: "blur(5px)",
        }}
      >
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
          }}
        >
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: "rgba(255,255,255,0.12)", margin: "0 auto 20px",
          }} />
          <div className="font-syne" style={{
            fontSize: "16px", fontWeight: 800, color: "#EDEEF5", marginBottom: 14,
          }}>
            Edit Deal
          </div>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
            style={{
              display: "block", width: "100%", marginBottom: 18,
              padding: "12px 13px", borderRadius: 11, fontSize: "14px",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)",
              color: "#EDEEF5", outline: "none", boxSizing: "border-box",
              fontFamily: "'DM Sans',sans-serif",
            }}
          />
          <button
            type="button"
            disabled={saving || !title.trim()}
            onClick={async () => {
              setSaving(true);
              await onSave(deal, title);
              setSaving(false);
            }}
            style={{
              width: "100%", padding: "13px", borderRadius: 12,
              background: "var(--accent, #FF5E1A)", color: "#fff",
              fontWeight: 800, fontSize: "14px", border: "none",
              cursor: "pointer", opacity: saving || !title.trim() ? 0.5 : 1,
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Main VendorPostPanel ───────────────────────────────────────── */
type ModalType = "big_deal" | "flash_deal" | "voice" | "quick" | null;

export default function VendorPostPanel({ shopId, shopName }: Props) {
  const [deals,      setDeals]      = useState<VendorDeal[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState<ModalType>(null);
  const [editTarget, setEditTarget] = useState<VendorDeal | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    const tok = await getToken();
    const res = await fetch(`/api/vendor/deals?shop_id=${shopId}`, {
      headers: { "Authorization": `Bearer ${tok}` },
    });
    if (res.ok) {
      const { deals: d } = await res.json() as { deals: VendorDeal[] };
      setDeals(d ?? []);
    }
    setLoading(false);
  }, [shopId]);

  useEffect(() => { fetchDeals(); }, [fetchDeals, refreshKey]);

  function refresh() { setRefreshKey(k => k + 1); }

  async function handleExpire(id: string) {
    const tok = await getToken();
    await fetch("/api/vendor/deals", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tok}` },
      body: JSON.stringify({ id, is_active: false }),
    });
    setDeals(prev => prev.map(d => d.id === id ? { ...d, is_active: false } : d));
  }

  async function handleEditSave(deal: VendorDeal, title: string) {
    const tok = await getToken();
    const res = await fetch("/api/vendor/deals", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tok}` },
      body: JSON.stringify({ id: deal.id, title }),
    });
    if (res.ok) {
      const { deal: updated } = await res.json() as { deal: VendorDeal };
      setDeals(prev => prev.map(d => d.id === deal.id ? updated : d));
    }
    setEditTarget(null);
  }

  /* Split into active vs past */
  const activeDeals = deals.filter(
    d => d.is_active && (!d.ends_at || new Date(d.ends_at) > new Date())
  );
  const pastDeals = deals.filter(
    d => !d.is_active || (!!d.ends_at && new Date(d.ends_at) <= new Date())
  );

  /* ── Action buttons config ─────────────────────────────────── */
  const ACTIONS: {
    key:    ModalType;
    icon:   string;
    label:  string;
    accent: string;
  }[] = [
    { key: "voice",      icon: "🎤", label: "Speak Deal", accent: "#A78BFA" },
    { key: "big_deal",   icon: "🔥", label: "Big Deal",   accent: "#FF5E1A" },
    { key: "flash_deal", icon: "⚡", label: "Flash Deal", accent: "#E8A800" },
    { key: "quick",      icon: "➕", label: "Quick Post", accent: "#1FBB5A" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── 4-button post panel ─────────────────────────────── */}
      <div style={{
        padding: "16px", borderRadius: 16,
        background: "rgba(255,255,255,0.034)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", marginBottom: 14,
        }}>
          <div>
            <div className="font-syne" style={{
              fontSize: "14px", fontWeight: 800, color: "#EDEEF5",
            }}>
              Post a Deal
            </div>
            <div style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.30)", marginTop: 2 }}>
              {shopName}
            </div>
          </div>
          {/* Active count pill */}
          <div style={{
            fontSize: "10px", fontWeight: 700,
            color: "#1FBB5A",
            background: "rgba(31,187,90,0.09)",
            border: "1px solid rgba(31,187,90,0.20)",
            padding: "3px 9px", borderRadius: 100,
          }}>
            {activeDeals.length} active
          </div>
        </div>

        {/* 4 buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 9 }}>
          {ACTIONS.map(btn => (
            <motion.button
              key={String(btn.key)}
              type="button"
              data-action={String(btn.key)}
              whileTap={{ scale: 0.91 }}
              onClick={() => setModal(modal === btn.key ? null : btn.key)}
              style={{
                padding: "13px 6px 10px", borderRadius: 13,
                border:     `1px solid ${btn.accent}28`,
                background: modal === btn.key ? `${btn.accent}1E` : `${btn.accent}10`,
                cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
              }}
            >
              <span style={{ fontSize: "21px" }}>{btn.icon}</span>
              <span style={{
                fontSize: "9px", fontWeight: 700,
                color: btn.accent, textAlign: "center",
                lineHeight: 1.2, whiteSpace: "nowrap",
              }}>
                {btn.label}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Inline Quick Post textarea — slides in below buttons */}
        <AnimatePresence>
          {modal === "quick" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden" }}
            >
              <QuickPostBar
                shopId={shopId}
                onPosted={() => { setModal(null); refresh(); }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Deal list ───────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2].map(i => (
            <div key={i} style={{ height: 150, borderRadius: 14 }} className="shimmer" />
          ))}
        </div>
      ) : (
        <>
          {/* Active deals */}
          {activeDeals.length > 0 && (
            <section>
              <SectionLabel>Active Deals · {activeDeals.length}</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {activeDeals.map(deal => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    onExpire={handleExpire}
                    onEdit={setEditTarget}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Past deals — show up to 3 */}
          {pastDeals.length > 0 && (
            <section>
              <SectionLabel style={{ color: "rgba(255,255,255,0.25)" }}>
                Past Deals · {pastDeals.length}
              </SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {pastDeals.slice(0, 3).map(deal => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    onExpire={handleExpire}
                    onEdit={setEditTarget}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {deals.length === 0 && (
            <div style={{
              textAlign: "center", padding: "36px 20px",
              borderRadius: 14,
              border: "1px dashed rgba(255,255,255,0.09)",
            }}>
              <div style={{ fontSize: "36px", marginBottom: 10 }}>🎯</div>
              <div className="font-syne" style={{
                fontSize: "14px", fontWeight: 800, color: "#EDEEF5", marginBottom: 6,
              }}>
                No deals posted yet
              </div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>
                Tap a button above to post your first deal — it shows up instantly
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Modals ──────────────────────────────────────────────── */}
      {(modal === "big_deal" || modal === "flash_deal") && (
        <DealFormModal
          shopId={shopId}
          dealType={modal}
          onClose={() => setModal(null)}
          onCreated={deal => {
            setDeals(prev => [deal as unknown as VendorDeal, ...prev]);
            setModal(null);
          }}
        />
      )}

      {modal === "voice" && (
        <VoicePostModal
          shopId={shopId}
          onClose={() => setModal(null)}
          onPublished={() => { setModal(null); refresh(); }}
        />
      )}

      {editTarget && (
        <EditDealModal
          deal={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}

/* ── Tiny helpers ─────────────────────────────────────────────────── */
function SectionLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div className="font-syne" style={{
      fontSize: "11px", fontWeight: 700,
      color: "rgba(255,255,255,0.42)",
      textTransform: "uppercase", letterSpacing: "0.6px",
      marginBottom: 10,
      ...style,
    }}>
      {children}
    </div>
  );
}
