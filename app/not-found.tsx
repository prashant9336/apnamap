/**
 * app/not-found.tsx — Branded 404 page for ApnaMap.
 * Rendered when notFound() is called or an unmatched route is hit.
 * Server component — no "use client" needed.
 */

import Link from "next/link";

export const metadata = {
  title: "Page Not Found | ApnaMap",
};

export default function NotFound() {
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

      <p
        className="font-syne font-black"
        style={{ fontSize: 56, color: "rgba(255,255,255,0.08)", lineHeight: 1, marginBottom: 8 }}
      >
        404
      </p>
      <h1
        className="font-syne font-black text-2xl mb-3"
        style={{ color: "#EDEEF5", letterSpacing: "-0.4px" }}
      >
        Page not found
      </h1>
      <p
        className="text-sm mb-8"
        style={{ color: "rgba(255,255,255,0.42)", maxWidth: 280, lineHeight: 1.65 }}
      >
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>

      <div className="flex flex-col gap-2.5 w-full" style={{ maxWidth: 280 }}>
        <Link
          href="/explore"
          className="w-full py-3 rounded-xl font-bold text-white text-sm text-center"
          style={{ background: "#FF5E1A", boxShadow: "0 0 20px rgba(255,94,26,0.30)" }}
        >
          🚶 Walk My City
        </Link>
        <Link
          href="/offers"
          className="w-full py-3 rounded-xl font-semibold text-sm text-center"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.65)",
          }}
        >
          🎯 Browse Offers
        </Link>
      </div>
    </div>
  );
}
