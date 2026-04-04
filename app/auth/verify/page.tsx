"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  err: {
    padding: "10px 13px",
    borderRadius: 10,
    background: "rgba(239,68,68,0.10)",
    border: "1px solid rgba(239,68,68,0.22)",
    color: "#F87171",
    fontSize: 12,
    marginBottom: 18,
    textAlign: "center" as const,
  },
};

const DIGIT_COUNT = 6;
const RESEND_SECS = 30;

function maskPhone(raw: string) {
  // +91 XXXXX 56789 — reveal last 5
  if (raw.length < 6) return `+91 ${raw}`;
  const visible = raw.slice(-5);
  const hidden  = "•".repeat(raw.length - 5);
  return `+91 ${hidden}${visible}`;
}

function VerifyForm() {
  const router   = useRouter();
  const supabase = createClient();

  /* Read phone / role / redirect persisted by the phone page */
  const [phone,    setPhone]    = useState("");
  const [role,     setRole]     = useState("customer");
  const [redirect, setRedirect] = useState("");

  const [digits,   setDigits]   = useState<string[]>(Array(DIGIT_COUNT).fill(""));
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [cooldown, setCooldown] = useState(RESEND_SECS);
  const [success,  setSuccess]  = useState(false);

  /* One ref per digit box */
  const refs = useRef<Array<HTMLInputElement | null>>(Array(DIGIT_COUNT).fill(null));

  /* Restore session data & focus first box */
  useEffect(() => {
    const p = sessionStorage.getItem("otp_phone")    ?? "";
    const r = sessionStorage.getItem("otp_role")     ?? "customer";
    const d = sessionStorage.getItem("otp_redirect") ?? "";
    if (!p) { router.replace("/auth/phone"); return; }
    setPhone(p);
    setRole(r);
    setRedirect(d);
    refs.current[0]?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Resend countdown ticker */
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(n => n - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  /* ── Core verify ──────────────────────────────────────────────── */
  const handleVerify = useCallback(async (token: string) => {
    if (token.length !== DIGIT_COUNT) return;
    setLoading(true);
    setError("");

    try {
      /* 1. Verify the OTP */
      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        phone:  `+91${phone}`,
        token,
        type:   "sms",
      });

      if (verifyErr) throw verifyErr;

      const user = data.user!;

      /* 2. Check whether this user already has a role (returning user) */
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();   // .single() throws if no row — new users have no profile yet

      /* 3. Use existing role if present; otherwise apply what user chose */
      const finalRole = existingProfile?.role ?? role;

      /* 4. Upsert profile — sets phone and role, never downgrades existing role */
      await supabase.from("profiles").upsert(
        {
          id:         user.id,
          phone:      `+91${phone}`,
          role:       finalRole,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      /* 5. Mirror role into auth user metadata (used by middleware fallback) */
      await supabase.auth.updateUser({
        data: { role: finalRole },
      });

      /* 6. Clean up session storage */
      sessionStorage.removeItem("otp_phone");
      sessionStorage.removeItem("otp_role");
      sessionStorage.removeItem("otp_redirect");

      setSuccess(true);

      /* 7. Role-based redirect */
      setTimeout(() => {
        if (finalRole === "vendor" || finalRole === "admin") {
          router.replace("/vendor/dashboard");
        } else {
          router.replace(redirect || "/explore");
        }
      }, 600); // brief success flash before navigation

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Invalid code. Try again.";
      setError(msg.includes("Token has expired") ? "OTP expired. Please resend." : msg);
      setLoading(false);
      /* Clear digits on error so user can re-enter */
      setDigits(Array(DIGIT_COUNT).fill(""));
      refs.current[0]?.focus();
    }
  }, [phone, role, redirect, router, supabase]);

  /* ── OTP input handlers ───────────────────────────────────────── */
  function handleChange(i: number, val: string) {
    const d = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    setError(""); // clear error on new input

    if (d && i < DIGIT_COUNT - 1) {
      refs.current[i + 1]?.focus();
    }

    /* Auto-verify when the last digit is filled */
    if (next.every(x => x !== "")) {
      handleVerify(next.join(""));
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[i]) {
        const next = [...digits];
        next[i] = "";
        setDigits(next);
      } else if (i > 0) {
        refs.current[i - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < DIGIT_COUNT - 1) {
      refs.current[i + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, DIGIT_COUNT);
    if (!pasted) return;
    const next = Array(DIGIT_COUNT).fill("");
    for (let j = 0; j < pasted.length; j++) next[j] = pasted[j];
    setDigits(next);
    const lastIdx = Math.min(pasted.length - 1, DIGIT_COUNT - 1);
    refs.current[lastIdx]?.focus();
    if (pasted.length === DIGIT_COUNT) handleVerify(pasted);
  }

  /* ── Resend ───────────────────────────────────────────────────── */
  async function handleResend() {
    if (cooldown > 0) return;
    setError("");
    setDigits(Array(DIGIT_COUNT).fill(""));
    const { error: err } = await supabase.auth.signInWithOtp({
      phone: `+91${phone}`,
    });
    if (err) { setError(err.message); return; }
    setCooldown(RESEND_SECS);
    refs.current[0]?.focus();
  }

  const otpComplete = digits.every(d => d !== "");

  /* ── Success state ────────────────────────────────────────────── */
  if (success) {
    return (
      <div style={S.page}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 68, height: 68, borderRadius: "50%",
            background: "rgba(31,187,90,0.15)",
            border: "2px solid rgba(31,187,90,0.40)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 30, margin: "0 auto 18px",
          }}>
            ✓
          </div>
          <h2 style={{
            fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800,
            color: "#F2F5FF", marginBottom: 8,
          }}>
            Verified!
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)" }}>
            Signing you in…
          </p>
        </div>
      </div>
    );
  }

  /* ── Main form ────────────────────────────────────────────────── */
  return (
    <div style={S.page}>
      <div style={S.card}>

        {/* Back */}
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.50)", fontSize: 22,
            marginBottom: 28, padding: 0, display: "flex", alignItems: "center", gap: 6,
          }}
        >
          ← <span style={{ fontSize: 13, fontWeight: 600 }}>Back</span>
        </button>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "#FF5E1A",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, marginBottom: 14,
            boxShadow: "0 0 24px rgba(255,94,26,0.45)",
          }}>
            📲
          </div>
          <h2 style={{
            fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 900,
            color: "#F2F5FF", letterSpacing: "-0.3px", margin: "0 0 7px",
          }}>
            Enter the code
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", margin: 0 }}>
            6-digit OTP sent to <strong style={{ color: "rgba(255,255,255,0.65)" }}>{maskPhone(phone)}</strong>
          </p>
        </div>

        {/* ── 6-digit OTP input ─────────────────────────────────── */}
        <div style={{
          display: "flex", gap: 9, justifyContent: "center",
          marginBottom: 28,
        }}>
          {Array.from({ length: DIGIT_COUNT }).map((_, i) => (
            <input
              key={i}
              ref={el => { refs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digits[i]}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={handlePaste}
              disabled={loading}
              style={{
                width: 46, height: 56, textAlign: "center",
                fontSize: 22, fontWeight: 700, letterSpacing: 0,
                borderRadius: 12,
                background: digits[i]
                  ? "rgba(255,94,26,0.12)"
                  : "rgba(255,255,255,0.06)",
                border: digits[i]
                  ? "1.5px solid rgba(255,94,26,0.50)"
                  : "1.5px solid rgba(255,255,255,0.11)",
                color: "#F2F5FF",
                outline: "none",
                caretColor: "#FF5E1A",
                transition: "background 0.15s, border-color 0.15s",
              }}
            />
          ))}
        </div>

        {/* Error */}
        {error && <div style={S.err}>{error}</div>}

        {/* Verify button — shown only when OTP not yet auto-verified */}
        {!loading && (
          <button
            type="button"
            disabled={!otpComplete || loading}
            onClick={() => handleVerify(digits.join(""))}
            style={{
              width: "100%", padding: "14px", borderRadius: 13,
              background: otpComplete ? "#FF5E1A" : "rgba(255,94,26,0.22)",
              color: "#fff", border: "none",
              cursor: otpComplete ? "pointer" : "not-allowed",
              fontSize: 15, fontWeight: 800,
              fontFamily: "'DM Sans',sans-serif",
              boxShadow: otpComplete ? "0 0 24px rgba(255,94,26,0.40)" : "none",
              marginBottom: 20,
              transition: "all 0.2s",
            }}
          >
            {otpComplete ? "Verify OTP" : `Enter ${DIGIT_COUNT - digits.filter(d => d).length} more digit${DIGIT_COUNT - digits.filter(d => d).length !== 1 ? "s" : ""}`}
          </button>
        )}

        {/* Loading spinner */}
        {loading && (
          <div style={{
            textAlign: "center", padding: "14px 0 20px",
            fontSize: 13, color: "rgba(255,255,255,0.45)",
          }}>
            Verifying…
          </div>
        )}

        {/* Resend */}
        <div style={{ textAlign: "center" }}>
          {cooldown > 0 ? (
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.30)", margin: 0 }}>
              Resend OTP in <strong style={{ color: "rgba(255,255,255,0.55)" }}>{cooldown}s</strong>
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 700, color: "#FF5E1A",
                textDecoration: "underline", textUnderlineOffset: 3,
              }}
            >
              Resend OTP
            </button>
          )}
        </div>

        {/* Help */}
        <p style={{
          textAlign: "center", fontSize: 11,
          color: "rgba(255,255,255,0.20)", marginTop: 24,
        }}>
          Wrong number?{" "}
          <button
            type="button"
            onClick={() => router.replace("/auth/phone")}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 11, color: "rgba(255,255,255,0.40)",
              textDecoration: "underline", textUnderlineOffset: 3, padding: 0,
            }}
          >
            Change number
          </button>
        </p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
