"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";

/* ── Styles ─────────────────────────────────────────────────────── */
const S = {
  page:  { minHeight: "100vh", background: "#05070C", padding: "24px 20px" },
  card:  { width: "100%", maxWidth: 400, margin: "0 auto" },
  label: {
    display: "block" as const, fontSize: 11, fontWeight: 700,
    color: "rgba(255,255,255,0.40)", textTransform: "uppercase" as const,
    letterSpacing: "0.8px", marginBottom: 7,
  },
  input: {
    width: "100%", padding: "13px 14px", borderRadius: 12,
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    color: "#F2F5FF", fontSize: 15, outline: "none",
    fontFamily: "'DM Sans',sans-serif", display: "block", boxSizing: "border-box" as const,
  },
  textarea: {
    width: "100%", padding: "13px 14px", borderRadius: 12,
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    color: "#F2F5FF", fontSize: 14, outline: "none",
    fontFamily: "'DM Sans',sans-serif", resize: "none" as const,
    boxSizing: "border-box" as const,
  },
  err: {
    padding: "10px 13px", borderRadius: 10,
    background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)",
    color: "#F87171", fontSize: 12, marginBottom: 14,
  },
  success: {
    padding: "18px", borderRadius: 16,
    background: "rgba(31,187,90,0.10)", border: "1px solid rgba(31,187,90,0.28)",
    textAlign: "center" as const,
  },
  btn: (disabled: boolean): React.CSSProperties => ({
    width: "100%", padding: "14px", borderRadius: 13,
    background: disabled ? "rgba(255,94,26,0.45)" : "#FF5E1A",
    color: "#fff", border: "none", cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 15, fontWeight: 800, fontFamily: "'DM Sans',sans-serif",
    boxShadow: disabled ? "none" : "0 0 24px rgba(255,94,26,0.35)",
  }),
  chip: (active: boolean): React.CSSProperties => ({
    padding: "7px 13px", borderRadius: 100, fontSize: 12, fontWeight: 600,
    border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
    background: active ? "#FF5E1A" : "rgba(255,255,255,0.06)",
    color: active ? "#fff" : "rgba(255,255,255,0.50)",
    outline: active ? "none" : "1px solid rgba(255,255,255,0.10)",
    flexShrink: 0,
  }),
};

function VendorJoinForm() {
  const [localities,  setLocalities]  = useState<{ id: string; name: string }[]>([]);
  const [categories,  setCategories]  = useState<{ id: string; name: string; icon: string }[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [submitted,   setSubmitted]   = useState(false);

  const [form, setForm] = useState({
    mobile:       "",
    shop_name:    "",
    locality_id:  "",
    category_id:  "",
    request_type: "new_shop" as "new_shop" | "claim_existing",
    note:         "",
  });

  const up = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    async function load() {
      const [locRes, catRes] = await Promise.all([
        fetch("/api/localities"),
        fetch("/api/categories"),
      ]);
      if (locRes.ok) {
        const j = await locRes.json();
        setLocalities(j.localities ?? j ?? []);
      }
      if (catRes.ok) {
        const j = await catRes.json();
        setCategories(j.categories ?? []);
      }
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const digits = form.mobile.replace(/\D/g, "");
    if (digits.length !== 10) { setError("Enter a valid 10-digit mobile number"); return; }
    if (!form.shop_name.trim()) { setError("Shop name is required"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/vendor/request", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, mobile: digits }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        // If already approved, guide to set-password
        if (data.status === "approved") {
          setError(data.error + " → Set your password below.");
        }
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={S.success}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>✅</div>
            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: "#F2F5FF", marginBottom: 8 }}>
              Request Submitted!
            </p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
              Your request has been submitted. We will verify and activate your vendor access within 24 hours.
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 14 }}>
              Once approved, visit{" "}
              <Link href="/vendor/set-password" style={{ color: "#FF5E1A", textDecoration: "none", fontWeight: 700 }}>
                Set Password
              </Link>{" "}
              to activate your account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: "#FF5E1A",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, margin: "0 auto 14px",
            boxShadow: "0 0 28px rgba(255,94,26,0.45)",
          }}>
            🏪
          </div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 900, color: "#F2F5FF", letterSpacing: "-0.4px", marginBottom: 6 }}>
            List Your Shop
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.40)" }}>
            Submit a request — we&apos;ll review and activate within 24 hours
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Mobile */}
          <div>
            <label style={S.label}>Mobile Number *</label>
            <div style={{ display: "flex", gap: 9 }}>
              <div style={{
                padding: "13px 12px", borderRadius: 12, flexShrink: 0,
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                fontSize: 15, fontWeight: 700, color: "#F2F5FF",
                display: "flex", alignItems: "center", gap: 5,
              }}>
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

          {/* Request type */}
          <div>
            <label style={S.label}>Request Type</label>
            <div style={{ display: "flex", gap: 10 }}>
              {([
                { v: "new_shop",        label: "➕ Add New Shop" },
                { v: "claim_existing",  label: "🔗 Claim Existing Shop" },
              ] as const).map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => up("request_type", opt.v)}
                  style={{
                    flex: 1, padding: "11px 8px", borderRadius: 12,
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                    fontFamily: "'DM Sans',sans-serif",
                    background: form.request_type === opt.v ? "rgba(255,94,26,0.15)" : "rgba(255,255,255,0.04)",
                    border: form.request_type === opt.v ? "1.5px solid rgba(255,94,26,0.50)" : "1.5px solid rgba(255,255,255,0.09)",
                    color: form.request_type === opt.v ? "#FF5E1A" : "rgba(255,255,255,0.45)",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {form.request_type === "claim_existing" && (
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", marginTop: 7 }}>
                Enter the exact shop name above. Our team will match it in our database.
              </p>
            )}
          </div>

          {/* Locality */}
          {localities.length > 0 && (
            <div>
              <label style={S.label}>Area / Locality</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {localities.map(l => (
                  <button
                    key={l.id} type="button"
                    onClick={() => up("locality_id", form.locality_id === l.id ? "" : l.id)}
                    style={S.chip(form.locality_id === l.id)}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category */}
          {categories.length > 0 && (
            <div>
              <label style={S.label}>Business Type</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {categories.slice(0, 12).map(c => (
                  <button
                    key={c.id} type="button"
                    onClick={() => up("category_id", form.category_id === c.id ? "" : c.id)}
                    style={S.chip(form.category_id === c.id)}
                  >
                    {c.icon} {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <label style={S.label}>Note (optional)</label>
            <textarea
              rows={3}
              value={form.note}
              onChange={e => up("note", e.target.value)}
              placeholder="Any details about your shop, proof of ownership, etc."
              style={S.textarea}
            />
          </div>

          {error && <div style={S.err}>{error}</div>}

          <button type="submit" disabled={loading} style={S.btn(loading)}>
            {loading ? "Submitting…" : "Submit Request →"}
          </button>

          <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.30)", marginTop: 4 }}>
            Already approved?{" "}
            <Link href="/vendor/set-password" style={{ color: "#FF5E1A", fontWeight: 700, textDecoration: "none" }}>
              Set your password
            </Link>
            {" · "}
            <Link href="/vendor/login" style={{ color: "rgba(255,255,255,0.50)", textDecoration: "none" }}>
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function VendorJoinPage() {
  return (
    <Suspense>
      <VendorJoinForm />
    </Suspense>
  );
}
