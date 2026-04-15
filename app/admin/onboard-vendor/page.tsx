"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/* ── Types ─────────────────────────────────────────────────────── */
type Meta = { id: string; name: string; icon?: string };

type CredResult = {
  shop_name:     string;
  mobile:        string;
  temp_password: string;
  whatsapp_msg:  string;
};

/* ── Styles ─────────────────────────────────────────────────────── */
const S = {
  pg:    { minHeight: "100dvh", background: "#05070C" } as React.CSSProperties,
  hdr:   { position: "sticky" as const, top: 0, zIndex: 50, display: "flex", alignItems: "center", gap: 12, paddingTop: "calc(14px + env(safe-area-inset-top, 0px))", paddingBottom: "14px", paddingLeft: "16px", paddingRight: "16px", background: "rgba(5,7,12,0.97)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.07)" },
  sect:  { display: "flex", flexDirection: "column" as const, gap: 14, padding: "16px 16px 32px" },
  label: { display: "block" as const, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.40)", textTransform: "uppercase" as const, letterSpacing: "0.8px", marginBottom: 7 } as React.CSSProperties,
  input: { width: "100%", padding: "13px 14px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#F2F5FF", fontSize: 15, outline: "none", fontFamily: "'DM Sans',sans-serif", boxSizing: "border-box" as const } as React.CSSProperties,
  chip:  (a: boolean): React.CSSProperties => ({ padding: "7px 13px", borderRadius: 100, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", flexShrink: 0, background: a ? "#FF5E1A" : "rgba(255,255,255,0.06)", color: a ? "#fff" : "rgba(255,255,255,0.45)", outline: a ? "none" : "1px solid rgba(255,255,255,0.09)" }),
  card:  { padding: "14px", borderRadius: 14, background: "rgba(255,255,255,0.034)", border: "1px solid rgba(255,255,255,0.07)" } as React.CSSProperties,
  err:   { padding: "10px 13px", borderRadius: 10, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)", color: "#F87171", fontSize: 12 } as React.CSSProperties,
  btn:   (disabled: boolean): React.CSSProperties => ({ width: "100%", padding: "14px", borderRadius: 13, background: disabled ? "rgba(255,94,26,0.40)" : "#FF5E1A", color: "#fff", border: "none", cursor: disabled ? "not-allowed" : "pointer", fontSize: 15, fontWeight: 800, fontFamily: "'DM Sans',sans-serif", boxShadow: disabled ? "none" : "0 0 24px rgba(255,94,26,0.30)" }),
};

const DEAL_TYPES = [
  { v: "percent", label: "% Off" },
  { v: "flat",    label: "₹ Flat" },
  { v: "bogo",    label: "Buy 1 Get 1" },
  { v: "free",    label: "Free Item" },
  { v: "other",   label: "Other" },
];

const EXPIRY_OPTIONS = [
  { v: 4,   label: "4 hours" },
  { v: 12,  label: "12 hours" },
  { v: 24,  label: "1 day" },
  { v: 72,  label: "3 days" },
  { v: 168, label: "1 week" },
  { v: 720, label: "1 month" },
  { v: 0,   label: "No expiry" },
];

/* ── Credential card shown after success ─────────────────────────── */
function CredCard({ result, onNew }: { result: CredResult; onNew: () => void }) {
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  function copy() {
    navigator.clipboard.writeText(result.whatsapp_msg).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  function openWhatsApp() {
    const digits = result.mobile.replace(/\D/g, "").replace(/^91/, "");
    const url = `https://wa.me/91${digits}?text=${encodeURIComponent(result.whatsapp_msg)}`;
    window.open(url, "_blank");
  }

  return (
    <div style={S.sect}>
      {/* Success banner */}
      <div style={{ borderRadius: 16, background: "rgba(31,187,90,0.10)", border: "1px solid rgba(31,187,90,0.28)", padding: "18px" }}>
        <div style={{ fontSize: 36, textAlign: "center", marginBottom: 10 }}>✅</div>
        <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 900, color: "#F2F5FF", textAlign: "center", marginBottom: 4 }}>
          {result.shop_name} is live!
        </p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", textAlign: "center" }}>
          Account created · Shop approved · First offer posted
        </p>
      </div>

      {/* Credentials */}
      <div style={S.card}>
        <p style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.35)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 12 }}>Login Credentials</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>Mobile</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#F2F5FF", fontFamily: "monospace" }}>{result.mobile}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>Temp Password</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: "#FF5E1A", fontFamily: "monospace", letterSpacing: "0.5px" }}>{result.temp_password}</span>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 8 }}>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.30)" }}>Vendor will be asked to change this password on first login.</p>
          </div>
        </div>
      </div>

      {/* WhatsApp message preview */}
      <div style={S.card}>
        <p style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.35)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 10 }}>WhatsApp Message</p>
        <textarea
          ref={textRef}
          readOnly
          value={result.whatsapp_msg}
          rows={9}
          style={{ ...S.input, resize: "none", fontSize: 12, lineHeight: 1.6, color: "rgba(255,255,255,0.60)", marginBottom: 10 }}
        />
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={copy}
            style={{ flex: 1, padding: "11px", borderRadius: 11, background: copied ? "rgba(31,187,90,0.15)" : "rgba(255,255,255,0.07)", border: `1px solid ${copied ? "rgba(31,187,90,0.35)" : "rgba(255,255,255,0.10)"}`, color: copied ? "#1FBB5A" : "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
          >
            {copied ? "✓ Copied!" : "📋 Copy"}
          </button>
          <button
            onClick={openWhatsApp}
            style={{ flex: 2, padding: "11px", borderRadius: 11, background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.30)", color: "#25D366", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
          >
            💬 Open WhatsApp
          </button>
        </div>
      </div>

      <button onClick={onNew} style={S.btn(false)}>
        + Onboard Another Vendor
      </button>

      <Link href="/admin/vendor-requests" style={{ display: "block", textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.40)", textDecoration: "none", marginTop: -6 }}>
        ← Back to Vendor Requests
      </Link>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────── */
export default function AdminOnboardVendor() {
  const router   = useRouter();
  const supabase = createClient();

  const [ready,       setReady]       = useState(false);
  const [localities,  setLocalities]  = useState<Meta[]>([]);
  const [categories,  setCategories]  = useState<Meta[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [result,      setResult]      = useState<CredResult | null>(null);
  const [catSearch,   setCatSearch]   = useState("");

  const [form, setForm] = useState({
    mobile:         "",
    shop_name:      "",
    category_id:    "",
    locality_id:    "",
    description:    "",
    offer_title:    "",
    deal_type:      "percent",
    discount_value: "",
    expiry_hours:   24,
  });

  const up = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  // ── Auth check + load meta ─────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth/login?redirect=/admin/onboard-vendor"); return; }
      const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if ((p?.role ?? user.user_metadata?.role) !== "admin") { router.replace("/"); return; }

      const [locRes, catRes] = await Promise.all([
        fetch("/api/localities"),
        fetch("/api/categories"),
      ]);
      const locJson = await locRes.json();
      const catJson = await catRes.json();
      setLocalities(locJson.localities ?? locJson ?? []);
      setCategories(catJson.categories ?? []);
      setReady(true);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const digits = form.mobile.replace(/\D/g, "");
    if (digits.length !== 10)       { setError("Enter a valid 10-digit mobile number"); return; }
    if (!form.shop_name.trim())      { setError("Shop name is required"); return; }
    if (!form.category_id)           { setError("Select a category"); return; }
    if (!form.locality_id)           { setError("Select a locality"); return; }
    if (!form.offer_title.trim())    { setError("Offer title is required"); return; }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";

      const res = await fetch("/api/admin/onboard-vendor", {
        method:  "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          mobile:      digits,
          shop_name:   form.shop_name.trim(),
          category_id: form.category_id,
          locality_id: form.locality_id,
          description: form.description.trim() || undefined,
          offer: {
            title:          form.offer_title.trim(),
            deal_type:      form.deal_type,
            discount_value: form.discount_value ? parseFloat(form.discount_value) : undefined,
            expiry_hours:   form.expiry_hours,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }

      setResult({
        shop_name:     form.shop_name.trim(),
        mobile:        `+91 ${digits}`,
        temp_password: data.temp_password,
        whatsapp_msg:  data.whatsapp_msg,
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({ mobile: "", shop_name: "", category_id: "", locality_id: "", description: "", offer_title: "", deal_type: "percent", discount_value: "", expiry_hours: 24 });
    setResult(null);
    setError("");
  }

  // ── Loading skeleton ───────────────────────────────────────────
  if (!ready) {
    return (
      <div style={{ ...S.pg, padding: 16 }}>
        <div style={{ height: 54, borderRadius: 14, background: "rgba(255,255,255,0.05)", marginBottom: 16 }} />
        {[1,2,3,4].map(i => <div key={i} style={{ height: 70, borderRadius: 14, background: "rgba(255,255,255,0.05)", marginBottom: 12 }} />)}
      </div>
    );
  }

  return (
    <div style={S.pg}>
      {/* Header */}
      <div style={S.hdr}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#FF5E1A,#E8A800)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
          ⚡
        </div>
        <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 900, color: "#F2F5FF", flex: 1, letterSpacing: "-0.4px" }}>
          Onboard Vendor
        </span>
        <Link href="/admin" style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", textDecoration: "none" }}>
          ← Admin
        </Link>
      </div>

      {/* Credential card (post-submit) */}
      {result && <CredCard result={result} onNew={resetForm} />}

      {/* Form */}
      {!result && (
        <form onSubmit={handleSubmit} style={S.sect}>

          {/* Section: Vendor Details */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.30)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 12 }}>
              Vendor Details
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Mobile */}
              <div>
                <label style={S.label}>Mobile Number *</label>
                <div style={{ display: "flex", gap: 9 }}>
                  <div style={{ padding: "13px 11px", borderRadius: 12, flexShrink: 0, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", fontSize: 14, fontWeight: 700, color: "#F2F5FF", display: "flex", alignItems: "center", gap: 4 }}>
                    🇮🇳 <span style={{ color: "rgba(255,255,255,0.55)" }}>+91</span>
                  </div>
                  <input
                    type="tel" inputMode="numeric"
                    value={form.mobile}
                    onChange={e => up("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit number"
                    style={{ ...S.input, flex: 1 }}
                    required
                  />
                </div>
              </div>

              {/* Shop name */}
              <div>
                <label style={S.label}>Shop / Business Name *</label>
                <input
                  type="text"
                  value={form.shop_name}
                  onChange={e => up("shop_name", e.target.value)}
                  placeholder="e.g. Gupta Sweet House"
                  style={S.input}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label style={S.label}>Description (optional)</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => up("description", e.target.value)}
                  placeholder="Short description of the shop"
                  style={{ ...S.input, resize: "none" }}
                />
              </div>
            </div>
          </div>

          {/* Section: Category */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.30)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 10 }}>
              Category *
            </p>
            {/* Search filter — shows all categories, no arbitrary slice */}
            <input
              type="text"
              value={catSearch}
              onChange={e => setCatSearch(e.target.value)}
              placeholder="Search category…"
              style={{ ...S.input, marginBottom: 10, fontSize: 13, padding: "10px 13px" }}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, maxHeight: 220, overflowY: "auto" }}>
              {categories
                .filter(c => !catSearch || c.name.toLowerCase().includes(catSearch.toLowerCase()))
                .map(c => (
                  <button key={c.id} type="button"
                    onClick={() => { up("category_id", form.category_id === c.id ? "" : c.id); setCatSearch(""); }}
                    style={S.chip(form.category_id === c.id)}>
                    {(c as any).icon} {c.name}
                  </button>
                ))}
            </div>
          </div>

          {/* Section: Locality */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.30)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 10 }}>
              Locality *
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {localities.map(l => (
                <button key={l.id} type="button" onClick={() => up("locality_id", form.locality_id === l.id ? "" : l.id)} style={S.chip(form.locality_id === l.id)}>
                  {l.name}
                </button>
              ))}
            </div>
          </div>

          {/* Section: First Offer */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.30)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 12 }}>
              First Offer *
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Offer title */}
              <div>
                <label style={S.label}>Offer Title *</label>
                <input
                  type="text"
                  value={form.offer_title}
                  onChange={e => up("offer_title", e.target.value)}
                  placeholder="e.g. Flat 20% OFF on all sweets"
                  style={S.input}
                  required
                />
              </div>

              {/* Deal type */}
              <div>
                <label style={S.label}>Deal Type</label>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {DEAL_TYPES.map(d => (
                    <button key={d.v} type="button" onClick={() => up("deal_type", d.v)} style={S.chip(form.deal_type === d.v)}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discount value (for percent / flat) */}
              {(form.deal_type === "percent" || form.deal_type === "flat") && (
                <div>
                  <label style={S.label}>{form.deal_type === "percent" ? "Discount %" : "Amount Off (₹)"}</label>
                  <input
                    type="number"
                    value={form.discount_value}
                    onChange={e => up("discount_value", e.target.value)}
                    placeholder={form.deal_type === "percent" ? "e.g. 20" : "e.g. 100"}
                    style={{ ...S.input, fontSize: 20, fontWeight: 800, textAlign: "center" }}
                  />
                </div>
              )}

              {/* Expiry */}
              <div>
                <label style={S.label}>Offer Valid For</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {EXPIRY_OPTIONS.map(o => (
                    <button key={o.v} type="button" onClick={() => up("expiry_hours", o.v)} style={S.chip(form.expiry_hours === o.v)}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {error && <div style={S.err}>{error}</div>}

          <button type="submit" disabled={loading} style={S.btn(loading)}>
            {loading ? "Creating Account…" : "⚡ Create Vendor Account →"}
          </button>

          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center", marginTop: -6 }}>
            Account is pre-approved. Vendor gets a temporary password + can log in immediately.
          </p>
        </form>
      )}
    </div>
  );
}
