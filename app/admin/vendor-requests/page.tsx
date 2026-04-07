"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type VendorRequest = {
  id:           string;
  mobile:       string;
  shop_name:    string;
  request_type: "new_shop" | "claim_existing";
  status:       "pending" | "approved" | "rejected" | "activated";
  note:         string | null;
  created_at:   string;
  reviewed_at:  string | null;
  review_note:  string | null;
  locality:     { name: string } | null;
  category:     { name: string; icon: string } | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: "⏳ Pending",   color: "#E8A800", bg: "rgba(232,168,0,0.10)",    border: "rgba(232,168,0,0.30)" },
  approved:  { label: "✅ Approved",  color: "#1FBB5A", bg: "rgba(31,187,90,0.10)",    border: "rgba(31,187,90,0.30)" },
  rejected:  { label: "✕ Rejected",  color: "#F87171", bg: "rgba(239,68,68,0.10)",     border: "rgba(239,68,68,0.28)" },
  activated: { label: "🚀 Active",    color: "#3B82F6", bg: "rgba(59,130,246,0.10)",   border: "rgba(59,130,246,0.28)" },
};

export default function AdminVendorRequests() {
  const router   = useRouter();
  const supabase = createClient();

  const [requests,  setRequests]  = useState<VendorRequest[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState<"all" | "pending" | "approved" | "rejected" | "activated">("pending");
  const [acting,    setActing]    = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<{ id: string; action: "approve" | "reject" } | null>(null);
  const [noteText,  setNoteText]  = useState("");

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth/login?redirect=/admin/vendor-requests"); return; }
      const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      const role = p?.role || user.user_metadata?.role || "customer";
      if (role !== "admin") { router.replace("/"); return; }
      await load();
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("vendor_requests")
      .select(`
        id, mobile, shop_name, request_type, status, note, created_at, reviewed_at, review_note,
        locality:localities(name),
        category:categories(name, icon)
      `)
      .order("created_at", { ascending: false });

    if (!error) setRequests((data ?? []) as unknown as VendorRequest[]);
    setLoading(false);
  }

  async function approve(id: string, note: string) {
    setActing(id);
    await supabase.from("vendor_requests").update({
      status:      "approved",
      reviewed_at: new Date().toISOString(),
      review_note: note || null,
    }).eq("id", id);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "approved", review_note: note || null } : r));
    setActing(null);
    setNoteModal(null);
    setNoteText("");
  }

  async function reject(id: string, note: string) {
    setActing(id);
    await supabase.from("vendor_requests").update({
      status:      "rejected",
      reviewed_at: new Date().toISOString(),
      review_note: note || null,
    }).eq("id", id);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "rejected", review_note: note || null } : r));
    setActing(null);
    setNoteModal(null);
    setNoteText("");
  }

  const filtered = filter === "all" ? requests : requests.filter(r => r.status === filter);

  const counts = {
    all:       requests.length,
    pending:   requests.filter(r => r.status === "pending").length,
    approved:  requests.filter(r => r.status === "approved").length,
    rejected:  requests.filter(r => r.status === "rejected").length,
    activated: requests.filter(r => r.status === "activated").length,
  };

  const S = {
    pg:    { minHeight: "100vh", background: "#05070C" },
    hdr:   { position: "sticky" as const, top: 0, zIndex: 50, display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "rgba(5,7,12,0.97)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.07)" },
    card:  { padding: "14px", borderRadius: 14, background: "rgba(255,255,255,0.034)", border: "1px solid rgba(255,255,255,0.07)" },
    tab:   (a: boolean): React.CSSProperties => ({ padding: "7px 13px", borderRadius: 100, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none", fontFamily: "'DM Sans',sans-serif", flexShrink: 0, background: a ? "#FF5E1A" : "rgba(255,255,255,0.06)", color: a ? "#fff" : "rgba(255,255,255,0.40)" }),
    app:   { flex: 1, padding: "10px", borderRadius: 10, background: "#1FBB5A", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" } as React.CSSProperties,
    rej:   { flex: 1, padding: "10px", borderRadius: 10, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)", color: "#F87171", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" } as React.CSSProperties,
  };

  if (loading) {
    return (
      <div style={{ ...S.pg, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ height: 54, borderRadius: 14, background: "rgba(255,255,255,0.05)" }} />
        {[1,2,3].map(i => <div key={i} style={{ height: 130, borderRadius: 14, background: "rgba(255,255,255,0.05)" }} />)}
      </div>
    );
  }

  return (
    <div style={S.pg}>
      {/* Header */}
      <div style={S.hdr}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#FF5E1A,#E8A800)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
          🏪
        </div>
        <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 900, color: "#F2F5FF", flex: 1, letterSpacing: "-0.4px" }}>
          Vendor Requests
        </span>
        <Link href="/admin" style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", textDecoration: "none" }}>
          ← Admin
        </Link>
      </div>

      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 2 }}>
          {(["pending","approved","activated","rejected","all"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={S.tab(filter === f)}>
              {f === "all" ? `All (${counts.all})` : `${STATUS_CONFIG[f].label} (${counts[f]})`}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div style={{ ...S.card, textAlign: "center", padding: "32px" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: "#F2F5FF" }}>
              No {filter === "all" ? "" : filter} requests
            </p>
          </div>
        )}

        {/* Request cards */}
        {filtered.map(req => {
          const st = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending;
          return (
            <div key={req.id} style={S.card}>
              {/* Top row */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 800, color: "#F2F5FF", marginBottom: 3 }}>
                    {req.shop_name}
                  </p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)" }}>
                    📱 +91 {req.mobile}
                  </p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 100, background: st.bg, color: st.color, border: `1px solid ${st.border}`, flexShrink: 0 }}>
                  {st.label}
                </span>
              </div>

              {/* Details */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {req.category && (
                  <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 100, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.09)" }}>
                    {req.category.icon} {req.category.name}
                  </span>
                )}
                {req.locality && (
                  <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 100, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.09)" }}>
                    📍 {req.locality.name}
                  </span>
                )}
                <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 100, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.09)" }}>
                  {req.request_type === "claim_existing" ? "🔗 Claim" : "➕ New Shop"}
                </span>
              </div>

              {req.note && (
                <div style={{ padding: "8px 10px", borderRadius: 9, background: "rgba(255,255,255,0.03)", marginBottom: 10 }}>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.50)", lineHeight: 1.5 }}>{req.note}</p>
                </div>
              )}

              {req.review_note && (
                <div style={{ padding: "7px 10px", borderRadius: 9, background: "rgba(255,255,255,0.03)", marginBottom: 10 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.30)", marginBottom: 3 }}>REVIEW NOTE</p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{req.review_note}</p>
                </div>
              )}

              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginBottom: req.status === "pending" ? 10 : 0 }}>
                Submitted {new Date(req.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                {req.reviewed_at ? ` · Reviewed ${new Date(req.reviewed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
              </p>

              {/* Actions — only for pending */}
              {req.status === "pending" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { setNoteModal({ id: req.id, action: "reject" }); setNoteText(""); }}
                    disabled={acting === req.id}
                    style={S.rej}
                  >
                    ✕ Reject
                  </button>
                  <button
                    onClick={() => { setNoteModal({ id: req.id, action: "approve" }); setNoteText(""); }}
                    disabled={acting === req.id}
                    style={S.app}
                  >
                    {acting === req.id ? "…" : "✓ Approve"}
                  </button>
                </div>
              )}

              {/* Re-approve rejected */}
              {req.status === "rejected" && (
                <button
                  onClick={() => approve(req.id, "")}
                  disabled={acting === req.id}
                  style={{ ...S.app, width: "100%" }}
                >
                  ↩ Re-approve
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Note modal (approve / reject) */}
      {noteModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.80)", zIndex: 100, display: "flex", alignItems: "flex-end" }}
          onClick={() => setNoteModal(null)}
        >
          <div
            style={{ background: "#0C0F18", borderRadius: "20px 20px 0 0", padding: "20px 18px", width: "100%", boxSizing: "border-box" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 18px" }} />
            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: "#F2F5FF", marginBottom: 14 }}>
              {noteModal.action === "approve" ? "✓ Approve Request" : "✕ Reject Request"}
            </p>
            <textarea
              rows={3}
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Optional note for vendor (e.g. reason for rejection, next steps…)"
              style={{ width: "100%", padding: "12px", borderRadius: 11, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "#F2F5FF", fontSize: 13, outline: "none", fontFamily: "'DM Sans',sans-serif", resize: "none", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button
                onClick={() => setNoteModal(null)}
                style={{ flex: 1, padding: "12px", borderRadius: 11, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}
              >
                Cancel
              </button>
              <button
                onClick={() => noteModal.action === "approve" ? approve(noteModal.id, noteText) : reject(noteModal.id, noteText)}
                style={{
                  flex: 2, padding: "12px", borderRadius: 11, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", color: "#fff",
                  background: noteModal.action === "approve" ? "#1FBB5A" : "rgba(239,68,68,0.80)",
                }}
              >
                {noteModal.action === "approve" ? "Confirm Approve" : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
