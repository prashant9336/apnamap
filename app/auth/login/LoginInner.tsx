"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchParams = useSearchParams();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);
  setError("");

  try {
    const redirect = searchParams.get("redirect");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // 🔥 THIS LINE FIXES YOUR ISSUE
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData?.session) {
      setError("Session not created");
      setLoading(false);
      return;
    }

    const user = sessionData.session.user;

    // Always read role from profiles table — user_metadata is user-settable
    const { data: profileRow } = await supabase
      .from("profiles").select("role").eq("id", user.id).maybeSingle();
    const role = profileRow?.role ?? "customer";

    let destination = "/explore";

    if (redirect) {
      destination = redirect;
    } else if (role === "vendor") {
      destination = "/my-shop";
    } else if (role === "admin") {
      destination = "/admin";
    }

    setLoading(false);

    // 🔥 HARD RELOAD (important)
    window.location.href = destination;

  } catch (err: any) {
    setError(err?.message || "Something went wrong during login.");
    setLoading(false);
  }
}

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 pt-safe pb-safe"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">📍</div>
          <h1
            className="font-syne text-2xl font-black"
            style={{ letterSpacing: "-0.4px" }}
          >
            Welcome back
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--t2)" }}>
            Sign in to your ApnaMap account
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: "var(--t2)" }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--t1)",
              }}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: "var(--t2)" }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--t1)",
              }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p
              className="text-xs px-3 py-2 rounded-lg"
              style={{
                background: "rgba(239,68,68,0.1)",
                color: "#f87171",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-white text-sm"
            style={{
              background: loading
                ? "rgba(255,94,26,0.5)"
                : "var(--accent)",
              boxShadow: loading
                ? "none"
                : "0 0 24px rgba(255,94,26,0.35)",
            }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: "var(--t2)" }}>
          No account?{" "}
          <Link
            href="/auth/signup"
            className="font-semibold"
            style={{ color: "var(--accent)" }}
          >
            Sign up free
          </Link>
        </p>

        <p className="text-center text-sm mt-2" style={{ color: "var(--t2)" }}>
          <Link href="/explore" style={{ color: "var(--t3)" }}>
            Continue without account →
          </Link>
        </p>
      </div>
    </div>
  );
}