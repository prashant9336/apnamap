"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [role,     setRole]     = useState<"customer"|"vendor">("customer");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [done,     setDone]     = useState(false);
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
        <div style={{ fontSize:48, marginBottom:16 }}>📧</div>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:900, color:"#F2F5FF", marginBottom:8 }}>Check your email</h2>
        <p style={{ fontSize:13, color:"rgba(255,255,255,0.45)", lineHeight:1.7, marginBottom:24 }}>
          We sent a confirmation link to <strong style={{ color:"#F2F5FF" }}>{email}</strong>. Click it to activate your account.
        </p>
        <Link href="/auth/login" style={{ display:"inline-block", padding:"12px 24px", borderRadius:100, background:"#FF5E1A", color:"#fff", fontSize:13, fontWeight:700, textDecoration:"none" }}>
          Go to Login →
        </Link>
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
