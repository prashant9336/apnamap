"use client";

/**
 * app/error.tsx — Next.js App Router segment-level error boundary.
 *
 * Catches unhandled errors in any page/layout within the same segment.
 * The root layout (nav, app shell) stays visible; only the page content
 * is replaced with this fallback.
 *
 * Props injected by Next.js:
 *   error — the thrown Error (includes .digest for server errors)
 *   reset — call this to re-render the segment (retry without a full reload)
 */

import { useEffect } from "react";
import Link from "next/link";

export default function SegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to Sentry / console; digest links to server log
    console.error("[ApnaMap] segment error:", error.digest ?? error.message);
  }, [error]);

  return (
    <div
      className="flex flex-col items-center justify-center px-6 text-center"
      style={{ minHeight: "60vh", background: "var(--bg)" }}
    >
      {/* Brand icon */}
      <div
        style={{
          width: 52, height: 52, borderRadius: 14,
          background: "rgba(239,68,68,0.12)",
          border: "1px solid rgba(239,68,68,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, marginBottom: 18,
        }}
      >
        ⚠️
      </div>

      <h2
        className="font-syne font-black text-xl mb-2"
        style={{ color: "var(--t1)", letterSpacing: "-0.3px" }}
      >
        Something went wrong
      </h2>
      <p className="text-sm mb-6" style={{ color: "var(--t2)", maxWidth: 280, lineHeight: 1.6 }}>
        This page ran into an unexpected error. Your data is safe.
      </p>

      <div className="flex flex-col gap-2.5 w-full" style={{ maxWidth: 280 }}>
        <button
          onClick={reset}
          className="w-full py-3 rounded-xl font-bold text-white text-sm"
          style={{ background: "var(--accent)", boxShadow: "0 0 20px rgba(255,94,26,0.25)" }}
        >
          Try Again
        </button>
        <Link
          href="/explore"
          className="w-full py-3 rounded-xl font-semibold text-sm text-center"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "var(--t2)",
          }}
        >
          Go to Home
        </Link>
      </div>

      {error.digest && (
        <p className="mt-5 text-[10px] font-mono" style={{ color: "var(--t3)" }}>
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}
