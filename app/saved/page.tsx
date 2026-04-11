"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/client";

export default function SavedPage() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [authed,    setAuthed]    = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setAuthed(false); setLoading(false); return; }
      try {
        const r = await fetch("/api/favorites", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (r.status === 401) { setAuthed(false); setLoading(false); return; }
        const d = await r.json();
        setFavorites(d.favorites ?? []);
      } catch {
        // network error — stay authed, just show empty
      } finally {
        setLoading(false);
      }
    });
  }, []);

  async function unsave(fav: any) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const body: Record<string, string> = {};
    if (fav.shop?.id)     body.shop_id     = fav.shop.id;
    if (fav.offer?.id)    body.offer_id    = fav.offer.id;
    if (fav.locality?.id) body.locality_id = fav.locality.id;
    const r = await fetch("/api/favorites", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body:    JSON.stringify(body),
    });
    if (r.ok) setFavorites(f => f.filter(x => x.id !== fav.id));
  }

  return (
    <AppShell activeTab="saved">
      <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
        <div className="flex-shrink-0 px-4 pt-4 pb-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <h1 className="font-syne font-black text-xl" style={{ letterSpacing: "-0.4px" }}>❤️ Saved</h1>
        </div>

        <div className="flex-1 overflow-y-scroll scroll-none px-4 py-3">
          {!authed && (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🔒</div>
              <p className="font-semibold mb-1">Login to save shops & offers</p>
              <p className="text-sm mb-6" style={{ color: "var(--t2)" }}>Your saved items sync across devices</p>
              <Link href="/auth/login" className="px-6 py-2.5 rounded-full font-bold text-white text-sm"
                style={{ background: "var(--accent)" }}>Login / Sign up</Link>
            </div>
          )}

          {authed && loading && [1,2,3].map(i => <div key={i} className="h-20 rounded-2xl shimmer mb-3" />)}

          {authed && !loading && favorites.length === 0 && (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">💔</div>
              <p className="font-semibold mb-1">Nothing saved yet</p>
              <p className="text-sm mb-6" style={{ color: "var(--t2)" }}>Tap ❤️ on any shop, offer, or locality</p>
              <Link href="/explore" className="px-6 py-2.5 rounded-full font-bold text-white text-sm"
                style={{ background: "var(--accent)" }}>Start exploring →</Link>
            </div>
          )}

          {authed && !loading && favorites.map((fav) => {
            const shop     = fav.shop;
            const offer    = fav.offer;
            const locality = fav.locality;

            if (shop) return (
              <div key={fav.id} className="flex items-center gap-3 px-3.5 py-3 rounded-2xl mb-3"
                style={{ background: "rgba(255,255,255,0.034)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <Link href={`/shop/${shop.slug}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.06)" }}>
                    {shop.category?.icon ?? "🏪"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-syne font-bold text-sm truncate">{shop.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>
                      ★ {shop.avg_rating} · {shop.locality?.name}
                    </p>
                  </div>
                </Link>
                <button onClick={() => unsave(fav)} className="text-xl flex-shrink-0" title="Unsave">❤️</button>
              </div>
            );

            if (offer) return (
              <div key={fav.id} className="flex items-center gap-3 px-3.5 py-3 rounded-2xl mb-3"
                style={{ background: "rgba(255,94,26,0.06)", border: "1px solid rgba(255,94,26,0.16)" }}>
                <Link href={`/shop/${offer.shop?.slug}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl flex-shrink-0">🎯</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate" style={{ color: "var(--accent)" }}>{offer.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>{offer.shop?.name}</p>
                  </div>
                </Link>
                <button onClick={() => unsave(fav)} className="text-xl flex-shrink-0" title="Unsave">❤️</button>
              </div>
            );

            if (locality) return (
              <div key={fav.id} className="flex items-center gap-3 px-3.5 py-3 rounded-2xl mb-3"
                style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.16)" }}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl flex-shrink-0">📍</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{locality.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>Saved locality</p>
                  </div>
                </div>
                <button onClick={() => unsave(fav)} className="text-xl flex-shrink-0" title="Unsave">❤️</button>
              </div>
            );

            return null;
          })}
        </div>
      </div>
    </AppShell>
  );
}
