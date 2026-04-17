"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { phoneDigits } from "@/lib/config";

type VendorResult = {
  id: string;
  mobile: string | null;
  shops: Array<{ id: string; name: string }>;
};

type ResetResult = {
  temp_password: string;
  whatsapp_msg: string;
};

const S = {
  page:    { minHeight: "100dvh", background: "#05070C", padding: "0 0 60px" } as React.CSSProperties,
  hdr:     { position: "sticky" as const, top: 0, zIndex: 50, display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "rgba(5,7,12,0.97)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.07)" },
  inner:   { maxWidth: 480, margin: "0 auto", padding: "24px 16px", display: "flex", flexDirection: "column" as const, gap: 16 },
  card:    { padding: "16px", borderRadius: 14, background: "rgba(255,255,255,0.034)", border: "1px solid rgba(255,255,255,0.07)" } as React.CSSProperties,
  inp:     { width: "100%", padding: "13px 14px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#F2F5FF", fontSize: 15, outline: "none", fontFamily: "'DM Sans',sans-serif", boxSizing: "border-box" as const },
  lbl:     { display: "block" as const, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.40)", textTransform: "uppercase" as const, letterSpacing: "0.8px", marginBottom: 7 },
  btn:     (color: string, disabled: boolean): React.CSSProperties => ({ padding: "12px 18px", borderRadius: 11, background: disabled ? "rgba(255,255,255,0.06)" : color, color: disabled ? "rgba(255,255,255,0.30)" : "#fff", border: "none", cursor: disabled ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }),
  err:     { padding: "10px 13px", borderRadius: 10, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)", color: "#F87171", fontSize: 12 } as React.CSSProperties,
  success: { padding: "10px 13px", borderRadius: 10, background: "rgba(31,187,90,0.10)", border: "1px solid rgba(31,187,90,0.28)", color: "#1FBB5A", fontSize: 12 } as React.CSSProperties,
};

async function getBearerToken(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession();
  return session?.access_token ?? "";
}

export default function ResetPasswordForm() {
  const [query,      setQuery]      = useState("");
  const [searching,  setSearching]  = useState(false);
  const [results,    setResults]    = useState<VendorResult[] | null>(null);
  const [selected,   setSelected]   = useState<VendorResult | null>(null);
  const [resetting,  setResetting]  = useState(false);
  const [resetResult, setResetResult] = useState<ResetResult | null>(null);
  const [error,      setError]      = useState("");
  const [copied,     setCopied]     = useState<"pass" | "msg" | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleQueryChange(val: string) {
    setQuery(val);
    setResults(null);
    setSelected(null);
    setResetResult(null);
    setError("");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 3) return;

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const tok = await getBearerToken();
        const res = await fetch(
          `/api/admin/reset-vendor-password?q=${encodeURIComponent(val.trim())}`,
          { headers: tok ? { Authorization: `Bearer ${tok}` } : {} }
        );
        if (!res.ok) { setError("Search failed"); setSearching(false); return; }
        const { vendors } = await res.json();
        setResults(vendors ?? []);
      } catch {
        setError("Network error");
      }
      setSearching(false);
    }, 400);
  }

  async function handleReset() {
    if (!selected) return;
    setResetting(true);
    setError("");
    setResetResult(null);
    try {
      const tok = await getBearerToken();
      const res = await fetch("/api/admin/reset-vendor-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
        body: JSON.stringify({ vendor_id: selected.id }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Reset failed"); setResetting(false); return; }
      setResetResult({ temp_password: json.temp_password, whatsapp_msg: json.whatsapp_msg });
    } catch {
      setError("Network error");
    }
    setResetting(false);
  }

  function copy(text: string, key: "pass" | "msg") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2500);
    });
  }

  const shopName = selected?.shops?.[0]?.name ?? "Unknown Shop";
  const mobileDisplay = selected?.mobile ? `+91 ${phoneDigits(selected.mobile)}` : "—";

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.hdr}>
        <a href="/admin/dashboard" style={{ color: "rgba(255,255,255,0.45)", textDecoration: "none", fontSize: 20, lineHeight: 1 }}>←</a>
        <div>
          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 900, color: "#F2F5FF" }}>Reset Vendor Password</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Admin tool — generates a temporary password</p>
        </div>
      </div>

      <div style={S.inner}>

        {/* Search */}
        <div style={S.card}>
          <label style={S.lbl}>Search Vendor</label>
          <input
            type="text"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder="Mobile number or shop name…"
            style={S.inp}
            autoFocus
          />
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 8 }}>
            Type at least 3 characters — search by 10-digit mobile or shop name
          </p>
        </div>

        {/* Searching spinner */}
        {searching && (
          <div style={{ textAlign: "center", padding: "20px 0", color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
            Searching…
          </div>
        )}

        {/* Results */}
        {results !== null && !searching && (
          results.length === 0 ? (
            <div style={{ ...S.card, textAlign: "center", padding: "24px" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.40)" }}>No vendors found for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.7px" }}>
                {results.length} result{results.length !== 1 ? "s" : ""} — tap to select
              </p>
              {results.map(v => {
                const isSelected = selected?.id === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => { setSelected(v); setResetResult(null); setError(""); }}
                    style={{
                      ...S.card,
                      textAlign: "left",
                      cursor: "pointer",
                      border: isSelected ? "1px solid #FF5E1A" : "1px solid rgba(255,255,255,0.07)",
                      background: isSelected ? "rgba(255,94,26,0.08)" : "rgba(255,255,255,0.034)",
                      width: "100%",
                    }}
                  >
                    <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: "#F2F5FF", marginBottom: 4 }}>
                      {v.shops?.[0]?.name ?? "Unknown Shop"}
                    </p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)" }}>
                      📱 {v.mobile ? `+91 ${phoneDigits(v.mobile)}` : "—"}
                    </p>
                  </button>
                );
              })}
            </div>
          )
        )}

        {/* Selected vendor action panel */}
        {selected && !resetResult && (
          <div style={{ ...S.card, border: "1px solid rgba(255,94,26,0.30)" }}>
            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: "#F2F5FF", marginBottom: 4 }}>
              {shopName}
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", marginBottom: 16 }}>
              {mobileDisplay}
            </p>

            <div style={{ padding: "10px 13px", borderRadius: 10, background: "rgba(232,168,0,0.08)", border: "1px solid rgba(232,168,0,0.25)", marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: "#E8A800", lineHeight: 1.5 }}>
                ⚠️ This will immediately invalidate the vendor&apos;s current password and force them to set a new one on next login.
              </p>
            </div>

            {error && <div style={{ ...S.err, marginBottom: 14 }}>{error}</div>}

            <button
              onClick={handleReset}
              disabled={resetting}
              style={{ ...S.btn("#FF5E1A", resetting), width: "100%" }}
            >
              {resetting ? "Resetting…" : "🔑 Generate Temporary Password"}
            </button>
          </div>
        )}

        {/* Success: show credentials */}
        {resetResult && selected && (
          <div style={S.card}>
            <div style={{ ...S.success, marginBottom: 16 }}>
              ✓ Password reset for <strong>{shopName}</strong>
            </div>

            {/* Temp password */}
            <label style={S.lbl}>Temporary Password</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                readOnly
                value={resetResult.temp_password}
                style={{ ...S.inp, flex: 1, fontFamily: "monospace", letterSpacing: "1px", fontSize: 14 }}
              />
              <button
                onClick={() => copy(resetResult.temp_password, "pass")}
                style={{ ...S.btn(copied === "pass" ? "#1FBB5A" : "#3B82F6", false), flexShrink: 0 }}
              >
                {copied === "pass" ? "✓" : "Copy"}
              </button>
            </div>

            {/* WhatsApp message */}
            <label style={S.lbl}>WhatsApp Message</label>
            <textarea
              readOnly
              value={resetResult.whatsapp_msg}
              rows={9}
              style={{ ...S.inp, resize: "none", fontSize: 12, lineHeight: 1.6, marginBottom: 8 }}
            />
            <button
              onClick={() => copy(resetResult.whatsapp_msg, "msg")}
              style={{ ...S.btn(copied === "msg" ? "#1FBB5A" : "#1FBB5A", false), width: "100%", marginBottom: 12 }}
            >
              {copied === "msg" ? "✓ Copied!" : "📋 Copy WhatsApp Message"}
            </button>

            <button
              onClick={() => { setSelected(null); setResetResult(null); setQuery(""); setResults(null); }}
              style={{ ...S.btn("rgba(255,255,255,0.08)", false), width: "100%", color: "rgba(255,255,255,0.55)" }}
            >
              Reset Another Vendor
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
