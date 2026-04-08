"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const S = {
  page:  { minHeight: "100vh", background: "#05070C", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", padding: "24px 20px" },
  card:  { width: "100%", maxWidth: 380 },
  label: { display: "block" as const, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.40)", textTransform: "uppercase" as const, letterSpacing: "0.8px", marginBottom: 7 },
  input: { width: "100%", padding: "13px 14px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#F2F5FF", fontSize: 15, outline: "none", fontFamily: "'DM Sans',sans-serif", display: "block", boxSizing: "border-box" as const },
  err:   { padding: "10px 13px", borderRadius: 10, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)", color: "#F87171", fontSize: 12 } as React.CSSProperties,
  btn:   (disabled: boolean): React.CSSProperties => ({ width: "100%", padding: "14px", borderRadius: 13, background: disabled ? "rgba(255,94,26,0.45)" : "#FF5E1A", color: "#fff", border: "none", cursor: disabled ? "not-allowed" : "pointer", fontSize: 15, fontWeight: 800, fontFamily: "'DM Sans',sans-serif", boxShadow: disabled ? "none" : "0 0 24px rgba(255,94,26,0.35)" }),
};

export default function ChangePasswordPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [checking,  setChecking]  = useState(true);
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [done,      setDone]      = useState(false);

  // Ensure user is logged in and must_change_password is set
  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/vendor/login");
        return;
      }
      const role = user.user_metadata?.role ?? "customer";
      if (role !== "vendor" && role !== "admin") {
        router.replace("/");
        return;
      }
      // Allow admin to skip this page
      if (role === "admin") {
        router.replace("/admin");
        return;
      }
      setChecking(false);
    }
    check();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6)  { setError("Password must be at least 6 characters"); return; }
    if (password !== confirm)  { setError("Passwords do not match"); return; }

    setLoading(true);
    try {
      // Update password via Supabase (user is already signed in)
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) { setError(pwErr.message); setLoading(false); return; }

      // Clear must_change_password flag
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("vendors")
          .update({ must_change_password: false })
          .eq("id", user.id);
      }

      setDone(true);
      setTimeout(() => router.replace("/my-shop"), 1800);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div style={S.page}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(255,94,26,0.30)", borderTopColor: "#FF5E1A", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (done) {
    return (
      <div style={S.page}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(31,187,90,0.15)", border: "2px solid rgba(31,187,90,0.40)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 18px" }}>
            ✓
          </div>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: "#F2F5FF", marginBottom: 8 }}>
            Password Updated!
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.40)" }}>Taking you to your shop…</p>
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
            🔑
          </div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 900, color: "#F2F5FF", letterSpacing: "-0.4px", marginBottom: 6 }}>
            Set Your Password
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.40)", lineHeight: 1.5 }}>
            You&apos;re using a temporary password. Please set a permanent one to continue.
          </p>
        </div>

        {/* Info banner */}
        <div style={{ padding: "10px 14px", borderRadius: 11, background: "rgba(232,168,0,0.08)", border: "1px solid rgba(232,168,0,0.25)", marginBottom: 24 }}>
          <p style={{ fontSize: 12, color: "#E8A800", lineHeight: 1.5 }}>
            ⚠️ Choose a strong password — do not share it with anyone.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={S.label}>New Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              style={S.input}
              required autoFocus
            />
          </div>

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

          <button type="submit" disabled={loading || password.length < 6 || password !== confirm} style={S.btn(loading || password.length < 6 || password !== confirm)}>
            {loading ? "Saving…" : "Save Password →"}
          </button>
        </form>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
