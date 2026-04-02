"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/* ── Styles ─────────────────────────────────────────────────────── */
const S = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 20px",
    background: "#05070C",
  },
  card: { width: "100%", maxWidth: 360 },
  label: {
    display: "block" as const,
    fontSize: 11,
    fontWeight: 700,
    color: "rgba(255,255,255,0.40)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.8px",
    marginBottom: 7,
  },
  err: {
    padding: "10px 13px",
    borderRadius: 10,
    background: "rgba(239,68,68,0.10)",
    border: "1px solid rgba(239,68,68,0.22)",
    color: "#F87171",
    fontSize: 12,
    marginBottom: 16,
  },
  btn: (disabled: boolean, color = "#FF5E1A"): React.CSSProperties => ({
    width: "100%",
    padding: "14px",
    borderRadius: 13,
    background: disabled ? `${color}55` : color,
    color: "#fff",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 15,
    fontWeight: 800,
    fontFamily: "'DM Sans',sans-serif",
    boxShadow: disabled ? "none" : `0 0 24px ${color}55`,
    transition: "all 0.2s",
  }),
};

function PhoneForm() {
  const [phone,   setPhone]   = useState("");
  const [role,    setRole]    = useState<"customer" | "vendor">("customer");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirect     = searchParams.get("redirect") ?? "";
  const supabase     = createClient();

  /* Redirect if already logged in */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase.from("profiles").select("role").eq("id", session.user.id).single()
        .then(({ data: p }) => {
          const r = p?.role ?? "customer";
          router.replace(r === "vendor" || r === "admin" ? "/vendor/dashboard" : redirect || "/explore");
        });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    setError("");

    const { error: otpErr } = await supabase.auth.signInWithOtp({
      phone: `+91${digits}`,
      options: {
        // Pass role in user metadata — trigger uses it if this is a new user
        data: { role },
      },
    });

    if (otpErr) {
      setError(otpErr.message);
      setLoading(false);
      return;
    }

    // Persist for the verify step
    sessionStorage.setItem("otp_phone",    digits);
    sessionStorage.setItem("otp_role",     role);
    sessionStorage.setItem("otp_redirect", redirect);

    router.push("/auth/verify");
  }

  const canSend = phone.replace(/\D/g, "").length === 10;

  return (
    <div style={S.page}>
      <div style={S.card}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "#FF5E1A",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, margin: "0 auto 14px",
            boxShadow: "0 0 28px rgba(255,94,26,0.50)",
          }}>
            📍
          </div>
          <h1 style={{
            fontFamily: "'Syne',sans-serif", fontSize: 24,
            fontWeight: 900, color: "#F2F5FF", letterSpacing: "-0.4px", margin: "0 0 6px",
          }}>
            ApnaMap
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", margin: 0 }}>
            Enter your mobile number to continue
          </p>
        </div>

        <form onSubmit={handleSend}>

          {/* ── Role selector ──────────────────────────────────── */}
          <label style={S.label}>I am a</label>
          <div style={{ display: "flex", gap: 9, marginBottom: 20 }}>
            {(["customer", "vendor"] as const).map(r => {
              const active = role === r;
              const accent = r === "vendor" ? "#A78BFA" : "#FF5E1A";
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: 12,
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                    background: active ? `${accent}18` : "rgba(255,255,255,0.04)",
                    border: active ? `1.5px solid ${accent}55` : "1.5px solid rgba(255,255,255,0.09)",
                    color: active ? accent : "rgba(255,255,255,0.45)",
                    transition: "all 0.18s",
                  }}
                >
                  {r === "customer" ? "👤 Customer" : "🏪 Vendor"}
                </button>
              );
            })}
          </div>

          {/* ── Phone input ────────────────────────────────────── */}
          <label style={S.label}>Mobile Number</label>
          <div style={{ display: "flex", gap: 9, marginBottom: 8 }}>
            {/* Country prefix */}
            <div style={{
              padding: "14px 13px", borderRadius: 12, flexShrink: 0,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: 15, fontWeight: 700, color: "#F2F5FF",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              🇮🇳 <span style={{ color: "rgba(255,255,255,0.55)" }}>+91</span>
            </div>

            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit number"
              autoFocus
              style={{
                flex: 1, padding: "14px 14px", borderRadius: 12,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#F2F5FF", fontSize: 16, outline: "none",
                fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.5px",
              }}
            />
          </div>

          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginBottom: 20 }}>
            We'll send a 6-digit OTP via SMS
          </p>

          {error && <div style={S.err}>{error}</div>}

          <button
            type="submit"
            disabled={loading || !canSend}
            style={S.btn(loading || !canSend)}
          >
            {loading ? "Sending OTP…" : "Send OTP →"}
          </button>
        </form>

        {/* ── Divider ──────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          margin: "22px 0",
        }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", fontWeight: 600 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
        </div>

        <Link href="/auth/login" style={{
          display: "block", textAlign: "center",
          padding: "12px", borderRadius: 12,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.09)",
          fontSize: 13, fontWeight: 600,
          color: "rgba(255,255,255,0.55)",
          textDecoration: "none",
        }}>
          Sign in with Email & Password
        </Link>

        <p style={{ textAlign: "center", marginTop: 16 }}>
          <Link href="/explore" style={{
            fontSize: 12, color: "rgba(255,255,255,0.25)", textDecoration: "none",
          }}>
            Continue without account →
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function PhonePage() {
  return (
    <Suspense>
      <PhoneForm />
    </Suspense>
  );
}
