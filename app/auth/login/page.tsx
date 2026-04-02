"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const router      = useRouter();
  const searchParams = useSearchParams();
  const redirect    = searchParams.get("redirect") || "/explore";
  const sb          = createClient();

  // If already logged in, redirect immediately
  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(redirect);
    });
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const { data, error: err } = await sb.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    const { data: profile } = await sb.from("profiles").select("role").eq("id", data.user.id).single();
    if (profile?.role === "admin")  { router.replace("/admin/dashboard"); return; }
    if (profile?.role === "vendor") { router.replace("/vendor/dashboard"); return; }
    router.replace(redirect);
  }

  const S = {
    pg:    { minHeight:"100vh", display:"flex", flexDirection:"column" as const, alignItems:"center", justifyContent:"center", padding:20, background:"#05070C" },
    card:  { width:"100%", maxWidth:360 },
    input: { width:"100%", padding:"13px 14px", borderRadius:12, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", color:"#F2F5FF", fontSize:15, outline:"none", fontFamily:"'DM Sans',sans-serif", display:"block", marginBottom:12 },
    btn:   { width:"100%", padding:"14px", borderRadius:12, background:loading?"rgba(255,94,26,0.5)":"#FF5E1A", color:"#fff", border:"none", cursor:"pointer", fontSize:15, fontWeight:700, fontFamily:"'DM Sans',sans-serif", boxShadow:loading?"none":"0 0 24px rgba(255,94,26,0.35)" },
    label: { display:"block" as const, fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.40)", textTransform:"uppercase" as const, letterSpacing:"0.8px", marginBottom:6 },
    err:   { padding:"10px 13px", borderRadius:10, background:"rgba(239,68,68,0.10)", border:"1px solid rgba(239,68,68,0.22)", color:"#F87171", fontSize:12, marginBottom:14 },
  };

  return (
    <div style={S.pg}>
      <div style={S.card}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:"#FF5E1A", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, margin:"0 auto 14px", boxShadow:"0 0 24px rgba(255,94,26,0.45)" }}>📍</div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:900, color:"#F2F5FF", letterSpacing:"-0.4px", marginBottom:4 }}>Welcome back</h1>
          <p style={{ fontSize:13, color:"rgba(255,255,255,0.40)" }}>Sign in to your ApnaMap account</p>
        </div>

        <form onSubmit={handleLogin}>
          <label style={S.label}>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com" style={S.input} />
          <label style={S.label}>Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="••••••••" style={{ ...S.input, marginBottom:20 }} />
          {error && <div style={S.err}>{error}</div>}
          <button type="submit" disabled={loading} style={S.btn}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p style={{ textAlign:"center", fontSize:13, marginTop:20, color:"rgba(255,255,255,0.40)" }}>
          No account?{" "}
          <Link href="/auth/signup" style={{ color:"#FF5E1A", fontWeight:600, textDecoration:"none" }}>Sign up free</Link>
        </p>
        <p style={{ textAlign:"center", marginTop:10 }}>
          <Link href="/explore" style={{ fontSize:12, color:"rgba(255,255,255,0.28)", textDecoration:"none" }}>Continue without account →</Link>
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
