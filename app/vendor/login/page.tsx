"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { vendorAuthEmail } from "@/lib/config";

const S = {
  page:  { minHeight: "100dvh", background: "#05070C", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", padding: "max(24px, calc(env(safe-area-inset-top, 0px) + 20px)) 20px max(24px, calc(env(safe-area-inset-bottom, 0px) + 20px))" },
  card:  { width: "100%", maxWidth: 380 },
  label: { display: "block" as const, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.40)", textTransform: "uppercase" as const, letterSpacing: "0.8px", marginBottom: 7 },
  input: { width: "100%", padding: "13px 14px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#F2F5FF", fontSize: 15, outline: "none", fontFamily: "'DM Sans',sans-serif", display: "block", boxSizing: "border-box" as const },
  err:   { padding: "10px 13px", borderRadius: 10, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)", color: "#F87171", fontSize: 12, marginBottom: 14 },
  btn:   (disabled: boolean): React.CSSProperties => ({ width: "100%", padding: "14px", borderRadius: 13, background: disabled ? "rgba(255,94,26,0.45)" : "#FF5E1A", color: "#fff", border: "none", cursor: disabled ? "not-allowed" : "pointer", fontSize: 15, fontWeight: 800, fontFamily: "'DM Sans',sans-serif", boxShadow: disabled ? "none" : "0 0 24px rgba(255,94,26,0.35)" }),
};

function VendorLoginForm() {
  const router   = useRouter();
  const supabase = createClient();
  const [mobile,   setMobile]   = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // Redirect if already logged in — let /my-shop handle vendor vs non-vendor check
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) window.location.href = "/my-shop";
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const digits = mobile.replace(/\D/g, "");
    if (digits.length !== 10) { setError("Enter a valid 10-digit mobile number"); return; }
    if (!password)            { setError("Enter your password"); return; }

    setLoading(true);
    try {
      // Vendor accounts use synthetic email (no phone provider needed)
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email:    vendorAuthEmail(digits),
        password,
      });

      if (signInErr) {
        if (signInErr.message?.toLowerCase().includes("invalid")) {
          setError("Wrong mobile number or password. Check and try again.");
        } else if (signInErr.message?.toLowerCase().includes("not found")) {
          setError("No vendor account for this number. Have you set your password after approval?");
        } else {
          setError(signInErr.message);
        }
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError("Login failed. Please try again.");
        setLoading(false);
        return;
      }

      // Check if vendor must change temporary password
      const { data: vendorRow } = await supabase
        .from("vendors")
        .select("must_change_password")
        .eq("id", data.user.id)
        .maybeSingle();

      // Full-page navigation so session cookies are applied before Next.js renders
      if (vendorRow?.must_change_password) {
        window.location.href = "/vendor/change-password";
      } else {
        window.location.href = "/my-shop";
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "#FF5E1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 14px", boxShadow: "0 0 28px rgba(255,94,26,0.45)" }}>
            🏪
          </div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 900, color: "#F2F5FF", letterSpacing: "-0.4px", marginBottom: 6 }}>
            Vendor Login
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.40)" }}>
            Sign in with your mobile number and password
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Mobile */}
          <div>
            <label style={S.label}>Mobile Number</label>
            <div style={{ display: "flex", gap: 9 }}>
              <div style={{ padding: "13px 12px", borderRadius: 12, flexShrink: 0, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", fontSize: 15, fontWeight: 700, color: "#F2F5FF", display: "flex", alignItems: "center", gap: 5 }}>
                🇮🇳 <span style={{ color: "rgba(255,255,255,0.55)" }}>+91</span>
              </div>
              <input
                type="tel" inputMode="numeric"
                value={mobile}
                onChange={e => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit number"
                style={{ ...S.input, flex: 1 }}
                required autoFocus
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={S.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Your password"
              style={S.input}
              required
            />
          </div>

          {error && <div style={S.err}>{error}</div>}

          <button type="submit" disabled={loading} style={S.btn(loading)}>
            {loading ? "Signing in…" : "Sign In →"}
          </button>

          {/* Nav links */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            <Link href="/vendor/set-password" style={{ display: "block", textAlign: "center", padding: "12px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)", textDecoration: "none" }}>
              🔐 First time? Activate your account
            </Link>
            <Link href="/vendor/join" style={{ display: "block", textAlign: "center", padding: "12px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", fontSize: 13, color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>
              New vendor? Submit a request →
            </Link>
          </div>

          <p style={{ textAlign: "center", marginTop: 4 }}>
            <Link href="/auth/login" style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>
              Sign in with email instead →
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function VendorLoginPage() {
  return (
    <Suspense>
      <VendorLoginForm />
    </Suspense>
  );
}
