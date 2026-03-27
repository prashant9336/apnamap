"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole]         = useState<"customer" | "vendor">("customer");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState(false);
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, role } },
    });
    if (error) { setError(error.message); setLoading(false); return; }
    setSuccess(true);
    setLoading(false);
  }

  if (success) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 text-center" style={{ background: "var(--bg)" }}>
      <div className="text-5xl mb-4">📧</div>
      <h2 className="font-syne text-xl font-black mb-2">Check your email</h2>
      <p className="text-sm max-w-xs leading-relaxed" style={{ color: "var(--t2)" }}>
        We've sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
      </p>
      <Link href="/auth/login" className="mt-6 px-6 py-2.5 rounded-full text-sm font-bold text-white" style={{ background: "var(--accent)" }}>
        Go to Login
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">📍</div>
          <h1 className="font-syne text-2xl font-black" style={{ letterSpacing: "-0.4px" }}>Join ApnaMap</h1>
          <p className="text-sm mt-1" style={{ color: "var(--t2)" }}>Discover your city, unlock offers</p>
        </div>

        {/* Role toggle */}
        <div className="flex rounded-xl p-1 mb-6" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {(["customer", "vendor"] as const).map((r) => (
            <button key={r} onClick={() => setRole(r)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={role === r
                ? { background: "var(--accent)", color: "#fff", boxShadow: "0 0 14px rgba(255,94,26,0.3)" }
                : { color: "var(--t2)" }}>
              {r === "customer" ? "👤 Customer" : "🏪 Shop Owner"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>Your Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--t1)" }}
              placeholder="Rahul Sharma" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--t1)" }}
              placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--t1)" }}
              placeholder="Min 6 characters" />
          </div>

          {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-white text-sm"
            style={{ background: loading ? "rgba(255,94,26,0.5)" : "var(--accent)", boxShadow: loading ? "none" : "0 0 24px rgba(255,94,26,0.35)" }}>
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: "var(--t2)" }}>
          Have an account?{" "}
          <Link href="/auth/login" className="font-semibold" style={{ color: "var(--accent)" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
