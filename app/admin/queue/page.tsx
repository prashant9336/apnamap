"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface QueueShop {
  id:          string;
  name:        string;
  slug:        string;
  description: string | null;
  phone:       string | null;
  whatsapp:    string | null;
  address:     string | null;
  created_at:  string;
  view_count:  number;
  category:    { name: string; icon: string } | null;
  subcategory: { name: string; icon: string } | null;
  locality:    { name: string } | null;
  offers:      { id: string; is_active: boolean; ends_at: string | null }[];
  vendor: {
    id:     string;
    mobile: string | null;
    owner:  { name: string | null; phone: string | null } | null;
  } | null;
}

const CARD   = { background: "rgba(255,255,255,0.034)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18 } as const;
const ACCENT = "#FF5E1A";

function daysAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d === 0) return "today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
}

export default function ApproveQueuePage() {
  const [shops,   setShops]   = useState<QueueShop[]>([]);
  const [cursor,  setCursor]  = useState(0);
  const [loading, setLoading] = useState(true);
  const [token,   setToken]   = useState("");
  const [acting,  setActing]  = useState<"approve" | "reject" | null>(null);
  const [rejectOpen,  setRejectOpen]  = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [fade,    setFade]    = useState<"in" | "out-left" | "out-right">("in");
  const reasonRef = useRef<HTMLInputElement>(null);

  /* ── Load pending shops ───────────────────────────────────────────────── */
  useEffect(() => {
    createClient().auth.getSession().then(async ({ data: { session } }) => {
      const tok = session?.access_token ?? "";
      setToken(tok);
      try {
        const res = await fetch("/api/admin/shops?status=pending", {
          headers: tok ? { Authorization: `Bearer ${tok}` } : {},
        });
        const d = await res.json();
        setShops(d.shops ?? []);
      } catch { /* empty */ }
      setLoading(false);
    });
  }, []);

  const current   = shops[cursor];
  const total     = shops.length;
  const remaining = total - cursor;
  const progress  = total > 0 ? (cursor / total) * 100 : 0;

  /* ── Animation helper ────────────────────────────────────────────────── */
  const animateOut = useCallback(async (dir: "left" | "right") => {
    setFade(dir === "left" ? "out-left" : "out-right");
    await new Promise<void>(r => setTimeout(r, 240));
    setFade("in");
  }, []);

  /* ── Actions ─────────────────────────────────────────────────────────── */
  const doApprove = useCallback(async () => {
    if (!current || acting) return;
    setActing("approve");
    await fetch("/api/admin/shops", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ shop_id: current.id, action: "approve" }),
    });
    await animateOut("left");
    setActing(null);
    setCursor(c => c + 1);
  }, [current, acting, token, animateOut]);

  const doReject = useCallback(async () => {
    if (!current || acting) return;
    setActing("reject");
    setRejectOpen(false);
    await fetch("/api/admin/shops", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ shop_id: current.id, action: "reject", reason: rejectReason.trim() || undefined }),
    });
    await animateOut("right");
    setActing(null);
    setRejectReason("");
    setCursor(c => c + 1);
  }, [current, acting, token, rejectReason, animateOut]);

  const doSkip = useCallback(async () => {
    if (!current || acting) return;
    await animateOut("left");
    setCursor(c => c + 1);
  }, [current, acting, animateOut]);

  const doPrev = useCallback(async () => {
    if (cursor === 0 || acting) return;
    await animateOut("right");
    setCursor(c => c - 1);
  }, [cursor, acting, animateOut]);

  /* ── Keyboard shortcuts ───────────────────────────────────────────────── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") {
        if (e.key === "Escape") { setRejectOpen(false); (e.target as HTMLElement).blur(); }
        if (e.key === "Enter" && rejectOpen) doReject();
        return;
      }
      if (e.key === "a" || e.key === "A")              doApprove();
      if (e.key === "r" || e.key === "R")              { setRejectOpen(true); setTimeout(() => reasonRef.current?.focus(), 80); }
      if (e.key === "ArrowRight" || e.key === " ")     { e.preventDefault(); doSkip(); }
      if (e.key === "ArrowLeft")                       doPrev();
      if (e.key === "Escape")                          setRejectOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doApprove, doReject, doSkip, doPrev, rejectOpen]);

  /* ── Card animation styles ────────────────────────────────────────────── */
  const cardAnim: React.CSSProperties = {
    transition: "transform 0.24s cubic-bezier(0.4,0,0.2,1), opacity 0.24s ease",
    transform:  fade === "out-left"  ? "translateX(-48px) scale(0.97)"
              : fade === "out-right" ? "translateX(48px) scale(0.97)"
              : "translateX(0) scale(1)",
    opacity:    fade === "in" ? 1 : 0,
  };

  /* ── Loading ──────────────────────────────────────────────────────────── */
  if (loading) return (
    <div style={{ minHeight: "100dvh", background: "#05070C", display: "flex", flexDirection: "column" }}>
      <Header remaining={0} />
      <div style={{ flex: 1, padding: "24px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 90, borderRadius: 16 }} />)}
      </div>
    </div>
  );

  /* ── Done ─────────────────────────────────────────────────────────────── */
  if (!current || cursor >= total) return (
    <div style={{ minHeight: "100dvh", background: "#05070C", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
      <div style={{ fontSize: 52 }}>✅</div>
      <p className="font-syne" style={{ fontSize: 22, fontWeight: 900, color: "#F2F5FF", textAlign: "center" }}>
        Queue cleared!
      </p>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.40)", textAlign: "center" }}>
        {total > 0 ? `Reviewed ${total} shop${total > 1 ? "s" : ""}` : "No pending shops right now."}
      </p>
      <Link href="/admin/shops" style={{ marginTop: 8, padding: "12px 28px", borderRadius: 14, background: ACCENT, color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>
        View all shops
      </Link>
    </div>
  );

  const activeOffers = current.offers?.filter(o => o.is_active && (!o.ends_at || new Date(o.ends_at) > new Date())) ?? [];

  return (
    <div style={{ minHeight: "100dvh", background: "#05070C", display: "flex", flexDirection: "column" }}>

      {/* ── Header ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(5,7,12,0.97)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "12px 16px 10px", paddingTop: "calc(12px + env(safe-area-inset-top,0px))" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <Link href="/admin/dashboard" style={{ fontSize: 20, color: "var(--t2)", textDecoration: "none" }}>←</Link>
          <span className="font-syne" style={{ fontWeight: 900, fontSize: 15, flex: 1, color: "#F2F5FF" }}>
            Approval Queue
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.40)" }}>
            {remaining} left
          </span>
        </div>
        {/* Progress bar */}
        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: ACCENT, borderRadius: 2, transition: "width 0.4s ease" }} />
        </div>
        {/* Keyboard hints */}
        <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
          {[["A", "Approve", "#1FBB5A"], ["R", "Reject", "#f87171"], ["→", "Skip", "rgba(255,255,255,0.30)"], ["←", "Back", "rgba(255,255,255,0.30)"]].map(([k, l, c]) => (
            <span key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
              <kbd style={{ padding: "2px 6px", borderRadius: 5, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: c as string, fontWeight: 700, fontSize: 10 }}>{k}</kbd>
              {l}
            </span>
          ))}
        </div>
      </div>

      {/* ── Shop card ── */}
      <div style={{ flex: 1, padding: "16px 16px 120px", overflow: "hidden" }}>
        <div key={current.id} style={{ ...CARD, padding: 18, ...cardAnim }}>

          {/* Category + name */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 36, flexShrink: 0 }}>{current.subcategory?.icon ?? current.category?.icon ?? "🏪"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="font-syne" style={{ fontSize: 18, fontWeight: 900, color: "#F2F5FF", lineHeight: 1.2, marginBottom: 4 }}>
                {current.name}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {current.category && (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.50)", background: "rgba(255,255,255,0.06)", padding: "3px 8px", borderRadius: 20 }}>
                    {current.category.name}
                  </span>
                )}
                {current.locality && (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.50)", background: "rgba(255,255,255,0.06)", padding: "3px 8px", borderRadius: 20 }}>
                    📍 {current.locality.name}
                  </span>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", marginBottom: 2 }}>{daysAgo(current.created_at)}</p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.30)" }}>#{cursor + 1} / {total}</p>
            </div>
          </div>

          {/* Owner */}
          {current.vendor && (
            <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 4 }}>Owner</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
                {current.vendor.owner?.name ?? "—"}
                {(current.vendor.owner?.phone ?? current.vendor.mobile) && (
                  <span style={{ color: "rgba(255,255,255,0.40)", marginLeft: 8 }}>
                    📞 {current.vendor.owner?.phone ?? current.vendor.mobile}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Description */}
          {current.description && (
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {current.description}
            </p>
          )}

          {/* Contact + address */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {current.phone && (
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.05)", padding: "5px 10px", borderRadius: 10 }}>
                📞 {current.phone}
              </span>
            )}
            {current.address && (
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.05)", padding: "5px 10px", borderRadius: 10, maxWidth: "100%" }}>
                📍 {current.address}
              </span>
            )}
          </div>

          {/* Completeness indicators */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {[
              { ok: !!current.description?.trim(), label: "Description" },
              { ok: !!(current.phone || current.whatsapp), label: "Contact" },
              { ok: !!current.locality, label: "Locality" },
              { ok: activeOffers.length > 0, label: `${activeOffers.length} offer${activeOffers.length !== 1 ? "s" : ""}` },
            ].map(({ ok, label }) => (
              <span key={label} style={{
                fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20,
                background: ok ? "rgba(31,187,90,0.10)"  : "rgba(239,68,68,0.08)",
                color:      ok ? "#1FBB5A"               : "#f87171",
                border:     ok ? "1px solid rgba(31,187,90,0.22)" : "1px solid rgba(239,68,68,0.18)",
              }}>
                {ok ? "✓" : "✕"} {label}
              </span>
            ))}
          </div>

          {/* View link */}
          <a href={`/shop/${current.slug}`} target="_blank" rel="noreferrer"
            style={{ display: "inline-block", fontSize: 11, color: "rgba(255,255,255,0.35)", textDecoration: "none", marginBottom: 2 }}>
            ↗ Preview live page
          </a>
        </div>
      </div>

      {/* ── Action bar (fixed bottom) ── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 16px", paddingBottom: "calc(12px + env(safe-area-inset-bottom,0px))", background: "rgba(5,7,12,0.97)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {!rejectOpen ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: 10 }}>
            <button onClick={doPrev} disabled={cursor === 0 || !!acting}
              style={{ padding: "12px", borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: cursor === 0 ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.60)", fontSize: 18, cursor: cursor === 0 ? "not-allowed" : "pointer" }}>
              ←
            </button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button onClick={() => { setRejectOpen(true); setTimeout(() => reasonRef.current?.focus(), 80); }}
                disabled={!!acting}
                style={{ padding: "12px", borderRadius: 14, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: acting === "reject" ? "rgba(248,113,113,0.5)" : "#f87171", fontWeight: 700, fontSize: 13, cursor: acting ? "not-allowed" : "pointer" }}>
                {acting === "reject" ? "…" : "✕ Reject"}
              </button>
              <button onClick={doApprove} disabled={!!acting}
                style={{ padding: "12px", borderRadius: 14, background: acting === "approve" ? "rgba(31,187,90,0.50)" : "#1FBB5A", color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: acting ? "not-allowed" : "pointer" }}>
                {acting === "approve" ? "…" : "✓ Approve"}
              </button>
            </div>
            <button onClick={doSkip} disabled={!!acting}
              style={{ padding: "12px", borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.60)", fontSize: 18, cursor: acting ? "not-allowed" : "pointer" }}>
              →
            </button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#f87171", marginBottom: 8 }}>Rejection reason (optional)</p>
            <input
              ref={reasonRef}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Incomplete info, outside service area…"
              style={{ width: "100%", padding: "11px 13px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(239,68,68,0.30)", color: "#F2F5FF", fontSize: 13, outline: "none", fontFamily: "'DM Sans',sans-serif", boxSizing: "border-box", marginBottom: 10 }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={() => { setRejectOpen(false); setRejectReason(""); }}
                style={{ padding: "12px", borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.55)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={doReject} disabled={!!acting}
                style={{ padding: "12px", borderRadius: 14, background: "rgba(239,68,68,0.80)", color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: acting ? "not-allowed" : "pointer" }}>
                {acting ? "Rejecting…" : "Confirm Reject"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Header({ remaining }: { remaining: number }) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(5,7,12,0.97)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "12px 16px 10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/admin/dashboard" style={{ fontSize: 20, color: "var(--t2)", textDecoration: "none" }}>←</Link>
        <span className="font-syne" style={{ fontWeight: 900, fontSize: 15, flex: 1, color: "#F2F5FF" }}>Approval Queue</span>
        {remaining > 0 && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.40)" }}>{remaining} left</span>}
      </div>
    </div>
  );
}
