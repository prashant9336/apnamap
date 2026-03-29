"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import ShopCard from "@/components/walk/ShopCard";
import { useGeo } from "@/hooks/useGeo";
import { useWalkData } from "@/hooks/useWalkData";

const CHIPS = [
  { key: "all", label: "All" },
  { key: "offers", label: "Offers" },
  { key: "food", label: "Food" },
  { key: "fashion", label: "Fashion" },
  { key: "electronics", label: "Electronics" },
  { key: "daily", label: "Daily Needs" },
];

export default function ExplorePage() {
  const { geo, detect } = useGeo();
  const { localities, loading, error } = useWalkData(
    geo.lat ?? 25.442,
    geo.lng ?? 81.8517,
    10000
  );

  const [activeChip, setActiveChip] = useState("all");
  const [activeLocality, setActiveLocality] = useState<string | null>(null);
  const [showStickyPulse, setShowStickyPulse] = useState(true);

  const localityRefs = useRef<Record<string, HTMLElement | null>>({});
  const scrollWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    detect();
  }, [detect]);

  useEffect(() => {
    const timer = setTimeout(() => setShowStickyPulse(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!localities.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]) {
          setActiveLocality(visible[0].target.getAttribute("data-locality-id"));
        }
      },
      {
        root: null,
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.15, 0.3, 0.5, 0.75],
      }
    );

    Object.values(localityRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [localities]);

  const filteredLocalities = useMemo(() => {
    function matchChip(shop: any) {
      if (activeChip === "all") return true;
      if (activeChip === "offers") return !!shop.top_offer;

      const slug = shop.category?.slug ?? "";

      if (activeChip === "food") {
        return ["restaurant", "street-food", "sweet-shop"].includes(slug);
      }
      if (activeChip === "fashion") {
        return ["fashion", "jewellery", "salon"].includes(slug);
      }
      if (activeChip === "electronics") {
        return ["electronics", "mobile-repair"].includes(slug);
      }
      if (activeChip === "daily") {
        return ["grocery", "pharmacy"].includes(slug);
      }

      return true;
    }

    return localities
      .map((loc) => ({
        ...loc,
        shops: loc.shops.filter(matchChip),
      }))
      .filter((loc) => loc.shops.length > 0);
  }, [localities, activeChip]);

  const heroStats = useMemo(() => {
    const allShops = filteredLocalities.flatMap((l) => l.shops);
    const offers = allShops.filter((s) => s.top_offer).length;
    const openNow = allShops.filter((s) => s.is_open).length;

    return {
      shops: allShops.length,
      offers,
      openNow,
    };
  }, [filteredLocalities]);

  function scrollToLocality(id: string) {
    localityRefs.current[id]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <AppShell activeTab="walk">
      <div
        ref={scrollWrapRef}
        className="min-h-screen"
        style={{
          background:
            "radial-gradient(circle at top, rgba(255,94,26,0.08), transparent 26%), var(--bg)",
        }}
      >
        {/* Hero / Sticky Top */}
        <div
          className="sticky top-0 z-40"
          style={{
            background: "rgba(5,7,12,0.86)",
            backdropFilter: "blur(18px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="px-4 pt-3 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className="font-syne font-black text-lg leading-tight"
                  style={{ letterSpacing: "-0.4px" }}
                >
                  Walk your city
                </p>
                <p className="text-[11px]" style={{ color: "var(--t3)" }}>
                  {geo.locality ?? "Prayagraj"} • Discover offers around you
                </p>
              </div>

              <button
                onClick={detect}
                className="px-3 py-2 rounded-full text-[11px] font-bold"
                style={{
                  background: "rgba(31,187,90,0.12)",
                  color: "var(--green)",
                  border: "1px solid rgba(31,187,90,0.22)",
                  boxShadow: showStickyPulse
                    ? "0 0 18px rgba(31,187,90,0.18)"
                    : "none",
                }}
              >
                📍 Refresh
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { label: "Shops", value: heroStats.shops, icon: "🏪" },
                { label: "Offers", value: heroStats.offers, icon: "🔥" },
                { label: "Open Now", value: heroStats.openNow, icon: "🟢" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl px-3 py-2.5"
                  style={{
                    background: "rgba(255,255,255,0.035)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div className="text-sm mb-1">{item.icon}</div>
                  <div className="font-syne font-black text-lg leading-none">
                    {item.value}
                  </div>
                  <div
                    className="text-[10px] mt-1"
                    style={{ color: "var(--t3)" }}
                  >
                    {item.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Discovery chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pt-3">
              {CHIPS.map((chip) => (
                <button
                  key={chip.key}
                  onClick={() => setActiveChip(chip.key)}
                  className="shrink-0 px-3 py-2 rounded-full text-xs font-semibold"
                  style={
                    activeChip === chip.key
                      ? {
                          background: "var(--accent)",
                          color: "#fff",
                          boxShadow: "0 0 18px rgba(255,94,26,0.22)",
                        }
                      : {
                          background: "rgba(255,255,255,0.05)",
                          color: "var(--t2)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }
                  }
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Locality rail */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pt-3">
              {filteredLocalities.map((loc) => {
                const active = activeLocality === loc.id;
                return (
                  <button
                    key={loc.id}
                    onClick={() => scrollToLocality(loc.id)}
                    className="shrink-0 px-3 py-2 rounded-xl text-left"
                    style={
                      active
                        ? {
                            background: "rgba(255,94,26,0.12)",
                            border: "1px solid rgba(255,94,26,0.24)",
                            color: "var(--accent)",
                          }
                        : {
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.07)",
                            color: "var(--t2)",
                          }
                    }
                  >
                    <div className="text-[11px] font-bold">{loc.name}</div>
                    <div className="text-[9px] opacity-80">
                      {loc.shops.length} spots
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Scroll story */}
        <div className="px-4 pb-24 pt-4">
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-3xl"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                />
              ))}
            </div>
          )}

          {!loading && error && (
            <div
              className="p-4 rounded-2xl text-sm"
              style={{
                background: "rgba(239,68,68,0.1)",
                color: "#f87171",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              {error}
            </div>
          )}

          {!loading &&
            !error &&
            filteredLocalities.map((loc, index) => {
              const featureShop =
                loc.shops.find((s) => s.top_offer?.tier === 1) || loc.shops[0];

              return (
                <section
                  key={loc.id}
                 ref={(el) => {
  localityRefs.current[loc.id] = el as HTMLDivElement | null;
}}
                  data-locality-id={loc.id}
                  className="mb-8"
                >
                  {/* Locality hero */}
                  <div
                    className="relative overflow-hidden rounded-3xl p-4 mb-4"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(255,94,26,0.14), rgba(255,255,255,0.03))",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "radial-gradient(circle at top right, rgba(255,94,26,0.12), transparent 30%)",
                      }}
                    />
                    <div className="relative z-10">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-syne font-black text-xl">
                            {loc.name}
                          </p>
                          <p
                            className="text-xs mt-1"
                            style={{ color: "var(--t2)" }}
                          >
                            {loc.crowd_count}+ people exploring •{" "}
                            {loc.shops.length} active shops
                          </p>
                        </div>

                        <span
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                          style={
                            loc.crowd_badge === "hot"
                              ? {
                                  background: "rgba(255,94,26,0.14)",
                                  color: "var(--accent)",
                                }
                              : loc.crowd_badge === "busy"
                              ? {
                                  background: "rgba(232,168,0,0.14)",
                                  color: "var(--gold)",
                                }
                              : {
                                  background: "rgba(31,187,90,0.12)",
                                  color: "var(--green)",
                                }
                          }
                        >
                          {loc.crowd_badge.toUpperCase()}
                        </span>
                      </div>

                      {featureShop && (
                        <div
                          className="mt-4 rounded-2xl p-3"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.07)",
                          }}
                        >
                          <div
                            className="text-[10px] font-bold mb-1"
                            style={{ color: "var(--accent)" }}
                          >
                            LOCAL HOTSPOT
                          </div>
                          <div className="font-bold text-sm">
                            {featureShop.name}
                          </div>
                          <div
                            className="text-xs mt-1"
                            style={{ color: "var(--t2)" }}
                          >
                            {featureShop.top_offer
                              ? featureShop.top_offer.title
                              : "Trending shop in this zone"}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Shop stream */}
                  <div className="space-y-3">
                    {loc.shops.map((shop, i) => (
                      <ShopCard
                        key={shop.id}
                        shop={shop}
                        index={i}
                        side={(i + index) % 2 === 0 ? "left" : "right"}
                      />
                    ))}
                  </div>
                </section>
              );
            })}

          {!loading && !error && filteredLocalities.length === 0 && (
            <div
              className="text-center py-16 rounded-3xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px dashed rgba(255,255,255,0.1)",
              }}
            >
              <div className="text-4xl mb-3">🌆</div>
              <p className="font-semibold">No shops for this filter yet</p>
              <p className="text-sm mt-2" style={{ color: "var(--t2)" }}>
                Try another category or refresh your location.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}