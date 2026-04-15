"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/* ── ShopHeader ──────────────────────────────────────────────────────
 * Sticky top bar: back navigation, shop name, save toggle.
 * Also fires the view analytics event once per session.
 * ─────────────────────────────────────────────────────────────────── */
interface HeaderProps {
  shopId:   string;
  slug:     string;
  shopName: string;
}

export function ShopHeader({ shopId, slug, shopName }: HeaderProps) {
  const router = useRouter();
  const [saved,  setSaved]  = useState(false);
  const [saving, setSaving] = useState(false);
  const [token,  setToken]  = useState("");

  useEffect(() => {
    const sb = createClient();
    sb.auth.getSession().then(({ data: { session } }) => {
      const tok = session?.access_token ?? "";
      setToken(tok);

      const key = `view_${shopId}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        fetch("/api/analytics", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ shop_id: shopId, event_type: "view" }),
        }).catch(() => {});
      }

      if (tok) {
        fetch(`/api/favorites?shop_id=${shopId}`, { headers: { Authorization: `Bearer ${tok}` } })
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d?.saved !== undefined) setSaved(d.saved); })
          .catch(() => {});
      }
    });
  }, [shopId]);

  async function toggleSave() {
    if (!token) { window.location.href = `/auth/login?redirect=/shop/${slug}`; return; }
    setSaving(true);
    setSaved(prev => !prev);

    const r = await fetch("/api/favorites", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ shop_id: shopId }),
    });

    if (r.status === 401) {
      setSaved(prev => !prev);
      window.location.href = `/auth/login?redirect=/shop/${slug}`;
      setSaving(false);
      return;
    }
    if (r.ok) { const d = await r.json(); setSaved(d.saved); }
    else       { setSaved(prev => !prev); }
    setSaving(false);
  }

  function handleBack() {
    if (window.history.length > 1) router.back();
    else router.push("/explore");
  }

  return (
    <div className="sticky top-0 z-50 flex items-center gap-2 px-3"
      style={{
        background:      "rgba(5,7,12,0.95)",
        backdropFilter:  "blur(20px)",
        borderBottom:    "1px solid rgba(255,255,255,0.06)",
        paddingTop:      "calc(10px + env(safe-area-inset-top, 0px))",
        paddingBottom:   10,
      }}>
      {/* 40×40 tappable back button */}
      <button
        onClick={handleBack}
        aria-label="Go back"
        className="flex items-center justify-center rounded-xl flex-shrink-0"
        style={{ width: 40, height: 40, background: "rgba(255,255,255,0.06)", fontSize: 18, lineHeight: 1 }}>
        ←
      </button>
      <span className="font-syne font-bold text-base flex-1 truncate px-1">{shopName}</span>
      {/* 40×40 tappable save button */}
      <button
        onClick={toggleSave}
        disabled={saving}
        aria-label={saved ? "Remove from saved" : "Save shop"}
        className="flex items-center justify-center rounded-xl flex-shrink-0"
        style={{
          width:      40,
          height:     40,
          background: saved ? "rgba(239,68,68,0.14)" : "rgba(255,255,255,0.06)",
          fontSize:   18,
          lineHeight: 1,
          opacity:    saving ? 0.5 : 1,
          transition: "background 0.18s ease",
        }}>
        {saved ? "❤️" : "🤍"}
      </button>
    </div>
  );
}

/* ── ShopActionButtons ───────────────────────────────────────────────
 * Call / WhatsApp / Directions — taller tap targets, press feedback.
 * ─────────────────────────────────────────────────────────────────── */
interface ActionProps {
  shopId:   string;
  phone:    string | null;
  whatsapp: string | null;
  lat:      number;
  lng:      number;
}

export function ShopActionButtons({ shopId, phone, whatsapp, lat, lng }: ActionProps) {
  function handleAction(type: "call" | "whatsapp" | "direction") {
    fetch("/api/analytics", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ shop_id: shopId, event_type: type }),
    }).catch(() => {});

    if (type === "call"      && phone)    window.location.href = `tel:${phone}`;
    if (type === "whatsapp"  && whatsapp) window.open(`https://wa.me/91${whatsapp}?text=Hi, I found you on ApnaMap!`);
    if (type === "direction")             window.open(`https://maps.google.com/?q=${lat},${lng}`);
  }

  const buttons = [
    { label: "📞 Call",       type: "call"      as const, show: !!phone    },
    { label: "💬 WhatsApp",   type: "whatsapp"  as const, show: !!whatsapp },
    { label: "🧭 Directions", type: "direction" as const, show: true       },
  ].filter(b => b.show);

  return (
    <div className="grid gap-2.5 mb-6" style={{ gridTemplateColumns: `repeat(${buttons.length}, 1fr)` }}>
      {buttons.map(b => (
        <button key={b.type} onClick={() => handleAction(b.type)}
          className="rounded-xl text-sm font-bold"
          style={{
            padding:     "14px 8px",
            background:  "rgba(255,255,255,0.06)",
            border:      "1px solid rgba(255,255,255,0.10)",
            color:       "var(--t1)",
          }}>
          {b.label}
        </button>
      ))}
    </div>
  );
}

/* ── CouponCopyButton ────────────────────────────────────────────────
 * Client island for coupon copy — shows "Copied!" feedback on tap.
 * ─────────────────────────────────────────────────────────────────── */
export function CouponCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  }

  return (
    <button
      onClick={handleCopy}
      className="font-mono text-xs px-3 py-1.5 rounded-lg font-bold"
      style={{
        background:  copied ? "rgba(31,187,90,0.15)" : "rgba(255,94,26,0.12)",
        color:       copied ? "var(--green)"          : "var(--accent)",
        border:      `1px dashed ${copied ? "rgba(31,187,90,0.35)" : "rgba(255,94,26,0.3)"}`,
        transition:  "background 0.2s, color 0.2s, border-color 0.2s",
        minWidth:    72,
        textAlign:   "center",
      }}>
      {copied ? "✓ Copied!" : `${code}`}
    </button>
  );
}
