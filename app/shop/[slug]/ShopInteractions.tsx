"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  const router          = useRouter();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // View tracking — once per session per shop
    const key = `view_${shopId}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      fetch("/api/analytics", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ shop_id: shopId, event_type: "view" }),
      }).catch(() => {});
    }

    // Initial save state (cookies sent automatically — same origin)
    fetch(`/api/favorites?shop_id=${shopId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.saved !== undefined) setSaved(d.saved); })
      .catch(() => {});
  }, [shopId]);

  async function toggleSave() {
    const r = await fetch("/api/favorites", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ shop_id: shopId }),
    });
    if (r.status === 401) {
      router.push(`/auth/login?redirect=/shop/${slug}`);
      return;
    }
    if (r.ok) {
      const d = await r.json();
      setSaved(d.saved);
    }
  }

  return (
    <div className="sticky top-0 z-50 flex items-center gap-3 px-4 py-3"
      style={{ background: "rgba(5,7,12,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingTop: "calc(12px + env(safe-area-inset-top, 0px))" }}>
      <button onClick={() => router.back()} className="text-xl leading-none">←</button>
      <span className="font-syne font-bold text-base flex-1 truncate">{shopName}</span>
      <button onClick={toggleSave} className="text-xl leading-none">{saved ? "❤️" : "🤍"}</button>
    </div>
  );
}

/* ── ShopActionButtons ───────────────────────────────────────────────
 * Call / WhatsApp / Directions buttons.
 * Fires analytics event then opens the native intent.
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
          className="py-3 rounded-xl text-sm font-bold transition-all"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--t1)" }}>
          {b.label}
        </button>
      ))}
    </div>
  );
}
