"use client";

/**
 * app/offline/page.tsx — PWA offline fallback page.
 *
 * Served by the service worker when the user is offline and the
 * requested page is not in the Workbox cache.
 *
 * Configured in next.config.js:
 *   withPWA({ fallbacks: { document: "/offline" } })
 */

import { useEffect, useState } from "react";
import Link from "next/link";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // If back online, show a "Tap to reload" prompt
  if (isOnline) {
    return (
      <div
        className="min-h-dvh flex flex-col items-center justify-center px-6 text-center"
        style={{ background: "#05070C" }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 className="font-syne font-black text-xl mb-2" style={{ color: "#EDEEF5" }}>
          You&apos;re back online!
        </h2>
        <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.42)" }}>
          Your connection has been restored.
        </p>
        <button
          onClick={() => window.location.href = "/explore"}
          className="px-6 py-3 rounded-xl font-bold text-white text-sm"
          style={{ background: "#FF5E1A", boxShadow: "0 0 20px rgba(255,94,26,0.30)" }}
        >
          Continue to ApnaMap
        </button>
      </div>
    );
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-6 text-center"
      style={{ background: "#05070C" }}
    >
      {/* Logo */}
      <div
        style={{
          width: 52, height: 52, borderRadius: 14,
          background: "#FF5E1A",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, marginBottom: 20,
          boxShadow: "0 0 28px rgba(255,94,26,0.40)",
        }}
      >
        📍
      </div>

      <h1
        className="font-syne font-black text-2xl mb-3"
        style={{ color: "#EDEEF5", letterSpacing: "-0.4px" }}
      >
        You&apos;re offline
      </h1>
      <p
        className="text-sm mb-2"
        style={{ color: "rgba(255,255,255,0.42)", maxWidth: 280, lineHeight: 1.65 }}
      >
        No internet connection. Previously visited pages and offers are still available from cache.
      </p>
      <p
        className="text-sm mb-8"
        style={{ color: "rgba(255,255,255,0.30)", maxWidth: 280, lineHeight: 1.65 }}
      >
        Waiting for connection to restore…
      </p>

      {/* Pulsing indicator */}
      <div
        className="mb-8"
        style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "rgba(255,255,255,0.25)",
          boxShadow: "0 0 0 0 rgba(255,255,255,0.15)",
          animation: "pulse-ring 2s ease-out infinite",
        }}
      />

      <div className="flex flex-col gap-2.5 w-full" style={{ maxWidth: 280 }}>
        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 rounded-xl font-bold text-white text-sm"
          style={{ background: "#FF5E1A", boxShadow: "0 0 20px rgba(255,94,26,0.25)" }}
        >
          Retry
        </button>
        <Link
          href="/explore"
          className="w-full py-3 rounded-xl font-semibold text-sm text-center"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.65)",
          }}
        >
          Go to Home (cached)
        </Link>
      </div>

      <style jsx>{`
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0   rgba(255,255,255,0.20); }
          70%  { box-shadow: 0 0 0 12px rgba(255,255,255,0); }
          100% { box-shadow: 0 0 0 0   rgba(255,255,255,0); }
        }
      `}</style>
    </div>
  );
}
