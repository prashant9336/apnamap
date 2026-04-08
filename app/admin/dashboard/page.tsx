"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/* ═══════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════ */
type Tab = "onboard" | "requests" | "pending" | "claims" | "shops" | "vendors";

type Meta = { id: string; name: string; icon?: string };

type VendorRequest = {
  id: string; mobile: string; shop_name: string;
  request_type: "new_shop" | "claim_existing";
  status: "pending" | "approved" | "rejected" | "activated";
  note: string | null; created_at: string;
  reviewed_at: string | null; review_note: string | null;
  locality: { name: string } | null;
  category: { name: string; icon: string } | null;
};

type CredResult = {
  shop_name: string; mobile: string;
  temp_password: string; whatsapp_msg: string;
};

/* ═══════════════════════════════════════════════════════════
   SHARED STYLES
═══════════════════════════════════════════════════════════ */
const PG:  React.CSSProperties = { minHeight: "100vh", background: "#05070C" };
const HDR: React.CSSProperties = { position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "rgba(5,7,12,0.97)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.07)" };
const CARD: React.CSSProperties = { padding: "14px", borderRadius: 14, background: "rgba(255,255,255,0.034)", border: "1px solid rgba(255,255,255,0.07)" };
const INP:  React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#F2F5FF", fontSize: 14, outline: "none", fontFamily: "'DM Sans',sans-serif", boxSizing: "border-box" };
const LBL:  React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 7 };
const ERR:  React.CSSProperties = { padding: "10px 13px", borderRadius: 10, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)", color: "#F87171", fontSize: 12 };

function sTab(a: boolean): React.CSSProperties {
  return { padding: "7px 14px", borderRadius: 100, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none", fontFamily: "'DM Sans',sans-serif", flexShrink: 0, background: a ? "#FF5E1A" : "rgba(255,255,255,0.06)", color: a ? "#fff" : "rgba(255,255,255,0.40)" };
}
function sChip(a: boolean): React.CSSProperties {
  return { padding: "7px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", flexShrink: 0, background: a ? "#FF5E1A" : "rgba(255,255,255,0.06)", color: a ? "#fff" : "rgba(255,255,255,0.45)", outline: a ? "none" : "1px solid rgba(255,255,255,0.09)" };
}
function sBtn(disabled: boolean): React.CSSProperties {
  return { width: "100%", padding: "14px", borderRadius: 13, background: disabled ? "rgba(255,94,26,0.40)" : "#FF5E1A", color: "#fff", border: "none", cursor: disabled ? "not-allowed" : "pointer", fontSize: 15, fontWeight: 800, fontFamily: "'DM Sans',sans-serif", boxShadow: disabled ? "none" : "0 0 24px rgba(255,94,26,0.30)" };
}

const DEAL_TYPES = [
  { v: "percent", label: "% Off" }, { v: "flat", label: "₹ Flat" },
  { v: "bogo", label: "Buy 1 Get 1" }, { v: "free", label: "Free Item" }, { v: "other", label: "Other" },
];
const EXPIRY_OPTS = [
  { v: 4, label: "4 hrs" }, { v: 12, label: "12 hrs" }, { v: 24, label: "1 day" },
  { v: 72, label: "3 days" }, { v: 168, label: "1 week" }, { v: 720, label: "1 month" }, { v: 0, label: "No expiry" },
];
const REQ_STATUS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: "⏳ Pending",  color: "#E8A800", bg: "rgba(232,168,0,0.10)",  border: "rgba(232,168,0,0.30)" },
  approved:  { label: "✅ Approved", color: "#1FBB5A", bg: "rgba(31,187,90,0.10)",  border: "rgba(31,187,90,0.30)" },
  rejected:  { label: "✕ Rejected", color: "#F87171", bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.28)" },
  activated: { label: "🚀 Active",   color: "#3B82F6", bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.28)" },
};

/* ═══════════════════════════════════════════════════════════
   CREDENTIAL CARD
═══════════════════════════════════════════════════════════ */
function CredCard({ result, onNew }: { result: CredResult; onNew: () => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(result.whatsapp_msg).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    });
  }
  function openWA() {
    const d = result.mobile.replace(/\D/g, "").replace(/^91/, "");
    window.open(`https://wa.me/91${d}?text=${encodeURIComponent(result.whatsapp_msg)}`, "_blank");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ borderRadius: 16, background: "rgba(31,187,90,0.10)", border: "1px solid rgba(31,187,90,0.28)", padding: "18px", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
        <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 900, color: "#F2F5FF", marginBottom: 4 }}>{result.shop_name} is live!</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>Account · Shop · Offer — all created</p>
      </div>

      <div style={CARD}>
        <p style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>Login Credentials</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>Mobile</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#F2F5FF", fontFamily: "monospace" }}>{result.mobile}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>Temp Password</span>
            <span style={{ fontSize: 17, fontWeight: 900, color: "#FF5E1A", fontFamily: "monospace" }}>{result.temp_password}</span>
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 8 }}>Vendor must change this on first login.</p>
        </div>
      </div>

      <div style={CARD}>
        <p style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>WhatsApp Message</p>
        <textarea readOnly value={result.whatsapp_msg} rows={9}
          style={{ ...INP, resize: "none", fontSize: 12, lineHeight: 1.6, color: "rgba(255,255,255,0.55)", marginBottom: 10 }} />
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={copy} style={{ flex: 1, padding: "11px", borderRadius: 11, background: copied ? "rgba(31,187,90,0.15)" : "rgba(255,255,255,0.07)", border: `1px solid ${copied ? "rgba(31,187,90,0.35)" : "rgba(255,255,255,0.10)"}`, color: copied ? "#1FBB5A" : "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
            {copied ? "✓ Copied!" : "📋 Copy"}
          </button>
          <button onClick={openWA} style={{ flex: 2, padding: "11px", borderRadius: 11, background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.30)", color: "#25D366", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
            💬 Send on WhatsApp
          </button>
        </div>
      </div>

      <button onClick={onNew} style={sBtn(false)}>+ Onboard Another Vendor</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ONBOARD TAB
═══════════════════════════════════════════════════════════ */
function OnboardTab({ localities, categories }: { localities: Meta[]; categories: Meta[] }) {
  const sb = createClient();

  const [form, setForm] = useState({
    mobile: "", shop_name: "", category_id: "", locality_id: "",
    description: "", offer_title: "", deal_type: "percent",
    discount_value: "", expiry_hours: 24,
  });
  const up = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const [lat,       setLat]       = useState<number | null>(null);
  const [lng,       setLng]       = useState<number | null>(null);
  const [gpsLabel,  setGpsLabel]  = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [result,  setResult]  = useState<CredResult | null>(null);

  async function captureGPS() {
    if (!navigator.geolocation) { setError("GPS not available on this device"); return; }
    setGpsLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude); setLng(longitude);
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`, { headers: { "User-Agent": "ApnaMap/1.0" } });
          const data = await res.json();
          setGpsLabel(data.address?.suburb || data.address?.neighbourhood || data.address?.road || data.address?.city || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } catch {
          setGpsLabel(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        }
        setGpsLoading(false);
      },
      () => { setError("Location access denied"); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const digits = form.mobile.replace(/\D/g, "");
    if (digits.length !== 10)     { setError("Enter a valid 10-digit mobile number"); return; }
    if (!form.shop_name.trim())   { setError("Shop name is required"); return; }
    if (!form.category_id)        { setError("Select a category"); return; }
    if (!form.locality_id)        { setError("Select a locality"); return; }
    if (!form.offer_title.trim()) { setError("Offer title is required"); return; }

    setLoading(true);
    try {
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch("/api/admin/onboard-vendor", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({
          mobile: digits, shop_name: form.shop_name.trim(),
          category_id: form.category_id, locality_id: form.locality_id,
          description: form.description.trim() || undefined,
          lat: lat ?? undefined, lng: lng ?? undefined,
          offer: {
            title: form.offer_title.trim(), deal_type: form.deal_type,
            discount_value: form.discount_value ? parseFloat(form.discount_value) : undefined,
            expiry_hours: form.expiry_hours,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      setResult({ shop_name: form.shop_name.trim(), mobile: `+91 ${digits}`, temp_password: data.temp_password, whatsapp_msg: data.whatsapp_msg });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setForm({ mobile: "", shop_name: "", category_id: "", locality_id: "", description: "", offer_title: "", deal_type: "percent", discount_value: "", expiry_hours: 24 });
    setLat(null); setLng(null); setGpsLabel(null);
    setResult(null); setError("");
  }

  if (result) return <CredCard result={result} onNew={reset} />;

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* ── Vendor Details ── */}
      <Section label="Vendor Details">
        <div>
          <label style={LBL}>Mobile Number *</label>
          <div style={{ display: "flex", gap: 9 }}>
            <div style={{ padding: "12px 11px", borderRadius: 12, flexShrink: 0, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", fontSize: 14, fontWeight: 700, color: "#F2F5FF", display: "flex", alignItems: "center", gap: 4 }}>
              🇮🇳 <span style={{ color: "rgba(255,255,255,0.55)" }}>+91</span>
            </div>
            <input type="tel" inputMode="numeric" value={form.mobile}
              onChange={e => up("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit number" style={{ ...INP, flex: 1 }} required />
          </div>
        </div>
        <div>
          <label style={LBL}>Shop / Business Name *</label>
          <input type="text" value={form.shop_name} onChange={e => up("shop_name", e.target.value)}
            placeholder="e.g. Gupta Sweet House" style={INP} required />
        </div>
        <div>
          <label style={LBL}>Description (optional)</label>
          <textarea rows={2} value={form.description} onChange={e => up("description", e.target.value)}
            placeholder="Short description" style={{ ...INP, resize: "none" }} />
        </div>
      </Section>

      {/* ── Category ── */}
      <Section label="Category *">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {categories.slice(0, 18).map(c => (
            <button key={c.id} type="button" onClick={() => up("category_id", form.category_id === c.id ? "" : c.id)} style={sChip(form.category_id === c.id)}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Locality ── */}
      <Section label="Locality *">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {localities.map(l => (
            <button key={l.id} type="button" onClick={() => up("locality_id", form.locality_id === l.id ? "" : l.id)} style={sChip(form.locality_id === l.id)}>
              {l.name}
            </button>
          ))}
          {localities.length === 0 && (
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>No localities found — add them in the Supabase localities table.</p>
          )}
        </div>
      </Section>

      {/* ── GPS ── */}
      <Section label="Shop Location">
        <button type="button" onClick={captureGPS} disabled={gpsLoading}
          style={{
            width: "100%", padding: "13px", borderRadius: 12, fontSize: 14, fontWeight: 700,
            cursor: gpsLoading ? "wait" : "pointer", fontFamily: "'DM Sans',sans-serif",
            ...(lat
              ? { background: "rgba(31,187,90,0.10)", border: "1px solid rgba(31,187,90,0.30)", color: "#1FBB5A" }
              : { background: "rgba(255,94,26,0.08)", border: "1px dashed rgba(255,94,26,0.40)", color: "#FF5E1A" }),
          }}>
          {gpsLoading ? "📡 Detecting location…" : lat ? `✓ Pinned: ${gpsLabel}` : "📍 Pin Shop Location (GPS)"}
        </button>
        {lat && (
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", marginTop: 4 }}>
            {lat.toFixed(6)}, {lng?.toFixed(6)} — shop will appear exactly here on the map
          </p>
        )}
        {!lat && (
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", marginTop: 4 }}>
            Stand at the shop entrance and tap. Uses your current GPS position.
          </p>
        )}
      </Section>

      {/* ── First Offer ── */}
      <Section label="First Offer *">
        <div>
          <label style={LBL}>Offer Title *</label>
          <input type="text" value={form.offer_title} onChange={e => up("offer_title", e.target.value)}
            placeholder="e.g. Flat 20% OFF on all items" style={INP} required />
        </div>
        <div>
          <label style={LBL}>Deal Type</label>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {DEAL_TYPES.map(d => (
              <button key={d.v} type="button" onClick={() => up("deal_type", d.v)} style={sChip(form.deal_type === d.v)}>{d.label}</button>
            ))}
          </div>
        </div>
        {(form.deal_type === "percent" || form.deal_type === "flat") && (
          <div>
            <label style={LBL}>{form.deal_type === "percent" ? "Discount %" : "Amount Off (₹)"}</label>
            <input type="number" value={form.discount_value} onChange={e => up("discount_value", e.target.value)}
              placeholder={form.deal_type === "percent" ? "e.g. 20" : "e.g. 100"}
              style={{ ...INP, fontSize: 20, fontWeight: 800, textAlign: "center" }} />
          </div>
        )}
        <div>
          <label style={LBL}>Offer Valid For</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {EXPIRY_OPTS.map(o => (
              <button key={o.v} type="button" onClick={() => up("expiry_hours", o.v)} style={sChip(form.expiry_hours === o.v)}>{o.label}</button>
            ))}
          </div>
        </div>
      </Section>

      {error && <div style={ERR}>{error}</div>}

      <button type="submit" disabled={loading} style={sBtn(loading)}>
        {loading ? "Creating Account…" : "⚡ Create Vendor Account →"}
      </button>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center", marginTop: -8 }}>
        Pre-approved · Vendor gets temp password · Must change on first login
      </p>
    </form>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.30)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 12 }}>{label}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   REQUESTS TAB
═══════════════════════════════════════════════════════════ */
function RequestsTab() {
  const sb = createClient();
  const [requests, setRequests] = useState<VendorRequest[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<"pending" | "approved" | "rejected" | "activated" | "all">("pending");
  const [acting,   setActing]   = useState<string | null>(null);
  const [modal,    setModal]    = useState<{ id: string; action: "approve" | "reject" } | null>(null);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    sb.from("vendor_requests")
      .select("id,mobile,shop_name,request_type,status,note,created_at,reviewed_at,review_note,locality:localities(name),category:categories(name,icon)")
      .order("created_at", { ascending: false })
      .then(({ data }) => { setRequests((data ?? []) as unknown as VendorRequest[]); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function approve(id: string, note: string) {
    setActing(id);
    await sb.from("vendor_requests").update({ status: "approved", reviewed_at: new Date().toISOString(), review_note: note || null }).eq("id", id);
    setRequests(r => r.map(x => x.id === id ? { ...x, status: "approved", review_note: note || null } : x));
    setActing(null); setModal(null); setNoteText("");
  }
  async function reject(id: string, note: string) {
    setActing(id);
    await sb.from("vendor_requests").update({ status: "rejected", reviewed_at: new Date().toISOString(), review_note: note || null }).eq("id", id);
    setRequests(r => r.map(x => x.id === id ? { ...x, status: "rejected", review_note: note || null } : x));
    setActing(null); setModal(null); setNoteText("");
  }

  const counts = { all: requests.length, pending: 0, approved: 0, rejected: 0, activated: 0 };
  requests.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
  const filtered = filter === "all" ? requests : requests.filter(r => r.status === filter);

  if (loading) return <Skel rows={4} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 2 }}>
        {(["pending","approved","activated","rejected","all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={sTab(filter === f)}>
            {f === "all" ? `All (${counts.all})` : `${REQ_STATUS[f].label} (${counts[f]})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ ...CARD, textAlign: "center", padding: "32px" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: "#F2F5FF" }}>No {filter} requests</p>
        </div>
      )}

      {filtered.map(req => {
        const st = REQ_STATUS[req.status] ?? REQ_STATUS.pending;
        return (
          <div key={req.id} style={CARD}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 800, color: "#F2F5FF", marginBottom: 3 }}>{req.shop_name}</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)" }}>📱 +91 {req.mobile}</p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 100, background: st.bg, color: st.color, border: `1px solid ${st.border}`, flexShrink: 0 }}>{st.label}</span>
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>
              {req.category && <Pill>{req.category.icon} {req.category.name}</Pill>}
              {req.locality && <Pill>📍 {req.locality.name}</Pill>}
              <Pill>{req.request_type === "claim_existing" ? "🔗 Claim" : "➕ New"}</Pill>
            </div>
            {req.note && <div style={{ padding: "8px 10px", borderRadius: 9, background: "rgba(255,255,255,0.03)", marginBottom: 10 }}><p style={{ fontSize: 12, color: "rgba(255,255,255,0.50)" }}>{req.note}</p></div>}
            {req.review_note && (
              <div style={{ padding: "7px 10px", borderRadius: 9, background: "rgba(255,255,255,0.03)", marginBottom: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.30)", marginBottom: 3 }}>REVIEW NOTE</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{req.review_note}</p>
              </div>
            )}
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginBottom: req.status === "pending" ? 10 : 0 }}>
              {new Date(req.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
            {req.status === "pending" && (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setModal({ id: req.id, action: "reject" }); setNoteText(""); }} disabled={acting === req.id}
                  style={{ flex: 1, padding: "10px", borderRadius: 10, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)", color: "#F87171", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>
                  ✕ Reject
                </button>
                <button onClick={() => { setModal({ id: req.id, action: "approve" }); setNoteText(""); }} disabled={acting === req.id}
                  style={{ flex: 1, padding: "10px", borderRadius: 10, background: "#1FBB5A", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>
                  {acting === req.id ? "…" : "✓ Approve"}
                </button>
              </div>
            )}
            {req.status === "rejected" && (
              <button onClick={() => approve(req.id, "")} disabled={acting === req.id}
                style={{ width: "100%", padding: "10px", borderRadius: 10, background: "rgba(31,187,90,0.10)", border: "1px solid rgba(31,187,90,0.30)", color: "#1FBB5A", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>
                ↩ Re-approve
              </button>
            )}
          </div>
        );
      })}

      {/* Note modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.80)", zIndex: 100, display: "flex", alignItems: "flex-end" }} onClick={() => setModal(null)}>
          <div style={{ background: "#0C0F18", borderRadius: "20px 20px 0 0", padding: "20px 18px", width: "100%", boxSizing: "border-box" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 18px" }} />
            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: "#F2F5FF", marginBottom: 14 }}>
              {modal.action === "approve" ? "✓ Approve" : "✕ Reject"} Request
            </p>
            <textarea rows={3} value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder="Optional note for vendor…"
              style={{ ...INP, resize: "none", marginBottom: 14 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: "12px", borderRadius: 11, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>Cancel</button>
              <button
                onClick={() => modal.action === "approve" ? approve(modal.id, noteText) : reject(modal.id, noteText)}
                style={{ flex: 2, padding: "12px", borderRadius: 11, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", color: "#fff", background: modal.action === "approve" ? "#1FBB5A" : "rgba(239,68,68,0.80)" }}>
                Confirm {modal.action === "approve" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SHOPS / PENDING / VENDORS TABS (from existing dashboard)
═══════════════════════════════════════════════════════════ */
function ShopsTab({ which }: { which: "pending" | "all" }) {
  const sb = createClient();
  const [shops,   setShops]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState<string | null>(null);
  const [search,  setSearch]  = useState("");
  const [preview, setPreview] = useState<any | null>(null);

  useEffect(() => {
    const q = sb.from("shops").select("*, category:categories(name,icon), locality:localities(name)").order("created_at", { ascending: false });
    (which === "pending" ? q.eq("is_approved", false) : q.eq("is_approved", true).limit(80))
      .then(({ data }) => { setShops(data ?? []); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [which]);

  async function approve(id: string) {
    setActing(id);
    await sb.from("shops").update({ is_approved: true, is_active: true }).eq("id", id);
    setShops(s => which === "pending" ? s.filter(x => x.id !== id) : s.map(x => x.id === id ? { ...x, is_approved: true } : x));
    setActing(null); setPreview(null);
  }
  async function reject(id: string) {
    setActing(id);
    await sb.from("shops").update({ is_approved: false, is_active: false }).eq("id", id);
    setShops(s => s.filter(x => x.id !== id));
    setActing(null); setPreview(null);
  }

  const filtered = shops.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.locality?.name?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <Skel rows={4} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or locality…"
        style={{ ...INP, padding: "10px 13px", fontSize: 13 }} />

      {filtered.length === 0 && (
        <div style={{ ...CARD, textAlign: "center", padding: "32px" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>{which === "pending" ? "✅" : "🏪"}</div>
          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: "#F2F5FF" }}>{which === "pending" ? "All caught up!" : "No shops yet"}</p>
        </div>
      )}

      {filtered.map(shop => (
        <div key={shop.id} style={CARD}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 22, flexShrink: 0 }}>{shop.category?.icon ?? "🏪"}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: "#F2F5FF", marginBottom: 2 }}>{shop.name}</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{shop.category?.name} · {shop.locality?.name}</p>
              {shop.address && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 3 }}>📍 {shop.address}</p>}
              {shop.phone   && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)" }}>📞 {shop.phone}</p>}
            </div>
          </div>
          {which === "pending" ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setPreview(shop)} style={{ padding: "9px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.50)", border: "none", cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>Preview</button>
              <button onClick={() => reject(shop.id)} disabled={acting === shop.id} style={{ flex: 1, padding: "9px", borderRadius: 10, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)", color: "#F87171", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>✕ Reject</button>
              <button onClick={() => approve(shop.id)} disabled={acting === shop.id} style={{ flex: 1, padding: "9px", borderRadius: 10, background: "#1FBB5A", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>{acting === shop.id ? "…" : "✓ Approve"}</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 100, background: shop.is_claimed ? "rgba(31,187,90,0.13)" : "rgba(255,255,255,0.05)", color: shop.is_claimed ? "#1FBB5A" : "rgba(255,255,255,0.30)", border: `1px solid ${shop.is_claimed ? "rgba(31,187,90,0.30)" : "rgba(255,255,255,0.10)"}` }}>
                {shop.is_claimed ? "✓ Claimed" : "Unclaimed"}
              </span>
              <button onClick={() => reject(shop.id)} disabled={acting === shop.id} style={{ marginLeft: "auto", padding: "4px 10px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "#F87171", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>Deactivate</button>
            </div>
          )}
        </div>
      ))}

      {preview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.80)", zIndex: 100, display: "flex", alignItems: "flex-end" }} onClick={() => setPreview(null)}>
          <div style={{ background: "#0C0F18", borderRadius: "20px 20px 0 0", padding: "20px 18px", width: "100%", maxHeight: "70vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 18px" }} />
            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 900, color: "#F2F5FF", marginBottom: 4 }}>{preview.name}</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", marginBottom: 14 }}>{preview.locality?.name} · {preview.category?.name}</p>
            {preview.description && <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginBottom: 14, lineHeight: 1.6 }}>{preview.description}</p>}
            {[{ label: "📍 Address", value: preview.address }, { label: "📞 Phone", value: preview.phone }, { label: "🕐 Hours", value: preview.open_time ? `${preview.open_time} – ${preview.close_time}` : null }]
              .filter(r => r.value).map(r => (
                <div key={r.label} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 12 }}>
                  <span style={{ color: "rgba(255,255,255,0.40)", flexShrink: 0 }}>{r.label}</span>
                  <span style={{ color: "#F2F5FF" }}>{r.value}</span>
                </div>
              ))}
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button onClick={() => { reject(preview.id); }} style={{ flex: 1, padding: "12px", borderRadius: 11, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)", color: "#F87171", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>✕ Reject</button>
              <button onClick={() => { approve(preview.id); }} style={{ flex: 2, padding: "12px", borderRadius: 11, background: "#1FBB5A", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>✓ Approve Shop</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VendorsTab() {
  const sb = createClient();
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    sb.from("vendors").select("id, mobile, is_approved, must_change_password, profiles(name, created_at)").limit(100)
      .then(({ data }) => { setVendors(data ?? []); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <Skel rows={5} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {vendors.length === 0 && <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", textAlign: "center", padding: "32px 0" }}>No vendors yet</p>}
      {vendors.map((v: any) => (
        <div key={v.id} style={{ ...CARD, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.28)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>👔</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#F2F5FF" }}>{(v.profiles as any)?.name ?? "Vendor"}</p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
              {v.mobile ?? "—"} · Joined {v.profiles?.created_at ? new Date(v.profiles.created_at).toLocaleDateString("en-IN") : "—"}
            </p>
          </div>
          {v.must_change_password && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 7px", borderRadius: 100, background: "rgba(232,168,0,0.13)", color: "#E8A800", border: "1px solid rgba(232,168,0,0.30)", flexShrink: 0 }}>temp pw</span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
function Pill({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 100, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.09)" }}>{children}</span>;
}
function Skel({ rows }: { rows: number }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{Array.from({ length: rows }, (_, i) => <div key={i} style={{ height: 90, borderRadius: 14, background: "rgba(255,255,255,0.05)" }} className="shimmer" />)}</div>;
}

/* ═══════════════════════════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const router = useRouter();
  const sb     = createClient();

  const [tab,        setTab]        = useState<Tab>("onboard");
  const [ready,      setReady]      = useState(false);
  const [localities, setLocalities] = useState<Meta[]>([]);
  const [categories, setCategories] = useState<Meta[]>([]);
  const [stats,      setStats]      = useState({ shops: 0, pending: 0, requests: 0, vendors: 0 });

  useEffect(() => {
    async function init() {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.replace("/auth/login?redirect=/admin/dashboard"); return; }
      const { data: p } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if ((p?.role ?? user.user_metadata?.role) !== "admin") { router.replace("/"); return; }

      // Fetch localities directly (no city filter — admin sees all)
      const [locRes, catRes, statsRes] = await Promise.all([
        sb.from("localities").select("id, name").order("priority"),
        fetch("/api/categories"),
        Promise.all([
          sb.from("shops").select("*", { count: "exact", head: true }),
          sb.from("shops").select("*", { count: "exact", head: true }).eq("is_approved", false),
          sb.from("vendor_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
          sb.from("vendors").select("*", { count: "exact", head: true }),
        ]),
      ]);

      setLocalities(locRes.data ?? []);
      const catJson = await catRes.json();
      setCategories(catJson.categories ?? []);
      const [s, p2, r, v] = statsRes;
      setStats({ shops: s.count ?? 0, pending: p2.count ?? 0, requests: r.count ?? 0, vendors: v.count ?? 0 });
      setReady(true);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const TABS: { id: Tab; label: string }[] = [
    { id: "onboard",  label: "⚡ Onboard" },
    { id: "requests", label: `📋 Requests${stats.requests > 0 ? ` (${stats.requests})` : ""}` },
    { id: "pending",  label: `⏳ Pending${stats.pending > 0 ? ` (${stats.pending})` : ""}` },
    { id: "shops",    label: "✅ Shops" },
    { id: "vendors",  label: `👔 Vendors${stats.vendors > 0 ? ` (${stats.vendors})` : ""}` },
  ];

  if (!ready) {
    return (
      <div style={{ ...PG, padding: 16 }}>
        <div style={{ height: 54, borderRadius: 14, background: "rgba(255,255,255,0.05)", marginBottom: 16 }} className="shimmer" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: 60, borderRadius: 12, background: "rgba(255,255,255,0.05)" }} className="shimmer" />)}
        </div>
        <Skel rows={4} />
      </div>
    );
  }

  return (
    <div style={PG}>
      {/* Header */}
      <div style={HDR}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#FF5E1A,#E8A800)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛡️</div>
        <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 900, color: "#F2F5FF", flex: 1, letterSpacing: "-0.4px" }}>Admin Dashboard</span>
      </div>

      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
          {[
            { label: "Shops",    value: stats.shops,    color: "#FF5E1A" },
            { label: "Pending",  value: stats.pending,  color: "#E8A800" },
            { label: "Requests", value: stats.requests, color: "#3B82F6" },
            { label: "Vendors",  value: stats.vendors,  color: "#1FBB5A" },
          ].map(s => (
            <div key={s.label} style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.034)", border: `1px solid ${s.color}22` }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.30)", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
          {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={sTab(tab === t.id)}>{t.label}</button>)}
        </div>

        {/* Tab content */}
        {tab === "onboard"  && <OnboardTab localities={localities} categories={categories} />}
        {tab === "requests" && <RequestsTab />}
        {tab === "pending"  && <ShopsTab which="pending" />}
        {tab === "shops"    && <ShopsTab which="all" />}
        {tab === "vendors"  && <VendorsTab />}
      </div>
    </div>
  );
}
