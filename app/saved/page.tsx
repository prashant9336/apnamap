"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";

export default function SavedPage() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [authed,    setAuthed]     = useState(true);

  useEffect(() => {
    fetch("/api/favorites")
      .then(async (r) => {
        if (r.status === 401) { setAuthed(false); setLoading(false); return; }
        const d = await r.json();
        setFavorites(d.favorites ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <AppShell activeTab="saved">
      <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
        <div className="flex-shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
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

          {authed && loading && [1,2,3].map((i) => <div key={i} className="h-20 rounded-2xl shimmer mb-3" />)}

          {authed && !loading && favorites.length === 0 && (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">💔</div>
              <p className="font-semibold mb-1">Nothing saved yet</p>
              <p className="text-sm mb-6" style={{ color: "var(--t2)" }}>Tap ❤️ on any shop or offer to save it here</p>
              <Link href="/explore" className="px-6 py-2.5 rounded-full font-bold text-white text-sm"
                style={{ background: "var(--accent)" }}>Start exploring →</Link>
            </div>
          )}

          {authed && !loading && favorites.map((fav) => {
            const shop  = fav.shop;
            const offer = fav.offer;
            if (shop) return (
              <Link key={fav.id} href={`/shop/${shop.slug}`}
                className="flex items-center gap-3 px-3.5 py-3 rounded-2xl mb-3"
                style={{ background: "rgba(255,255,255,0.034)", border: "1px solid rgba(255,255,255,0.07)" }}>
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
                <span className="text-red-400">❤️</span>
              </Link>
            );
            if (offer) return (
              <Link key={fav.id} href={`/shop/${offer.shop?.slug}`}
                className="flex items-center gap-3 px-3.5 py-3 rounded-2xl mb-3"
                style={{ background: "rgba(255,94,26,0.06)", border: "1px solid rgba(255,94,26,0.16)" }}>
                <span className="text-2xl flex-shrink-0">🎯</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate" style={{ color: "var(--accent)" }}>{offer.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>{offer.shop?.name}</p>
                </div>
                <span className="text-red-400">❤️</span>
              </Link>
            );
            return null;
          })}
        </div>
      </div>
    </AppShell>
  );
}
