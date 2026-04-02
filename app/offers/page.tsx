"use client";
import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useGeo } from "@/hooks/useGeo";
import { formatDistance } from "@/lib/geo/distance";
import type { Offer } from "@/types";

const TABS = ["All", "Big Deal", "Flash", "Near Me", "Ending Soon"];
const NEAR_ME_RADIUS_KM = 5;

export default function OffersPage() {
  const { geo } = useGeo();
  const [allOffers, setAllOffers] = useState<Offer[]>([]);
  const [nearOffers, setNearOffers] = useState<Offer[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [nearLoad,   setNearLoad]   = useState(false);
  const [tab, setTab] = useState("All");

  // Load all offers once
  useEffect(() => {
    fetch("/api/offers")
      .then((r) => r.json())
      .then((d) => { setAllOffers(d.offers ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Load near-me offers when GPS available and tab selected
  useEffect(() => {
    if (tab !== "Near Me" || !geo.lat || !geo.lng) return;
    setNearLoad(true);
    fetch(`/api/shops?lat=${geo.lat}&lng=${geo.lng}&radius=${NEAR_ME_RADIUS_KM * 1000}`)
      .then((r) => r.json())
      .then((d) => {
        const shops: any[] = d.shops ?? [];
        // Flatten offers from nearby shops, attach distance
        const offers: Offer[] = shops.flatMap((s) =>
          (s.offers ?? [])
            .filter((o: any) => o.is_active)
            .map((o: any) => ({
              ...o,
              shop: { ...s, offers: undefined },
              _distance_m: s.distance_m,
            }))
        );
        // Sort by distance then tier
        offers.sort((a: any, b: any) => {
          if ((a._distance_m ?? 99999) !== (b._distance_m ?? 99999))
            return (a._distance_m ?? 99999) - (b._distance_m ?? 99999);
          return (a.tier ?? 3) - (b.tier ?? 3);
        });
        setNearOffers(offers);
        setNearLoad(false);
      })
      .catch(() => setNearLoad(false));
  }, [tab, geo.lat, geo.lng]);

  const filtered = useMemo(() => {
    if (tab === "Near Me") return nearOffers;
    if (tab === "Big Deal")    return allOffers.filter((o) => o.tier === 1);
    if (tab === "Flash")       return allOffers.filter((o) => o.discount_type === "bogo" || o.discount_type === "free");
    if (tab === "Ending Soon") return allOffers.filter((o) => o.ends_at && new Date(o.ends_at).getTime() - Date.now() < 86400000 * 3);
    return allOffers;
  }, [tab, allOffers, nearOffers]);

  const isLoading = tab === "Near Me" ? nearLoad : loading;

  return (
    <AppShell activeTab="offers">
      <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg)" }}>

        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-4 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-syne font-black text-xl" style={{ letterSpacing: "-0.4px" }}>🎯 Live Offers</h1>
            <span className="text-xs" style={{ color: "var(--t3)" }}>
              {!isLoading && `${filtered.length} offer${filtered.length !== 1 ? "s" : ""}`}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto scroll-none pb-1">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={tab === t
                  ? { background: "var(--accent)", color: "#fff", boxShadow: "0 0 14px rgba(255,94,26,0.3)" }
                  : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {t === "Near Me" ? `📍 ${t}` : t}
              </button>
            ))}
          </div>
          {tab === "Near Me" && (
            <p className="text-[10px] mt-1.5" style={{ color: "var(--t3)" }}>
              {geo.locality ? `Offers within ${NEAR_ME_RADIUS_KM}km of ${geo.locality}` : "Detecting your location…"}
            </p>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-scroll scroll-none px-4 py-3 space-y-3">
          {isLoading && [1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-2xl shimmer" />)}

          {!isLoading && filtered.map((offer, i) => (
            <motion.div key={offer.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.035 }}>
              <OfferCard offer={offer} showDistance={tab === "Near Me"} />
            </motion.div>
          ))}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-16" style={{ color: "var(--t2)" }}>
              <div className="text-4xl mb-3">🎯</div>
              <p className="font-semibold mb-1">
                {tab === "Near Me" && !geo.lat
                  ? "Allow location to see nearby offers"
                  : "No offers in this category"}
              </p>
              {tab === "Near Me" && !geo.lat && (
                <p className="text-xs" style={{ color: "var(--t3)" }}>
                  Location permission is needed to show offers near you.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function OfferCard({ offer, showDistance }: { offer: Offer; showDistance?: boolean }) {
  const shop   = (offer as any).shop;
  const isT1   = offer.tier === 1;
  const ending = offer.ends_at && new Date(offer.ends_at).getTime() - Date.now() < 86400000 * 3;
  const dist   = (offer as any)._distance_m;

  return (
    <Link href={`/shop/${shop?.slug ?? "#"}`}
      className="flex gap-3 p-3.5 rounded-2xl relative overflow-hidden block"
      style={{
        background: isT1
          ? "linear-gradient(135deg,rgba(255,60,0,0.14),rgba(255,140,0,0.07))"
          : "rgba(255,255,255,0.034)",
        border: `1px solid ${isT1 ? "rgba(255,80,0,0.30)" : "rgba(255,255,255,0.07)"}`,
        boxShadow: isT1 ? "0 0 18px rgba(255,80,0,0.08)" : "none",
      }}>
      {/* Icon */}
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
        {(shop as any)?.category?.icon ?? "🏪"}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1 mb-0.5">
          {isT1 && (
            <span className="flex-shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded whitespace-nowrap"
              style={{ background: "rgba(255,80,0,0.18)", color: "#FF6830" }}>⭐ BIG DEAL</span>
          )}
          {ending && (
            <span className="flex-shrink-0 text-[8px] font-bold whitespace-nowrap" style={{ color: "var(--gold)" }}>⚡ Ending soon</span>
          )}
        </div>
        <h3 className="font-syne font-bold text-sm leading-tight" style={{
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden"
        }}>{offer.title}</h3>

        <p className="text-xs mt-0.5 truncate" style={{ color: "var(--t2)" }}>{shop?.name}</p>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-xs font-semibold" style={{ color: "var(--t3)" }}>
            📍 {(shop as any)?.locality?.name}
          </span>
          {showDistance && typeof dist === "number" && (
            <span className="text-xs font-semibold" style={{ color: "var(--green)" }}>
              {formatDistance(dist)}
            </span>
          )}
          {offer.coupon_code && (
            <span className="text-[9.5px] font-bold font-mono px-2 py-0.5 rounded"
              style={{ background: "rgba(255,94,26,0.1)", color: "var(--accent)", border: "1px dashed rgba(255,94,26,0.3)" }}>
              {offer.coupon_code}
            </span>
          )}
          {offer.discount_value && offer.discount_type === "percent" && (
            <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: "rgba(31,187,90,0.1)", color: "var(--green)" }}>
              {offer.discount_value}% OFF
            </span>
          )}
          {offer.discount_value && offer.discount_type === "flat" && (
            <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: "rgba(31,187,90,0.1)", color: "var(--green)" }}>
              ₹{offer.discount_value} OFF
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
