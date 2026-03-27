"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import type { Offer } from "@/types";

const TABS = ["All", "Big Deal", "Flash", "Near Me", "Ending Soon"];

export default function OffersPage() {
  const [offers,  setOffers]  = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("All");

  useEffect(() => {
    fetch("/api/offers")
      .then((r) => r.json())
      .then((d) => { setOffers(d.offers ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = offers.filter((o) => {
    if (tab === "Big Deal")    return o.tier === 1;
    if (tab === "Flash")       return o.discount_type === "bogo" || o.discount_type === "free";
    if (tab === "Ending Soon") return o.ends_at && new Date(o.ends_at).getTime() - Date.now() < 86400000 * 3;
    return true;
  });

  return (
    <AppShell activeTab="offers">
      <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg)" }}>
        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-4 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <h1 className="font-syne font-black text-xl mb-3" style={{ letterSpacing: "-0.4px" }}>🎯 Live Offers</h1>
          <div className="flex gap-2 overflow-x-auto scroll-none pb-1">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={tab === t
                  ? { background: "var(--accent)", color: "#fff", boxShadow: "0 0 14px rgba(255,94,26,0.3)" }
                  : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-scroll scroll-none px-4 py-3 space-y-3">
          {loading && [1,2,3,4].map((i) => <div key={i} className="h-28 rounded-2xl shimmer" />)}

          {!loading && filtered.map((offer, i) => (
            <motion.div key={offer.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}>
              <OfferCard offer={offer} />
            </motion.div>
          ))}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-16" style={{ color: "var(--t2)" }}>
              <div className="text-4xl mb-3">🎯</div>
              <p className="font-semibold">No offers in this category</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function OfferCard({ offer }: { offer: Offer }) {
  const shop   = (offer as any).shop;
  const isT1   = offer.tier === 1;
  const ending = offer.ends_at && new Date(offer.ends_at).getTime() - Date.now() < 86400000 * 3;

  return (
    <Link href={`/shop/${shop?.slug ?? "#"}`}
      className="flex gap-3 p-3.5 rounded-2xl relative overflow-hidden"
      style={{
        background: isT1
          ? "linear-gradient(135deg,rgba(255,60,0,0.14),rgba(255,140,0,0.07))"
          : "rgba(255,255,255,0.034)",
        border: `1px solid ${isT1 ? "rgba(255,80,0,0.30)" : "rgba(255,255,255,0.07)"}`,
      }}>
      {/* Icon */}
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
        {(shop as any)?.category?.icon ?? "🏪"}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-syne font-bold text-sm leading-tight line-clamp-2">{offer.title}</h3>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {isT1 && (
              <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded"
                style={{ background: "rgba(255,80,0,0.18)", color: "#FF6830" }}>⭐ BIG DEAL</span>
            )}
            {ending && (
              <span className="text-[8.5px] font-bold" style={{ color: "var(--gold)" }}>⚡ Ending soon</span>
            )}
          </div>
        </div>

        <p className="text-xs mt-1" style={{ color: "var(--t2)" }}>{shop?.name}</p>

        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs font-semibold" style={{ color: "var(--t3)" }}>
            📍 {(shop as any)?.locality?.name}
          </span>
          {offer.coupon_code && (
            <span className="text-[9.5px] font-bold font-mono px-2 py-0.5 rounded"
              style={{ background: "rgba(255,94,26,0.1)", color: "var(--accent)", border: "1px dashed rgba(255,94,26,0.3)" }}>
              {offer.coupon_code}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
