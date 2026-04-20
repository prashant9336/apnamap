"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";

export default function SearchPage() {
  const [q,       setQ]       = useState("");
  const [results, setResults] = useState<{ shops: any[]; offers: any[] }>({ shops: [], offers: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (q.length < 2) { setResults({ shops: [], offers: [] }); return; }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const d = await r.json();
      setResults(d);
      setLoading(false);
    }, 250);
    return () => clearTimeout(timerRef.current);
  }, [q]);

  const hasResults = results.shops.length > 0 || results.offers.length > 0;

  return (
    <AppShell activeTab="search">
      <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
        {/* Search bar */}
        <div className="flex-shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <span className="text-lg">🔍</span>
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Shop name, category, offer…"
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--t1)" }} />
            {q && (
              <button onClick={() => setQ("")} className="text-xs" style={{ color: "var(--t3)" }}>✕</button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-scroll scroll-none px-4 py-3">
          {loading && (
            <div className="space-y-2">
              {[1,2,3].map((i) => <div key={i} className="h-14 rounded-xl shimmer" />)}
            </div>
          )}

          {!loading && q.length >= 2 && !hasResults && (
            <div className="text-center py-16" style={{ color: "var(--t2)" }}>
              <div className="text-3xl mb-2">🔍</div>
              <p className="font-semibold">No results for "{q}"</p>
              <p className="text-xs mt-1" style={{ color: "var(--t3)" }}>Try a shop name or category</p>
            </div>
          )}

          {!loading && results.shops.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--t3)" }}>Shops</p>
              <div className="space-y-2">
                {results.shops.map((shop) => (
                  <Link key={shop.id} href={`/shop/${shop.slug}`}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.034)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: "rgba(255,255,255,0.06)" }}>
                      {shop.subcategory?.icon ?? shop.category?.icon ?? "🏪"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{shop.name}</p>
                      <p className="text-xs" style={{ color: "var(--t3)" }}>
                        {shop.category?.name} · {shop.locality?.name}
                      </p>
                    </div>
                    <span className="text-xs" style={{ color: "var(--t3)" }}>›</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {!loading && results.offers.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--t3)" }}>Offers</p>
              <div className="space-y-2">
                {results.offers.map((offer) => (
                  <Link key={offer.id} href={`/shop/${offer.shop?.slug}`}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl"
                    style={{ background: "rgba(255,94,26,0.06)", border: "1px solid rgba(255,94,26,0.16)" }}>
                    <span className="text-xl flex-shrink-0">🎯</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: "var(--accent)" }}>{offer.title}</p>
                      <p className="text-xs" style={{ color: "var(--t3)" }}>{offer.shop?.name}</p>
                    </div>
                    <span className="text-xs" style={{ color: "var(--t3)" }}>›</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {q.length < 2 && (
            <div className="text-center py-16" style={{ color: "var(--t3)" }}>
              <div className="text-4xl mb-3">🏪</div>
              <p className="text-sm">Search for shops, offers, or areas in Prayagraj</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
