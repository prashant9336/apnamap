"use client";

import Link from "next/link";

export default function ShopCard({ shop }: any) {
  const offers = shop.offers || [];
  const activeOffers = offers.filter((o: any) => o.is_active);

  const topOffer =
    activeOffers.find((o: any) => o.tier === 1) ||
    activeOffers.find((o: any) => o.tier === 2) ||
    activeOffers[0];

  const isOpen = shop.is_open ?? true;

  return (
    <Link href={`/shop/${shop.slug}`}>
      <div
        className="relative rounded-2xl p-4 mb-3 overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(10px)",
        }}
      >
        {/* 🔥 Glow Background */}
        {topOffer && (
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background:
                topOffer.tier === 1
                  ? "linear-gradient(135deg, #ff5e1a, transparent)"
                  : "linear-gradient(135deg, #00e676, transparent)",
            }}
          />
        )}

        {/* TOP ROW */}
        <div className="flex justify-between items-start relative z-10">
          <div className="flex gap-2 items-center">
            <div className="text-2xl">{shop.category?.icon || "🏪"}</div>

            <div>
              <p className="font-bold text-sm">{shop.name}</p>
              <p className="text-[11px] text-gray-400">
                📍 {shop.locality?.name || "Nearby"}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{
                background: isOpen
                  ? "rgba(0,230,118,0.12)"
                  : "rgba(255,255,255,0.08)",
                color: isOpen ? "#00e676" : "#aaa",
              }}
            >
              {isOpen ? "OPEN" : "CLOSED"}
            </span>

            {activeOffers.length > 0 && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                style={{
                  background: "rgba(255,94,26,0.15)",
                  color: "#ff5e1a",
                }}
              >
                🔥 {activeOffers.length} OFFERS
              </span>
            )}
          </div>
        </div>

        {/* 🔥 MAIN OFFER */}
        {topOffer && (
          <div
            className="mt-3 p-3 rounded-xl relative z-10"
            style={{
              background:
                topOffer.tier === 1
                  ? "rgba(255,94,26,0.12)"
                  : "rgba(255,255,255,0.06)",
              border:
                topOffer.tier === 1
                  ? "1px solid rgba(255,94,26,0.3)"
                  : "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <p className="text-xs font-bold">{topOffer.title}</p>

            {topOffer.coupon_code && (
              <div
                className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono"
                style={{
                  background: "rgba(255,255,255,0.08)",
                }}
              >
                {topOffer.coupon_code}
              </div>
            )}
          </div>
        )}

        {/* BOTTOM INFO */}
        <div
          className="flex justify-between items-center mt-3 text-[11px] text-gray-400 relative z-10"
        >
          <span>⭐ {shop.avg_rating || "4.2"}</span>
          <span>👁 {shop.views || 120}</span>
          <span>📞 Tap to call</span>
        </div>
      </div>
    </Link>
  );
}