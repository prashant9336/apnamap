"use client";

import { useState } from "react";

export default function UnlockPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/unlock", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();

    if (res.ok) {
      window.location.href = "/";
    } else {
      setError(data.message || "Wrong password");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl">
        <h1 className="text-2xl font-bold mb-2">ApnaMap Private Access</h1>
        <p className="text-sm text-white/70 mb-6">
          Enter password to access the site.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter access password"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 outline-none"
          />

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white text-black py-3 font-semibold"
          >
            {loading ? "Checking..." : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
}