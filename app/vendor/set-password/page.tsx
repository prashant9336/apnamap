"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/* ── Styles ─────────────────────────────────────────────────────── */
const S = {
  page:  { minHeight: "100vh", background: "#05070C", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", padding: "24px 20px" },
  card:  { width: "100%", maxWidth: 380 },
  label: { display: "block" as const, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.40)", textTransform: "uppercase" as const, letterSpacing: "0.8px", marginBottom: 7 },
  input: { width: "100%", padding: "13px 14px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#F2F5FF", fontSize: 15, outline: "none", fontFamily: "'DM Sans',sans-serif", display: "block", boxSizing: "border-box" as const },
  err:   { padding: "10px 13px", borderRadius: 10, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)", color: "#F87171", fontSize: 12, marginBottom: 14 },
  btn:   (disabled: boolean): React.CSSProperties => ({ width: "100%", padding: "14px", borderRadius: 13, background: disabled ? "rgba(255,94,26,0.45)" : "#FF5E1A", color: "#fff", border: "none", cursor: disabled ? "not-allowed" : "pointer", fontSize: 15, fontWeight: 800, fontFamily: "'DM Sans',sans-serif", boxShadow: disabled ? "none" : "0 0 24px rgba(255,94,26,0.35)" }),
  btnSm: (disabled: boolean): React.CSSProperties => ({ padding: "13px 18px", borderRadius: 12, background: disabled ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: disabled ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.70)", cursor: disabled ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", flexShrink: 0 }),
};

type Step = "mobile" | "otp" | "password";

/* ── OTP digit input ─────────────────────────────────────────────── */
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, " ").split("").slice(0, 6);

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i].trim() && i > 0) {
      refs.current[i - 1]?.focus();
    }
  }

  function handleChange(i: number, raw: string) {
    const d = raw.replace(/\D/g, "");
    if (!d) {
      const arr = digits.map(x => x.trim());
      arr[i] = "";
      onChange(arr.join(""));
      return;
    }
    // Paste: fill multiple boxes
    if (d.length > 1) {
      const full = (digits.join("").replace(/ /g, "") + d).slice(0, 6);
      onChange(full);
      const next = Math.min(full.length, 5);
      refs.current[next]?.focus();
      return;
    }
    const arr = digits.map(x => x.trim());
    arr[i] = d;
    onChange(arr.join(""));
    if (i < 5) refs.current[i + 1]?.focus();
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="tel"
          inputMode="numeric"
          maxLength={6}
          value={digits[i].trim()}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          style={{
            ...S.input, flex: 1, textAlign: "center", fontSize: 22, fontWeight: 800,
            padding: "12px 0",
          }}
        />
      ))}
    </div>
  );
}

/* ── Main form ───────────────────────────────────────────────────── */
function SetPasswordForm() {
  const router = useRouter();

  const [step,    setStep]    = useState<Step>("mobile");
  const [mobile,  setMobile]  = useState("");
  const [otp,     setOtp]     = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [done,     setDone]     = useState(false);

  // Resend cooldown
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const digits = mobile.replace(/\D/g, "");

  /* ── Step 1: send OTP ── */
  async function sendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    if (digits.length !== 10) { setError("Enter a valid 10-digit mobile number"); return; }

    setLoading(true);
    try {
      const res  = await fetch("/api/otp/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: digits }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to send OTP"); return; }
      setStep("otp");
      setCooldown(60);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /* ── Step 2: verify OTP ── */
  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const code = otp.replace(/\s/g, "");
    if (code.length !== 6) { setError("Enter the 6-digit OTP"); return; }

    setLoading(true);
    try {
      const res  = await fetch("/api/otp/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: digits, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Verification failed"); return; }
      setStep("password");
      setOtp("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /* ── Step 3: set password ── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6)  { setError("Password must be at least 6 characters"); return; }
    if (password !== confirm)  { setError("Passwords do not match"); return; }

    setLoading(true);
    try {
      const res  = await fetch("/api/vendor/activate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: digits, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.alreadyExists) { router.replace("/vendor/login"); return; }
        if (data.otpRequired)   { setStep("mobile"); setError("Session expired. Please verify your mobile again."); return; }
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

  /* ── Success screen ── */
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
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.40)" }}>Redirecting to login…</p>
        </div>
      </div>
    );
  }

  /* ── Header ── */
  const stepMeta = {
    mobile:   { icon: "🔐", title: "Set Your Password", sub: "Enter your approved mobile number to get started" },
    otp:      { icon: "📲", title: "Verify Your Number", sub: `OTP sent to +91 ${digits.slice(0,5)}·····` },
    password: { icon: "🔑", title: "Choose a Password", sub: "Your number is verified. Set a secure password." },
  };
  const meta = stepMeta[step];

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "#FF5E1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 14px", boxShadow: "0 0 28px rgba(255,94,26,0.45)" }}>
            {meta.icon}
          </div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 900, color: "#F2F5FF", letterSpacing: "-0.4px", marginBottom: 6 }}>
            {meta.title}
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.40)" }}>{meta.sub}</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
          {(["mobile", "otp", "password"] as Step[]).map((s, i) => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: (["mobile","otp","password"].indexOf(step) >= i) ? "#FF5E1A" : "rgba(255,255,255,0.10)" }} />
          ))}
        </div>

        {/* ── STEP 1: Mobile ── */}
        {step === "mobile" && (
          <form onSubmit={sendOtp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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

            {error && <div style={S.err}>{error}</div>}

            <button type="submit" disabled={loading || digits.length !== 10} style={S.btn(loading || digits.length !== 10)}>
              {loading ? "Sending OTP…" : "Send OTP →"}
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
        )}

        {/* ── STEP 2: OTP ── */}
        {step === "otp" && (
          <form onSubmit={verifyOtp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={S.label}>Enter OTP</label>
              <OtpInput value={otp} onChange={setOtp} />
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 7 }}>
                Check your SMS / WhatsApp for the 6-digit code (valid 10 min)
              </p>
            </div>

            {error && <div style={S.err}>{error}</div>}

            <button type="submit" disabled={loading || otp.replace(/\s/g, "").length !== 6} style={S.btn(loading || otp.replace(/\s/g, "").length !== 6)}>
              {loading ? "Verifying…" : "Verify OTP →"}
            </button>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <button
                type="button"
                onClick={() => { setStep("mobile"); setOtp(""); setError(""); }}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 12, cursor: "pointer", padding: 0 }}
              >
                ← Change number
              </button>
              <button
                type="button"
                onClick={() => sendOtp()}
                disabled={cooldown > 0}
                style={{ background: "none", border: "none", color: cooldown > 0 ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.55)", fontSize: 12, cursor: cooldown > 0 ? "not-allowed" : "pointer", padding: 0 }}
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 3: Password ── */}
        {step === "password" && (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={S.label}>New Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
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

            <button type="submit" disabled={loading} style={S.btn(loading)}>
              {loading ? "Activating…" : "Activate Account →"}
            </button>
          </form>
        )}
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
