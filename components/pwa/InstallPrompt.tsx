"use client";

/**
 * PWA Install Prompt
 *
 * Android/Chrome: captures beforeinstallprompt, shows a native-feeling
 *   install banner with an Install button that calls deferredPrompt.prompt().
 *
 * iOS/Safari: beforeinstallprompt never fires on iOS, so we detect Safari
 *   and show a one-time "Share → Add to Home Screen" instruction instead.
 *
 * Both banners:
 * - Never appear if the app is already running as a standalone PWA.
 * - Disappear permanently for the session once dismissed.
 * - Hide after appinstalled fires.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Types ──────────────────────────────────────────────────────────── */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/* ── Helpers ────────────────────────────────────────────────────────── */
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  );
}

function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  // Chrome on iOS reports CriOS; we only want Safari
  const isSafari = isIOS && !ua.includes("CriOS") && !ua.includes("FxiOS");
  return isSafari;
}

const SESSION_DISMISSED_KEY = "pwa_install_dismissed";

/* ── Component ──────────────────────────────────────────────────────── */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    // Already a PWA or user dismissed this session — bail immediately
    if (isStandalone()) return;
    if (sessionStorage.getItem(SESSION_DISMISSED_KEY)) return;

    /* Android / Chrome ──────────────────────────── */
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault(); // suppress the mini-infobar
      setDeferred(e as BeforeInstallPromptEvent);
      setShowAndroid(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    /* Installed callback ────────────────────────── */
    const handleInstalled = () => {
      setShowAndroid(false);
      setShowIOS(false);
    };
    window.addEventListener("appinstalled", handleInstalled);

    /* iOS Safari ────────────────────────────────── */
    if (isIOSSafari()) {
      // Small delay so it doesn't flash on first paint
      const t = setTimeout(() => setShowIOS(true), 2500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
        window.removeEventListener("appinstalled", handleInstalled);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  /* Install button handler (Android) */
  async function handleInstall() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      dismiss();
    } else {
      setShowAndroid(false);
    }
    setDeferred(null);
  }

  function dismiss() {
    sessionStorage.setItem(SESSION_DISMISSED_KEY, "1");
    setShowAndroid(false);
    setShowIOS(false);
  }

  /* ── Common banner styles ─────────────────────────────────────────── */
  const bannerBase: React.CSSProperties = {
    position:       "fixed",
    bottom:         82,           // clears the 66px bottom nav + 16px gap
    left:           16,
    right:          16,
    maxWidth:       440,
    margin:         "0 auto",
    background:     "rgba(18,20,26,0.97)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    borderRadius:   18,
    padding:        "14px 16px",
    zIndex:         9998,
    boxShadow:      "0 12px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
  };

  const slideUp = {
    initial:    { y: 80, opacity: 0 },
    animate:    { y: 0,  opacity: 1 },
    exit:       { y: 80, opacity: 0 },
    transition: { type: "spring" as const, stiffness: 320, damping: 32 },
  };

  return (
    <AnimatePresence>

      {/* ── Android / Chrome install banner ─────────────────────────── */}
      {showAndroid && (
        <motion.div key="android" {...slideUp} style={{ ...bannerBase, border: "1px solid rgba(255,94,26,0.35)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Icon */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/api/icon?size=48"
              alt="ApnaMap"
              width={48}
              height={48}
              style={{ borderRadius: 11, flexShrink: 0 }}
            />

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "white", fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>
                Install ApnaMap
              </div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 3 }}>
                Add to home screen for the best experience
              </div>
            </div>

            {/* Install CTA */}
            <button
              onClick={handleInstall}
              style={{
                background:   "#FF5E1A",
                color:        "white",
                border:       "none",
                borderRadius: 10,
                padding:      "9px 15px",
                fontWeight:   700,
                fontSize:     13,
                cursor:       "pointer",
                flexShrink:   0,
                letterSpacing: "0.01em",
              }}
            >
              Install
            </button>

            {/* Dismiss */}
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              style={{
                background:  "transparent",
                border:      "none",
                color:       "rgba(255,255,255,0.3)",
                fontSize:    20,
                cursor:      "pointer",
                padding:     "2px 4px",
                flexShrink:  0,
                lineHeight:  1,
              }}
            >
              ×
            </button>
          </div>
        </motion.div>
      )}

      {/* ── iOS / Safari hint ───────────────────────────────────────── */}
      {showIOS && (
        <motion.div key="ios" {...slideUp} style={{ ...bannerBase, border: "1px solid rgba(255,255,255,0.09)" }}>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/api/icon?size=36"
                alt="ApnaMap"
                width={36}
                height={36}
                style={{ borderRadius: 8, flexShrink: 0 }}
              />
              <div style={{ color: "white", fontWeight: 700, fontSize: 14 }}>
                Install ApnaMap
              </div>
            </div>
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              style={{
                background:  "transparent",
                border:      "none",
                color:       "rgba(255,255,255,0.3)",
                fontSize:    20,
                cursor:      "pointer",
                padding:     "2px 6px",
                lineHeight:  1,
              }}
            >
              ×
            </button>
          </div>

          {/* Instruction */}
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 1.7 }}>
            Open in{" "}
            <strong style={{ color: "rgba(255,255,255,0.85)" }}>Safari</strong>
            {" "}and tap the{" "}
            <span
              style={{
                display:      "inline-flex",
                alignItems:   "center",
                background:   "rgba(255,255,255,0.12)",
                borderRadius: 5,
                padding:      "1px 6px",
                fontSize:     14,
                color:        "#60A5FA",
                fontWeight:   600,
              }}
            >
              Share ⎙
            </span>
            {" "}icon, then tap{" "}
            <strong style={{ color: "rgba(255,255,255,0.85)" }}>Add to Home Screen</strong>
          </div>
        </motion.div>
      )}

    </AnimatePresence>
  );
}
