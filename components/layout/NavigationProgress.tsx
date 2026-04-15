"use client";
/**
 * NavigationProgress
 *
 * A thin accent-coloured bar that appears at the very top of the screen
 * during Next.js App Router navigations. Uses the experimental
 * `useRouter` navigation events via window events that Next.js fires.
 *
 * No external dependencies — pure CSS animation.
 */
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function NavigationProgress() {
  const pathname      = usePathname();
  const searchParams  = useSearchParams();
  const [active, setActive]   = useState(false);
  const [width,  setWidth]    = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef   = useRef<number | null>(null);

  // Track previous location — when it changes, navigation completed
  const prevRef = useRef(`${pathname}${searchParams}`);

  useEffect(() => {
    const current = `${pathname}${searchParams}`;
    if (current !== prevRef.current) {
      // Navigation completed — jump to 100% then fade out
      setWidth(100);
      timerRef.current = setTimeout(() => {
        setActive(false);
        setWidth(0);
      }, 300);
      prevRef.current = current;
    }
  }, [pathname, searchParams]);

  // Listen for link clicks to start the bar
  useEffect(() => {
    function onLinkClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("mailto") || href.startsWith("tel")) return;
      if (target.getAttribute("target") === "_blank") return;

      // Start the progress bar
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current)   cancelAnimationFrame(rafRef.current);
      setActive(true);
      setWidth(0);

      // Animate to ~80% — never completes until navigation finishes
      let w = 0;
      const tick = () => {
        w = w < 30 ? w + 8 : w < 60 ? w + 3 : w < 80 ? w + 0.8 : w;
        if (w < 80) { setWidth(w); rafRef.current = requestAnimationFrame(tick); }
        else setWidth(80);
      };
      rafRef.current = requestAnimationFrame(tick);
    }

    document.addEventListener("click", onLinkClick);
    return () => {
      document.removeEventListener("click", onLinkClick);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current)   cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!active && width === 0) return null;

  return (
    <div
      style={{
        position:        "fixed",
        top:             0,
        left:            0,
        height:          2,
        width:           `${width}%`,
        background:      "var(--accent, #FF5E1A)",
        boxShadow:       "0 0 8px rgba(255,94,26,0.7)",
        zIndex:          9999,
        transition:      active ? "width 0.1s linear" : "width 0.25s ease, opacity 0.3s ease",
        opacity:         active ? 1 : 0,
        pointerEvents:   "none",
        borderRadius:    "0 2px 2px 0",
      }}
    />
  );
}
