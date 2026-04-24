"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/* ── Style tokens ───────────────────────────────────────────────────────── */
const CARD: React.CSSProperties = { background: "rgba(255,255,255,0.034)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 16 };
const INP:  React.CSSProperties = { width: "100%", padding: "11px 13px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#F2F5FF", fontSize: 14, outline: "none", fontFamily: "'DM Sans',sans-serif", boxSizing: "border-box" };
const LBL: React.CSSProperties  = { display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.38)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 };

/* ── Date helpers ───────────────────────────────────────────────────────── */
function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function today()     { return toYMD(new Date()); }
function yesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return toYMD(d); }
function daysBack(n: number) { const d = new Date(); d.setDate(d.getDate() - (n - 1)); return toYMD(d); }

const QUICK_FILTERS = [
  { label: "Today",       from: () => today(),      to: () => today() },
  { label: "Yesterday",   from: () => yesterday(),  to: () => yesterday() },
  { label: "Last 7 days", from: () => daysBack(7),  to: () => today() },
  { label: "Last 30 days",from: () => daysBack(30), to: () => today() },
];

/* ── Component ──────────────────────────────────────────────────────────── */
export default function ExportPage() {
  const [from,         setFrom]         = useState(today);
  const [to,           setTo]           = useState(today);
  const [approvedOnly, setApprovedOnly] = useState(false);
  const [count,        setCount]        = useState<number | null>(null);
  const [counting,     setCounting]     = useState(false);
  const [downloading,  setDownloading]  = useState<"csv" | "vcf" | null>(null);
  const [error,        setError]        = useState("");
  const [token,        setToken]        = useState("");

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token ?? "");
    });
  }, []);

  /* ── Count contacts matching current filters ── */
  const refreshCount = useCallback(async (f: string, t: string, approved: boolean) => {
    if (!f || !t) return;
    setCounting(true);
    setCount(null);
    try {
      const qs = new URLSearchParams({ from: f, to: t, count_only: "true", ...(approved ? { approved_only: "true" } : {}) });
      const res = await fetch(`/api/admin/export/contacts?${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const d = await res.json();
      setCount(d.count ?? 0);
    } catch { setCount(null); }
    setCounting(false);
  }, [token]);

  useEffect(() => {
    refreshCount(from, to, approvedOnly);
  }, [from, to, approvedOnly, refreshCount]);

  /* ── Download ── */
  async function download(format: "csv" | "vcf") {
    setError("");
    setDownloading(format);
    try {
      const qs = new URLSearchParams({
        from, to, format,
        ...(approvedOnly ? { approved_only: "true" } : {}),
      });
      const res = await fetch(`/api/admin/export/contacts?${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Export failed");
        setDownloading(null);
        return;
      }

      const blob     = await res.blob();
      const cd       = res.headers.get("Content-Disposition") ?? "";
      const match    = cd.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `apnamap-contacts.${format}`;

      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message ?? "Download failed");
    }
    setDownloading(null);
  }

  /* ── Quick filter setter ── */
  function applyQuick(f: () => string, t: () => string) {
    const fv = f(); const tv = t();
    setFrom(fv); setTo(tv);
  }

  const dateLabel = from === to
    ? new Date(from + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : `${new Date(from + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${new Date(to + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div style={{ minHeight: "100dvh", background: "#05070C", paddingBottom: 48 }}>

      {/* ── Header ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(5,7,12,0.97)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "12px 16px", paddingTop: "calc(12px + env(safe-area-inset-top,0px))", display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/admin/dashboard" style={{ fontSize: 20, color: "var(--t2)", textDecoration: "none" }}>←</Link>
        <span className="font-syne" style={{ fontWeight: 900, fontSize: 15, flex: 1, color: "#F2F5FF" }}>Export Contacts</span>
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* ── Quick filters ── */}
        <div>
          <p style={LBL}>Quick select</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {QUICK_FILTERS.map(q => {
              const isActive = from === q.from() && to === q.to();
              return (
                <button key={q.label} onClick={() => applyQuick(q.from, q.to)}
                  style={{ padding: "8px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", background: isActive ? "#FF5E1A" : "rgba(255,255,255,0.06)", color: isActive ? "#fff" : "rgba(255,255,255,0.55)", border: isActive ? "none" : "1px solid rgba(255,255,255,0.10)", transition: "all 0.15s" }}>
                  {q.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Date range ── */}
        <div style={CARD}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={LBL}>From</label>
              <input type="date" value={from} max={to}
                onChange={e => setFrom(e.target.value)}
                style={{ ...INP, colorScheme: "dark" }} />
            </div>
            <div>
              <label style={LBL}>To</label>
              <input type="date" value={to} min={from} max={today()}
                onChange={e => setTo(e.target.value)}
                style={{ ...INP, colorScheme: "dark" }} />
            </div>
          </div>
        </div>

        {/* ── Filter options ── */}
        <div style={CARD}>
          <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <div onClick={() => setApprovedOnly(v => !v)}
              style={{ width: 20, height: 20, borderRadius: 6, border: approvedOnly ? "none" : "1px solid rgba(255,255,255,0.22)", background: approvedOnly ? "#FF5E1A" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
              {approvedOnly && <span style={{ color: "#fff", fontSize: 12, fontWeight: 900 }}>✓</span>}
            </div>
            <div>
              <p style={{ fontSize: 13, color: "#F2F5FF", fontWeight: 600 }}>Approved shops only</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                Exclude pending and rejected shops from the export
              </p>
            </div>
          </label>
        </div>

        {/* ── Contact count preview ── */}
        <div style={{ ...CARD, display: "flex", alignItems: "center", gap: 12, borderColor: count && count > 0 ? "rgba(31,187,90,0.30)" : "rgba(255,255,255,0.07)" }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", textTransform: "uppercase" as const, letterSpacing: "0.8px", marginBottom: 4 }}>Matching contacts</p>
            {counting ? (
              <p style={{ fontSize: 22, fontWeight: 900, color: "rgba(255,255,255,0.25)", fontFamily: "'Syne',sans-serif" }}>…</p>
            ) : (
              <p style={{ fontSize: 28, fontWeight: 900, color: count ? "#1FBB5A" : "rgba(255,255,255,0.25)", fontFamily: "'Syne',sans-serif" }}>
                {count ?? "—"}
              </p>
            )}
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{dateLabel}</p>
          </div>
          {count !== null && count > 0 && (
            <div style={{ fontSize: 28 }}>📋</div>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ padding: "10px 13px", borderRadius: 12, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)", color: "#F87171", fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* ── Download buttons ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => download("vcf")}
            disabled={!count || downloading !== null}
            style={{ width: "100%", padding: "15px", borderRadius: 14, background: !count || downloading !== null ? "rgba(31,187,90,0.20)" : "#1FBB5A", color: "#fff", border: "none", cursor: !count || downloading !== null ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", transition: "all 0.15s", opacity: !count ? 0.5 : 1 }}>
            {downloading === "vcf" ? "Preparing…" : `📱 Download VCF (${count ?? 0} contacts)`}
          </button>

          <button onClick={() => download("csv")}
            disabled={!count || downloading !== null}
            style={{ width: "100%", padding: "14px", borderRadius: 14, background: "rgba(255,255,255,0.06)", color: !count ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.10)", cursor: !count || downloading !== null ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>
            {downloading === "csv" ? "Preparing…" : "📄 Download CSV"}
          </button>
        </div>

        {/* ── Today shortcut card ── */}
        <div style={{ ...CARD, background: "rgba(255,94,26,0.05)", borderColor: "rgba(255,94,26,0.20)", display: "flex", alignItems: "center", gap: 12 }}
          onClick={() => { applyQuick(() => today(), () => today()); }}>
          <div style={{ fontSize: 28 }}>🗓</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#FF5E1A" }}>Download Today's Contacts</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginTop: 2 }}>Shops registered today</p>
          </div>
          <span style={{ fontSize: 18, color: "rgba(255,94,26,0.60)" }}>→</span>
        </div>

        {/* ── Format info ── */}
        <div style={{ ...CARD, background: "rgba(255,255,255,0.02)" }}>
          <p style={LBL}>Format reference</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#1FBB5A", marginBottom: 6 }}>VCF (iPhone / Contacts import)</p>
              <pre style={{ fontSize: 10, color: "rgba(255,255,255,0.40)", margin: 0, fontFamily: "monospace", lineHeight: 1.6 }}>{`BEGIN:VCARD\nVERSION:3.0\nFN:APNA - Shop Name\nTEL;TYPE=CELL:+91XXXXXXXXXX\nEND:VCARD`}</pre>
            </div>
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", marginBottom: 6 }}>CSV (spreadsheet)</p>
              <pre style={{ fontSize: 10, color: "rgba(255,255,255,0.40)", margin: 0, fontFamily: "monospace", lineHeight: 1.6 }}>{`Name,Phone\n"APNA - Shop Name","+91XXXXXXXXXX"`}</pre>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
