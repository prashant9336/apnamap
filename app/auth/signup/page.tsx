"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const S = {
  pg:    { minHeight:"100vh", display:"flex", flexDirection:"column" as const, alignItems:"center", justifyContent:"center", padding:"24px 20px", background:"#05070C" },
  card:  { width:"100%", maxWidth:360 },
  input: { width:"100%", padding:"13px 14px", borderRadius:12, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", color:"#F2F5FF", fontSize:15, outline:"none", fontFamily:"'DM Sans',sans-serif", display:"block", marginBottom:12, boxSizing:"border-box" as const },
  btn:   (dis:boolean): React.CSSProperties => ({ width:"100%", padding:"14px", borderRadius:12, background:dis?"rgba(255,94,26,0.5)":"#FF5E1A", color:"#fff", border:"none", cursor:dis?"not-allowed":"pointer", fontSize:15, fontWeight:700, fontFamily:"'DM Sans',sans-serif", boxShadow:dis?"none":"0 0 24px rgba(255,94,26,0.35)" }),
  label: { display:"block" as const, fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.40)", textTransform:"uppercase" as const, letterSpacing:"0.8px", marginBottom:6 },
  err:   { padding:"10px 13px", borderRadius:10, background:"rgba(239,68,68,0.10)", border:"1px solid rgba(239,68,68,0.22)", color:"#F87171", fontSize:12, marginBottom:14 },
};

/* ── Step 1 — Role picker ─────────────────────────────────────── */
function RolePicker({ onCustomer }: { onCustomer: () => void }) {
  return (
    <div style={S.pg}>
      <div style={S.card}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:"#FF5E1A", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, margin:"0 auto 14px", boxShadow:"0 0 28px rgba(255,94,26,0.45)" }}>
            📍
          </div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:900, color:"#F2F5FF", letterSpacing:"-0.4px", marginBottom:6 }}>
            Join ApnaMap
          </h1>
          <p style={{ fontSize:13, color:"rgba(255,255,255,0.40)" }}>
            Who are you signing up as?
          </p>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {/* Customer */}
          <button
            onClick={onCustomer}
            style={{ width:"100%", padding:"18px 16px", borderRadius:14, border:"1.5px solid rgba(255,255,255,0.10)", background:"rgba(255,255,255,0.04)", cursor:"pointer", textAlign:"left" as const, display:"flex", alignItems:"center", gap:14 }}
          >
            <span style={{ fontSize:28, flexShrink:0 }}>👤</span>
            <div>
              <p style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:800, color:"#F2F5FF", margin:"0 0 3px" }}>Customer</p>
              <p style={{ fontSize:12, color:"rgba(255,255,255,0.38)", margin:0 }}>Browse shops, save offers, explore nearby deals</p>
            </div>
          </button>

          {/* Vendor */}
          <button
            onClick={() => { window.location.href = "/vendor/join"; }}
            style={{ width:"100%", padding:"18px 16px", borderRadius:14, border:"1.5px solid rgba(255,94,26,0.35)", background:"rgba(255,94,26,0.07)", cursor:"pointer", textAlign:"left" as const, display:"flex", alignItems:"center", gap:14 }}
          >
            <span style={{ fontSize:28, flexShrink:0 }}>🏪</span>
            <div>
              <p style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:800, color:"#FF5E1A", margin:"0 0 3px" }}>Shop Owner / Vendor</p>
              <p style={{ fontSize:12, color:"rgba(255,255,255,0.38)", margin:0 }}>List your shop, post offers, manage customers</p>
            </div>
          </button>
        </div>

        <p style={{ textAlign:"center", fontSize:13, marginTop:24, color:"rgba(255,255,255,0.40)" }}>
          Already have an account?{" "}
          <Link href="/auth/login" style={{ color:"#FF5E1A", fontWeight:600, textDecoration:"none" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

/* ── Step 2 — Customer signup form ───────────────────────────── */
function CustomerSignupForm({ onBack }: { onBack: () => void }) {
  const [name,      setName]      = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [done,      setDone]      = useState(false);
  const [resending, setResending] = useState(false);
  const [resent,    setResent]    = useState(false);
  const sb = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError("");
    const { error: err } = await sb.auth.signUp({
      email, password,
      options: { data: { name, role: "customer" } },
    });
    if (err) { setError(err.message); setLoading(false); return; }
    setDone(true); setLoading(false);
  }

  async function handleResend() {
    if (resending || resent || !email) return;
    setResending(true);
    await sb.auth.resend({ type: "signup", email });
    setResending(false);
    setResent(true);
    setTimeout(() => setResent(false), 60_000);
  }

  if (done) return (
    <div style={S.pg}>
      <div style={{ ...S.card, textAlign:"center" }}>
        <div style={{ fontSize:52, marginBottom:16 }}>📧</div>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:900, color:"#F2F5FF", marginBottom:8 }}>
          Check your email
        </h2>
        <p style={{ fontSize:13, color:"rgba(255,255,255,0.50)", lineHeight:1.8, marginBottom:20 }}>
          We sent a confirmation link to{" "}
          <strong style={{ color:"#F2F5FF" }}>{email}</strong>.
          <br />Click it to activate your account.
        </p>
        <div style={{ padding:"10px 14px", borderRadius:10, marginBottom:20, background:"rgba(232,168,0,0.08)", border:"1px solid rgba(232,168,0,0.22)", textAlign:"left" }}>
          <p style={{ fontSize:12, color:"#E8A800", fontWeight:700, margin:"0 0 4px" }}>📬 Not seeing it?</p>
          <p style={{ fontSize:12, color:"rgba(255,255,255,0.50)", margin:0, lineHeight:1.6 }}>
            Check your <strong style={{ color:"rgba(255,255,255,0.70)" }}>Spam</strong>,{" "}
            <strong style={{ color:"rgba(255,255,255,0.70)" }}>Promotions</strong>, or{" "}
            <strong style={{ color:"rgba(255,255,255,0.70)" }}>Updates</strong> folder.
          </p>
        </div>
        <button
          onClick={handleResend}
          disabled={resending || resent}
          style={{ width:"100%", padding:"12px", borderRadius:12, marginBottom:12, background:resent?"rgba(31,187,90,0.12)":"rgba(255,255,255,0.06)", border:resent?"1px solid rgba(31,187,90,0.25)":"1px solid rgba(255,255,255,0.10)", color:resent?"#1FBB5A":"rgba(255,255,255,0.55)", fontSize:13, fontWeight:700, cursor:resent?"default":"pointer" }}
        >
          {resending ? "Sending…" : resent ? "✓ Email resent!" : "Resend confirmation email"}
        </button>
        <Link href="/auth/login" style={{ display:"block", padding:"13px", borderRadius:12, background:"#FF5E1A", color:"#fff", fontSize:13, fontWeight:700, textDecoration:"none", boxShadow:"0 0 24px rgba(255,94,26,0.35)" }}>
          Go to Login →
        </Link>
        <p style={{ fontSize:11, color:"rgba(255,255,255,0.22)", marginTop:16 }}>
          Wrong email?{" "}
          <button onClick={() => { setDone(false); setEmail(""); setResent(false); }} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.40)", fontSize:11, cursor:"pointer", textDecoration:"underline", padding:0 }}>
            Start over
          </button>
        </p>
      </div>
    </div>
  );

  return (
    <div style={S.pg}>
      <div style={S.card}>
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.50)", fontSize:22, marginBottom:24, padding:0, display:"flex", alignItems:"center", gap:6 }}>
          ← <span style={{ fontSize:13, fontWeight:600 }}>Back</span>
        </button>

        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:"#FF5E1A", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, margin:"0 auto 14px", boxShadow:"0 0 24px rgba(255,94,26,0.45)" }}>📍</div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:900, color:"#F2F5FF", letterSpacing:"-0.4px", marginBottom:4 }}>Create Account</h1>
          <p style={{ fontSize:13, color:"rgba(255,255,255,0.40)" }}>Join as a customer</p>
        </div>

        <form onSubmit={handleSignup}>
          <label style={S.label}>Your Name</label>
          <input value={name} onChange={e=>setName(e.target.value)} required placeholder="Ramesh Gupta" style={S.input} />
          <label style={S.label}>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com" style={S.input} />
          <label style={S.label}>Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Min 6 characters" style={{ ...S.input, marginBottom:20 }} />
          {error && <div style={S.err}>{error}</div>}
          <button type="submit" disabled={loading} style={S.btn(loading)}>
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p style={{ textAlign:"center", fontSize:13, marginTop:20, color:"rgba(255,255,255,0.40)" }}>
          Have an account?{" "}
          <Link href="/auth/login" style={{ color:"#FF5E1A", fontWeight:600, textDecoration:"none" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

/* ── Page root ───────────────────────────────────────────────── */
export default function SignupPage() {
  const [step, setStep] = useState<"pick" | "customer">("pick");

  if (step === "customer") return <CustomerSignupForm onBack={() => setStep("pick")} />;
  return <RolePicker onCustomer={() => setStep("customer")} />;
}
