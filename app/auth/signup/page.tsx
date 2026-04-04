"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/*
 * ─── SMTP SETUP (action required in Supabase dashboard) ─────────────
 * Root cause: Supabase's shared email relay is rate-limited and lands in
 * Gmail Promotions / Spam in production.
 *
 * Fix — use Resend (free tier: 3k emails/mo, 100/day):
 *
 * 1. Create account at resend.com → get API key
 * 2. Supabase Dashboard → Settings → Auth → SMTP Settings
 *    Host:     smtp.resend.com
 *    Port:     465
 *    Username: resend
 *    Password: <your-resend-api-key>
 *    Sender:   ApnaMap <noreply@yourdomain.com>
 * 3. Verify your domain in Resend (add 3 DNS records)
 * 4. Test by signing up with a real email
 *
 * Alternative: Gmail SMTP (less reliable, daily limits)
 *    Host:     smtp.gmail.com
 *    Port:     587
 *    Username: your.gmail@gmail.com
 *    Password: <Gmail App Password — not your main password>
 * ────────────────────────────────────────────────────────────────────
 */

export default function SignupPage() {
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [role,     setRole]     = useState<"customer"|"vendor">("customer");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [done,     setDone]     = useState(false);
  const [resending, setResending] = useState(false);
  const [resent,    setResent]    = useState(false);
  const sb = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError("");
    const { error: err } = await sb.auth.signUp({
      email, password,
      options: { data: { name, role } },
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
    // Allow resend again after 60 s
    setTimeout(() => setResent(false), 60_000);
  }

  const S = {
    pg:    { minHeight:"100vh", display:"flex", flexDirection:"column" as const, alignItems:"center", justifyContent:"center", padding:20, background:"#05070C" },
    card:  { width:"100%", maxWidth:360 },
    input: { width:"100%", padding:"13px 14px", borderRadius:12, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", color:"#F2F5FF", fontSize:15, outline:"none", fontFamily:"'DM Sans',sans-serif", display:"block", marginBottom:12 },
    btn:   (dis:boolean) => ({ width:"100%", padding:"14px", borderRadius:12, background:dis?"rgba(255,94,26,0.5)":"#FF5E1A", color:"#fff", border:"none", cursor:"pointer", fontSize:15, fontWeight:700, fontFamily:"'DM Sans',sans-serif" }),
    label: { display:"block" as const, fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.40)", textTransform:"uppercase" as const, letterSpacing:"0.8px", marginBottom:6 },
    err:   { padding:"10px 13px", borderRadius:10, background:"rgba(239,68,68,0.10)", border:"1px solid rgba(239,68,68,0.22)", color:"#F87171", fontSize:12, marginBottom:14 },
  };

  if (done) return (
    <div style={{ ...S.pg }}>
      <div style={{ ...S.card, textAlign:"center" }}>
        {/* Icon */}
        <div style={{ fontSize:52, marginBottom:16 }}>📧</div>

        <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:900, color:"#F2F5FF", marginBottom:8 }}>
          Check your email
        </h2>
        <p style={{ fontSize:13, color:"rgba(255,255,255,0.50)", lineHeight:1.8, marginBottom:20 }}>
          We sent a confirmation link to{" "}
          <strong style={{ color:"#F2F5FF" }}>{email}</strong>.
          <br />Click it to activate your account.
        </p>

        {/* Spam warning — the most common reason emails don't arrive */}
        <div style={{
          padding: "10px 14px", borderRadius: 10, marginBottom: 20,
          background: "rgba(232,168,0,0.08)",
          border: "1px solid rgba(232,168,0,0.22)",
          textAlign: "left",
        }}>
          <p style={{ fontSize:12, color:"#E8A800", fontWeight:700, margin:"0 0 4px" }}>
            📬 Not seeing it?
          </p>
          <p style={{ fontSize:12, color:"rgba(255,255,255,0.50)", margin:0, lineHeight:1.6 }}>
            Check your <strong style={{ color:"rgba(255,255,255,0.70)" }}>Spam</strong>,{" "}
            <strong style={{ color:"rgba(255,255,255,0.70)" }}>Promotions</strong>, or{" "}
            <strong style={{ color:"rgba(255,255,255,0.70)" }}>Updates</strong> folder.
            Gmail often filters new senders there.
          </p>
        </div>

        {/* Resend button */}
        <button
          onClick={handleResend}
          disabled={resending || resent}
          style={{
            width: "100%", padding: "12px", borderRadius: 12, marginBottom: 12,
            background: resent ? "rgba(31,187,90,0.12)" : "rgba(255,255,255,0.06)",
            border: resent ? "1px solid rgba(31,187,90,0.25)" : "1px solid rgba(255,255,255,0.10)",
            color: resent ? "#1FBB5A" : "rgba(255,255,255,0.55)",
            fontSize: 13, fontWeight: 700, cursor: resent ? "default" : "pointer",
          }}
        >
          {resending ? "Sending…" : resent ? "✓ Email resent!" : "Resend confirmation email"}
        </button>

        <Link href="/auth/login" style={{
          display:"block", padding:"13px", borderRadius:12,
          background:"#FF5E1A", color:"#fff",
          fontSize:13, fontWeight:700, textDecoration:"none",
          boxShadow:"0 0 24px rgba(255,94,26,0.35)",
        }}>
          Go to Login →
        </Link>

        <p style={{ fontSize:11, color:"rgba(255,255,255,0.22)", marginTop:16, lineHeight:1.6 }}>
          Wrong email?{" "}
          <button
            onClick={() => { setDone(false); setEmail(""); setResent(false); }}
            style={{ background:"none", border:"none", color:"rgba(255,255,255,0.40)", fontSize:11, cursor:"pointer", textDecoration:"underline", padding:0 }}
          >
            Start over
          </button>
        </p>
      </div>
    </div>
  );

  return (
    <div style={S.pg}>
      <div style={S.card}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:"#FF5E1A", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, margin:"0 auto 14px", boxShadow:"0 0 24px rgba(255,94,26,0.45)" }}>📍</div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:900, color:"#F2F5FF", letterSpacing:"-0.4px", marginBottom:4 }}>Join ApnaMap</h1>
          <p style={{ fontSize:13, color:"rgba(255,255,255,0.40)" }}>Discover your city, unlock offers</p>
        </div>

        {/* Role toggle */}
        <div style={{ display:"flex", borderRadius:12, padding:4, background:"rgba(255,255,255,0.06)", marginBottom:20 }}>
          {(["customer","vendor"] as const).map(r => (
            <button key={r} onClick={() => setRole(r)} style={{ flex:1, padding:"10px", borderRadius:9, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif", transition:"all .2s",
              background: role===r ? "#FF5E1A" : "transparent",
              color: role===r ? "#fff" : "rgba(255,255,255,0.45)" }}>
              {r==="customer" ? "👤 Customer" : "🏪 Shop Owner"}
            </button>
          ))}
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
