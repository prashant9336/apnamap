"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const [mode,     setMode]     = useState<"email" | "mobile">("mobile");
  const [email,    setEmail]    = useState("");
  const [mobile,   setMobile]   = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirect     = searchParams.get("redirect") || "/explore";
  const sb           = createClient();

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(redirect);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");

    const loginEmail = mode === "mobile"
      ? `${mobile.replace(/\D/g, "")}@vendor.apnamap.in`
      : email;

    if (mode === "mobile" && mobile.replace(/\D/g, "").length !== 10) {
      setError("Enter a valid 10-digit mobile number");
      setLoading(false); return;
    }

    const { data, error: err } = await sb.auth.signInWithPassword({ email: loginEmail, password });
    if (err) {
      if (mode === "mobile") {
        setError("Wrong mobile number or password. Have you set your password yet?");
      } else {
        setError(err.message);
      }
      setLoading(false); return;
    }

    // Check must_change_password for vendors
    const { data: vendorRow } = await sb.from("vendors").select("must_change_password").eq("id", data.user.id).maybeSingle();
    if (vendorRow?.must_change_password) {
      window.location.href = "/vendor/change-password"; return;
    }

    const { data: profile } = await sb.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    const role = profile?.role ?? data.user.user_metadata?.role ?? "customer";
    if (role === "admin")  { window.location.href = "/admin/dashboard"; return; }
    if (role === "vendor") { window.location.href = "/my-shop"; return; }
    router.replace(redirect);
  }

  const S = {
    pg:    { minHeight: "100vh", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", padding: 20, background: "#05070C" },
    card:  { width: "100%", maxWidth: 360 },
    input: { width: "100%", padding: "13px 14px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#F2F5FF", fontSize: 15, outline: "none", fontFamily: "'DM Sans',sans-serif", display: "block", boxSizing: "border-box" as const },
    btn:   { width: "100%", padding: "14px", borderRadius: 12, background: loading ? "rgba(255,94,26,0.5)" : "#FF5E1A", color: "#fff", border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", boxShadow: loading ? "none" : "0 0 24px rgba(255,94,26,0.35)" } as React.CSSProperties,
    label: { display: "block" as const, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.40)", textTransform: "uppercase" as const, letterSpacing: "0.8px", marginBottom: 6 },
    err:   { padding: "10px 13px", borderRadius: 10, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)", color: "#F87171", fontSize: 12, marginBottom: 14 },
  };

  return (
    <div style={S.pg}>
      <div style={S.card}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "#FF5E1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 14px", boxShadow: "0 0 24px rgba(255,94,26,0.45)" }}>📍</div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 900, color: "#F2F5FF", letterSpacing: "-0.4px", marginBottom: 4 }}>Welcome back</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.40)" }}>Sign in to your ApnaMap account</p>
        </div>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 4 }}>
          {([
            { id: "mobile", label: "📱 Mobile" },
            { id: "email",  label: "✉️ Email" },
          ] as const).map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => { setMode(opt.id); setError(""); }}
              style={{
                flex: 1, padding: "9px", borderRadius: 9, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif",
                background: mode === opt.id ? "#FF5E1A" : "transparent",
                color: mode === opt.id ? "#fff" : "rgba(255,255,255,0.45)",
                transition: "all 0.15s",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {mode === "mobile" ? (
            <div>
              <label style={S.label}>Mobile Number</label>
              <div style={{ display: "flex", gap: 9 }}>
                <div style={{ padding: "13px 11px", borderRadius: 12, flexShrink: 0, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", fontSize: 14, fontWeight: 700, color: "#F2F5FF", display: "flex", alignItems: "center", gap: 4 }}>
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
          ) : (
            <div>
              <label style={S.label}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" style={S.input} autoFocus />
            </div>
          )}

          <div>
            <label style={S.label}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={S.input} />
          </div>

          {error && <div style={S.err}>{error}</div>}

          <button type="submit" disabled={loading} style={S.btn}>
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>

        {/* Secondary options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
          <Link href="/auth/phone" style={{ display: "block", textAlign: "center", padding: "12px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)", textDecoration: "none" }}>
            📲 Sign in with OTP instead
          </Link>
          {mode === "mobile" && (
            <Link href="/vendor/set-password" style={{ display: "block", textAlign: "center", padding: "11px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", fontSize: 12, color: "rgba(255,255,255,0.40)", textDecoration: "none" }}>
              🔐 First login? Set your password →
            </Link>
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: 13, marginTop: 16, color: "rgba(255,255,255,0.40)" }}>
          No account?{" "}
          <Link href="/auth/signup" style={{ color: "#FF5E1A", fontWeight: 600, textDecoration: "none" }}>Sign up free</Link>
        </p>
        <p style={{ textAlign: "center", marginTop: 10 }}>
          <Link href="/explore" style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", textDecoration: "none" }}>Continue without account →</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
