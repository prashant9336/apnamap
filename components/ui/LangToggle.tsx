"use client";

import { useI18n } from "@/lib/i18n/context";

/**
 * Compact EN / हिं toggle pill.
 * Drop anywhere — it reads + updates the global i18n context.
 */
export default function LangToggle() {
  const { lang, setLang } = useI18n();

  return (
    <div style={{
      display: "inline-flex", borderRadius: 100,
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.10)",
      overflow: "hidden",
    }}>
      {(["en", "hi"] as const).map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          style={{
            padding: "5px 11px",
            border: "none",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: 700,
            fontFamily: l === "hi" ? "system-ui, sans-serif" : "'DM Sans', sans-serif",
            transition: "background 0.15s, color 0.15s",
            background: lang === l ? "#FF5E1A" : "transparent",
            color: lang === l ? "#fff" : "rgba(255,255,255,0.38)",
          }}
        >
          {l === "en" ? "EN" : "हिं"}
        </button>
      ))}
    </div>
  );
}
