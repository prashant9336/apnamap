"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const S = {
  page:  { minHeight: "100vh", background: "#05070C", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", padding: "24px 20px" },
  card:  { width: "100%", maxWidth: 380 },
  label: { display: "block" as const, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.40)", textTransform: "uppercase" as const, letterSpacing: "0.8px", marginBottom: 7 },
  input: { width: "100%", padding: "13px 14px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#F2F5FF", fontSize: 15, outline: "none", fontFamily: "'DM Sans',sans-serif", display: "block", boxSizing: "border-box" as const },
  err:   { padding: "10px 13px", borderRadius: 10, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)", color: "#F87171", fontSize: 12, marginBottom: 14 },
  btn:   (disabled: boolean): React.CSSProperties => ({ width: "100%", padding: "14px", borderRadius: 13, background: disabled ? "rgba(255,94,26,0.45)" : "#FF5E1A", color: "#fff", border: "none", cursor: disabled ? "not-allowed" : "pointer", fontSize: 15, fontWeight: 800, fontFamily: "'DM Sans',sans-serif", boxShadow: disabled ? "none" : "0 0 24px rgba(255,94,26,0.35)" }),
};

function SetPasswordForm() {
  const router = useRouter();
  const [mobile,   setMobile]   = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [done,     setDone]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const digits = mobile.replace(/\D/g, "");
    if (digits.length !== 10) { setError("Enter a valid 10-digit mobile number"); return; }
    if (password.length < 6)  { setError("Password must be at least 6 characters"); return; }
    if (password !== confirm)  { setError("Passwords do not match"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/vendor/activate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ mobile: digits, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.alreadyExists) {
          // Account exists — redirect to login
          router.replace("/vendor/login");
          return;
        }
        setError(data.error ?? "Something went wrong");
        return;
      }

      setDone(true);
      setTimeout(() => router.replace("/vendor/login"), 1800);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div style={S.page}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(31,187,90,0.15)", border: "2px solid rgba(31,187,90,0.40)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 18px" }}>
            ✓
          </div>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: "#F2F5FF", marginBottom: 8 }}>
            Account Activated!
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.40)" }}>
            Redirecting to login…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "#FF5E1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 14px", boxShadow: "0 0 28px rgba(255,94,26,0.45)" }}>
            🔐
          </div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 900, color: "#F2F5FF", letterSpacing: "-0.4px", marginBottom: 6 }}>
            Set Your Password
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.40)" }}>
            Enter the mobile number from your request and choose a password
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

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
            <label style={S.label}>New Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              style={S.input}
              required
            />
          </div>

          {/* Confirm */}
          <div>
            <label style={S.label}>Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              style={{ ...S.input, marginBottom: 4 }}
              required
            />
            {confirm && password !== confirm && (
              <p style={{ fontSize: 11, color: "#F87171", marginTop: 5 }}>Passwords don&apos;t match</p>
            )}
          </div>

          {error && <div style={S.err}>{error}</div>}

          <button type="submit" disabled={loading} style={S.btn(loading)}>
            {loading ? "Activating…" : "Activate Account →"}
          </button>

          <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.30)" }}>
            <Link href="/vendor/login" style={{ color: "rgba(255,255,255,0.50)", textDecoration: "none" }}>
              Already have a password? Login →
            </Link>
          </p>
          <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.25)" }}>
            No request yet?{" "}
            <Link href="/vendor/join" style={{ color: "#FF5E1A", textDecoration: "none", fontWeight: 700 }}>
              Submit a request
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  );
}
