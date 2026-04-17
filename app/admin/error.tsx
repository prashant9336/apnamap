"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Admin] error:", error.digest ?? error.message);
  }, [error]);

  return (
    <div style={{ minHeight: "100dvh", background: "#05070C", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 18 }}>⚠️</div>
      <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 900, color: "#F2F5FF", letterSpacing: "-0.3px", marginBottom: 8 }}>Admin Error</h2>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.40)", maxWidth: 280, textAlign: "center", lineHeight: 1.6, marginBottom: 24 }}>
        Something went wrong loading the admin panel. Your data is safe.
      </p>
      {error.digest && (
        <p style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.25)", marginBottom: 20 }}>
          ID: {error.digest}
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 }}>
        <button
          onClick={reset}
          style={{ width: "100%", padding: "13px", borderRadius: 12, background: "#FF5E1A", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}
        >
          Try Again
        </button>
        <a
          href="/admin/dashboard"
          style={{ width: "100%", padding: "13px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.55)", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", textDecoration: "none", textAlign: "center" }}
        >
          Reload Dashboard
        </a>
      </div>
    </div>
  );
}
