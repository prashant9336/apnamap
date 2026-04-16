"use client";
import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { useRouter } from "next/navigation";
import { formatDistance } from "@/lib/geo/distance";
import { classifyDealEngineType, trackDealView, trackDealClick } from "@/lib/deal-engine";
import { useI18n } from "@/lib/i18n/context";
import type { TranslationKey } from "@/lib/i18n/translations";
import type { WalkShop, Offer } from "@/types";

/* ── Time-left helper ────────────────────────────────────────────── */
function getTimeLeft(endsAt: string): string | null {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const totalMins = Math.floor(ms / 60_000);
  if (totalMins >= 1440) return null;          // > 24 h — no countdown shown
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m left`;
  return "< 1m";
}

/* ── Category tints ──────────────────────────────────────────────── */
const CAT_SKIN: Record<string, string> = {
  "sweet-shop":           "rgba(255,140,0,0.10)",
  "restaurant":           "rgba(255,140,0,0.09)",
  "street-food":          "rgba(255,107,53,0.10)",
  "grocery":              "rgba(34,197,94,0.07)",
  "fashion":              "rgba(236,72,153,0.10)",
  "electronics":          "rgba(56,189,248,0.08)",
  "salon":                "rgba(167,139,250,0.09)",
  "mobile-repair":        "rgba(56,189,248,0.08)",
  "jewellery":            "rgba(232,168,0,0.09)",
  "pharmacy":             "rgba(34,197,94,0.07)",
  "coaching":             "rgba(99,179,237,0.08)",
  "gym":                  "rgba(52,211,153,0.07)",
  "real-estate-property": "rgba(255,111,0,0.09)",
};

/* ── Category icon box colors ────────────────────────────────────── */
const CAT_ICON_BG: Record<string, { bg: string; border: string }> = {
  "sweet-shop":    { bg: "rgba(255,140,0,0.12)",   border: "rgba(255,140,0,0.20)"   },
  "restaurant":    { bg: "rgba(255,140,0,0.10)",   border: "rgba(255,140,0,0.18)"   },
  "street-food":   { bg: "rgba(255,107,53,0.10)",  border: "rgba(255,107,53,0.18)"  },
  "grocery":       { bg: "rgba(34,197,94,0.09)",   border: "rgba(34,197,94,0.16)"   },
  "fashion":       { bg: "rgba(236,72,153,0.10)",  border: "rgba(236,72,153,0.18)"  },
  "electronics":   { bg: "rgba(56,189,248,0.10)",  border: "rgba(56,189,248,0.18)"  },
  "salon":         { bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.18)" },
  "mobile-repair": { bg: "rgba(56,189,248,0.10)",  border: "rgba(56,189,248,0.18)"  },
  "jewellery":     { bg: "rgba(232,168,0,0.10)",   border: "rgba(232,168,0,0.18)"   },
  "pharmacy":      { bg: "rgba(34,197,94,0.09)",   border: "rgba(34,197,94,0.16)"   },
  "coaching":             { bg: "rgba(99,179,237,0.10)",  border: "rgba(99,179,237,0.18)"  },
  "gym":                  { bg: "rgba(52,211,153,0.09)",  border: "rgba(52,211,153,0.16)"  },
  "real-estate-property": { bg: "rgba(255,111,0,0.10)",   border: "rgba(255,111,0,0.20)"   },
};
const CAT_ICON_FB = { bg: "rgba(255,255,255,0.07)", border: "rgba(255,255,255,0.10)" };

/* ── Status helper ───────────────────────────────────────────────── */
function parseTimeMins(t: string | null): number | null {
  if (!t) return null;
  const parts = t.split(":");
  const h = parseInt(parts[0] ?? "0");
  const m = parseInt(parts[1] ?? "0");
  return h * 60 + m;
}

interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
}

type TFn = (k: TranslationKey) => string;

function getStatus(shop: WalkShop, tFn: TFn): StatusConfig {
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const closeMins   = parseTimeMins(shop.close_time);
  const openMins    = parseTimeMins(shop.open_time);

  if (shop.is_open) {
    // Closing soon: within 45 min of close time
    if (closeMins !== null) {
      const minsLeft = closeMins - currentMins;
      if (minsLeft > 0 && minsLeft <= 45) {
        return {
          label:  `🟡 ${tFn("closingSoon")} (${minsLeft}m)`,
          color:  "#E8A800",
          bg:     "rgba(232,168,0,0.10)",
          border: "1px solid rgba(232,168,0,0.24)",
        };
      }
    }
    return {
      label:  `🟢 ${tFn("openNow")}`,
      color:  "#1FBB5A",
      bg:     "rgba(31,187,90,0.10)",
      border: "1px solid rgba(31,187,90,0.22)",
    };
  }

  // Closed — show opens-at time if available
  const opensLabel = openMins !== null
    ? `🔴 ${shop.open_time}`
    : `🔴 ${tFn("closed")}`;
  return {
    label:  opensLabel,
    color:  "rgba(255,255,255,0.30)",
    bg:     "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
  };
}

/* ── Props ───────────────────────────────────────────────────────── */
interface Props { shop: WalkShop; index: number; side: "left" | "right" }

/* ── ShopCard ────────────────────────────────────────────────────── */
export default function ShopCard({ shop, index, side }: Props) {
  const ref      = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const inView   = useInView(ref, { once: true, margin: "-30px 0px" });
  const router   = useRouter();
  const { t }    = useI18n();
  const [pressed, setPressed] = useState(false);

  // Focus zone: cards near the vertical center of the viewport scale up slightly;
  // peripheral cards dim. Driven by IntersectionObserver on a wrapper div so it
  // never conflicts with Framer Motion's own transform on the inner motion.div.
  useEffect(() => {
    const wrapper = focusRef.current;
    if (!wrapper) return;
    // Add transition after first paint — avoids animating the initial render
    const raf = requestAnimationFrame(() => {
      wrapper.style.transition = "transform 320ms cubic-bezier(0.25,0,0,1), opacity 280ms ease";
      wrapper.style.willChange = "transform, opacity";
    });
    const obs = new IntersectionObserver(
      ([entry]) => {
        wrapper.style.transform = entry.isIntersecting ? "scale(1.015)" : "scale(0.975)";
        wrapper.style.opacity   = entry.isIntersecting ? "1" : "0.75";
      },
      // "-30% 0px -30% 0px" = only the middle 40% of viewport triggers "focused"
      { rootMargin: "-30% 0px -30% 0px", threshold: 0 },
    );
    obs.observe(wrapper);
    return () => { obs.disconnect(); cancelAnimationFrame(raf); };
  }, []);

  // Prefetch shop page as soon as the card is visible — eliminates cold-start
  // latency when user taps, so loading.tsx appears almost instantly.
  useEffect(() => {
    if (inView) router.prefetch(`/shop/${shop.slug}`);
  }, [inView, shop.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track deal view 2 s after the card enters the viewport — fire once per session
  useEffect(() => {
    if (!inView || !shop.top_offer) return;
    const t = setTimeout(() => trackDealView(shop.top_offer!.id), 2000);
    return () => clearTimeout(t);
  }, [inView, shop.top_offer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const slug       = shop.category?.slug ?? "";
  const skinBg     = CAT_SKIN[slug] ?? "rgba(255,255,255,0.05)";
  const iconCfg    = CAT_ICON_BG[slug] ?? CAT_ICON_FB;
  const icon       = shop.category?.icon ?? "🏪";
  const catName    = shop.category?.name ?? "Shop";
  const offer      = shop.top_offer;
  const dx         = side === "left" ? -16 : 16;
  const isProperty = slug === "real-estate-property";

  // ── display overrides (admin-set takes priority over computed) ──
  const dispRating    = shop.display_rating    ?? shop.avg_rating;
  const dispCount     = shop.display_rating_count ?? shop.review_count;

  // ── derived signals ─────────────────────────────────────────────
  const hasRating     = (dispRating ?? 0) > 0 && (dispCount ?? 0) > 0;
  const isNew         = !hasRating;
  // Admin override first, then computed fallback
  const isTrending    = !!shop.is_trending || !!shop.is_featured;
  const isRecommended = !!shop.is_recommended || (hasRating && dispRating >= 4.0 && dispCount >= 5);
  const isHiddenGem   = !!shop.is_hidden_gem  || (hasRating && dispRating >= 4.5 && (shop.view_count ?? 0) < 200 && dispCount >= 3);
  const validDist     = (shop.distance_m ?? 0) > 0 && shop.distance_m < 50_000;
  const endingSoon    = !!(offer?.ends_at &&
    new Date(offer.ends_at).getTime() - Date.now() < 86_400_000 * 3);
  const hasViewers    = (shop.view_count ?? 0) > 0;
  // Glow border when open + has a big deal — signals activity without animation cost
  const isHot         = shop.is_open && offer?.tier === 1;

  // ── V2 deal heat signals (derived from offer engagement data) ────
  const offerViews   = offer?.view_count  ?? 0;
  const offerClicks  = offer?.click_count ?? 0;
  const offerCTR     = offerViews > 0 ? offerClicks / offerViews : 0;
  // Trending: significant views + strong CTR
  const isTrendingDeal  = !isProperty && offerViews >= 15 && offerCTR >= 0.25;
  // Selling fast: high absolute click count
  const isSellingFast   = !isProperty && offerClicks >= 20;
  // Many people viewing right now proxy: high recent views
  const activeViewers   = !isProperty && offerViews >= 50
    ? `${offerViews} views`
    : null;

  const status = getStatus(shop, t);
  const hasTags = isNew || isTrending || isRecommended || isHiddenGem || endingSoon
    || isTrendingDeal || isSellingFast || !!activeViewers;

  return (
    <div ref={focusRef}>
    {/*
      Press-feedback wrapper: fires on pointerDown (before onClick) so the
      user sees a scale response the instant their finger touches the screen.
      CSS transitions run on the compositor — no React re-render delay.
      touchAction:manipulation disables the browser's 300ms tap delay.
    */}
    <div
      style={{
        transform: pressed ? "scale(0.965)" : "scale(1)",
        transition: pressed
          ? "transform 55ms ease"
          : "transform 200ms cubic-bezier(0.25,0,0,1)",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
    >
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: dx, scale: 0.97 }}
      animate={inView ? { opacity: 1, x: 0, scale: 1 } : {}}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.25, 0, 0, 1] }}
      whileHover={{ y: -2, scale: 1.01 }}
      // whileTap removed — replaced by the pointer-driven press wrapper above,
      // which fires on the compositor before React processes synthetic events.
      onClick={() => {
        // Navigate first — analytics is truly fire-and-forget after push
        router.push(`/shop/${shop.slug}`);
        if (shop.top_offer) trackDealClick(shop.top_offer.id, slug);
      }}
      className="relative overflow-hidden cursor-pointer group"
      style={{
        borderRadius: 13,
        border: isHot
          ? "1px solid rgba(255,94,26,0.35)"
          : "1px solid rgba(255,255,255,0.068)",
        boxShadow: isHot ? "0 0 12px rgba(255,94,26,0.10)" : "none",
        transition: "border-color 0.3s, box-shadow 0.3s",
      }}
    >
      {/* Category skin tint */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse at ${side === "left" ? "0% 0%" : "100% 0%"}, ${skinBg}, transparent 60%)`,
        opacity: 0.65, borderRadius: "inherit",
      }} />

      {/* Grid texture */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)",
        backgroundSize: "10px 10px",
      }} />

      {/* Hover glow */}
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-250" style={{
        background: "radial-gradient(ellipse at 50% 0%,rgba(255,94,26,0.07),transparent 65%)",
        borderRadius: "inherit",
      }} />

      {/* ── Card body ───────────────────────────────────────────── */}
      <div style={{ position: "relative", zIndex: 1, padding: "10px 10px 9px" }}>

        {/* ── Row 1: icon + name (shared by all card types) ─────── */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: iconCfg.bg, border: `1px solid ${iconCfg.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17,
          }}>
            {isProperty ? "🏡" : icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Shop name */}
            <div className="font-syne" style={{
              fontSize: "12.5px", fontWeight: 700, color: "#EDEEF5",
              lineHeight: 1.3,
              display: "-webkit-box", WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {shop.name}
            </div>
            {/* Subtitle: category · status (skip status for property) */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3, minWidth: 0 }}>
              <span style={{
                fontSize: "10px", color: "rgba(255,255,255,0.20)",
                flexShrink: 1, minWidth: 0,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {catName}
              </span>
              {!isProperty && (
                <span style={{
                  flexShrink: 0, whiteSpace: "nowrap",
                  fontSize: "7.5px", fontWeight: 700,
                  padding: "1.5px 5px", borderRadius: 100,
                  color:      status.color,
                  background: status.bg,
                  border:     status.border,
                }}>
                  {status.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            PROPERTY VARIANT — price · location · tags · CTAs
            ════════════════════════════════════════════════════ */}
        {isProperty ? (
          <>
            {/* Price label */}
            {shop.price_label && (
              <div style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 8px", borderRadius: 7, marginBottom: 5,
                background: "rgba(255,111,0,0.09)",
                border: "1px solid rgba(255,111,0,0.22)",
              }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#FF9A3C" }}>
                  💰 {shop.price_label}
                </span>
              </div>
            )}

            {/* Location / description snippet */}
            {(shop.address || shop.description) && (
              <div style={{
                fontSize: "10.5px", color: "rgba(255,255,255,0.38)",
                marginBottom: 6, lineHeight: 1.4,
                display: "-webkit-box", WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                📍 {shop.address || shop.description}
              </div>
            )}

            {/* Property tags from shop.tags */}
            {shop.tags && shop.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 7 }}>
                {shop.tags.slice(0, 3).map(tag => {
                  const isHotProp   = tag.toLowerCase().includes("hot");
                  const isLimited   = tag.toLowerCase().includes("limited");
                  const isFast      = tag.toLowerCase().includes("fast") || tag.toLowerCase().includes("selling");
                  const tagColor    = isHotProp ? "#FF5E1A" : isLimited ? "#E8A800" : isFast ? "#1FBB5A" : "rgba(255,255,255,0.35)";
                  const tagBg       = isHotProp ? "rgba(255,94,26,0.08)" : isLimited ? "rgba(232,168,0,0.08)" : isFast ? "rgba(31,187,90,0.07)" : "rgba(255,255,255,0.04)";
                  const tagBorder   = isHotProp ? "rgba(255,94,26,0.22)" : isLimited ? "rgba(232,168,0,0.20)" : isFast ? "rgba(31,187,90,0.16)" : "rgba(255,255,255,0.08)";
                  return (
                    <span key={tag} style={{
                      fontSize: "8.5px", fontWeight: 700,
                      padding: "2px 6px", borderRadius: 100,
                      color: tagColor, background: tagBg,
                      border: `1px solid ${tagBorder}`,
                    }}>
                      {isHotProp ? "🔥" : isLimited ? "⚡" : isFast ? "📈" : "🏷"} {tag}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Distance */}
            {validDist && (
              <div style={{ fontSize: "10px", color: "#1FBB5A", fontWeight: 600, marginBottom: 7 }}>
                📍 {formatDistance(shop.distance_m)}
              </div>
            )}

            {/* Inline CTA buttons — stop propagation so card nav doesn't fire */}
            {(shop.phone || shop.whatsapp) && (
              <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                {shop.phone && (
                  <a
                    href={`tel:${shop.phone}`}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                      gap: 5, padding: "7px 0", borderRadius: 9,
                      background: "rgba(31,187,90,0.10)",
                      border: "1px solid rgba(31,187,90,0.24)",
                      color: "#1FBB5A", fontSize: "11px", fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    📞 Call
                  </a>
                )}
                {(shop.whatsapp || shop.phone) && (
                  <a
                    href={`https://wa.me/91${(shop.whatsapp || shop.phone)?.replace(/\D/g, "").slice(-10)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                      gap: 5, padding: "7px 0", borderRadius: 9,
                      background: "rgba(37,211,102,0.08)",
                      border: "1px solid rgba(37,211,102,0.22)",
                      color: "#25D366", fontSize: "11px", fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    💬 WhatsApp
                  </a>
                )}
              </div>
            )}
          </>
        ) : (
          /* ═══════════════════════════════════════════════════
             STANDARD SHOP VARIANT — rating · offer · signals
             ═════════════════════════════════════════════════ */
          <>
            {/* Row 2: rating + distance */}
            {(hasRating || validDist) && (
              <div style={{
                display: "flex", alignItems: "center",
                gap: 6, marginBottom: 6, fontSize: "11px",
              }}>
                {hasRating && (
                  <>
                    <span style={{ color: "#E8A800", fontWeight: 700 }}>
                      ★ {(dispRating ?? 0).toFixed(1)}
                    </span>
                    <span style={{ fontSize: "9.5px", color: "rgba(255,255,255,0.22)" }}>
                      ({dispCount})
                    </span>
                    {validDist && (
                      <span style={{ color: "rgba(255,255,255,0.10)" }}>·</span>
                    )}
                  </>
                )}
                {validDist && (
                  <span style={{ color: "#1FBB5A", fontWeight: 600 }}>
                    📍 {formatDistance(shop.distance_m)}
                  </span>
                )}
              </div>
            )}

            {/* Row 3: top offer chip + extra offers */}
            {offer && <OfferChip offer={offer} />}
            {shop.active_offers && shop.active_offers.length > 1 && (
              <ExtraOffersRow offers={shop.active_offers.slice(1)} />
            )}

            {/* Row 4: trust signals + viewers */}
            {(hasTags || hasViewers) && (
              <div style={{
                display: "flex", alignItems: "center",
                gap: 5, flexWrap: "wrap", marginTop: 2,
              }}>
                {isNew && !isTrending && !isRecommended && !isHiddenGem && (
                  <span style={{
                    fontSize: "9px", fontWeight: 700,
                    color: "rgba(31,187,90,0.85)",
                    background: "rgba(31,187,90,0.07)",
                    border: "1px solid rgba(31,187,90,0.16)",
                    padding: "1.5px 6px", borderRadius: 100,
                  }}>
                    🆕 {t("newShop")}
                  </span>
                )}
                {isTrending && (
                  <span style={{ fontSize: "9px", fontWeight: 700, color: "#FF5E1A" }}>
                    🔥 {t("trending")}
                  </span>
                )}
                {isHiddenGem && (
                  <span style={{
                    fontSize: "9px", fontWeight: 700,
                    color: "rgba(167,139,250,0.9)",
                    background: "rgba(167,139,250,0.07)",
                    border: "1px solid rgba(167,139,250,0.18)",
                    padding: "1.5px 6px", borderRadius: 100,
                  }}>
                    💎 {t("hiddenGem")}
                  </span>
                )}
                {isRecommended && !isHiddenGem && (
                  <span style={{ fontSize: "9px", fontWeight: 700, color: "#E8A800" }}>
                    ⭐ {t("recommended")}
                  </span>
                )}
                {endingSoon && (
                  <span style={{ fontSize: "9px", fontWeight: 700, color: "#E8A800" }}>
                    ⚡ {t("endsSoon")}
                  </span>
                )}
                {isTrendingDeal && (
                  <span style={{
                    fontSize: "9px", fontWeight: 700,
                    color: "#FF5E1A",
                    background: "rgba(255,94,26,0.08)",
                    border: "1px solid rgba(255,94,26,0.20)",
                    padding: "1.5px 6px", borderRadius: 100,
                  }}>
                    🔥 {t("trendingDeal")}
                  </span>
                )}
                {isSellingFast && !isTrendingDeal && (
                  <span style={{
                    fontSize: "9px", fontWeight: 700,
                    color: "#E8A800",
                    background: "rgba(232,168,0,0.08)",
                    border: "1px solid rgba(232,168,0,0.20)",
                    padding: "1.5px 6px", borderRadius: 100,
                  }}>
                    ⚡ {t("sellingFast")}
                  </span>
                )}
                {activeViewers && (
                  <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.28)" }}>
                    👀 {activeViewers}
                  </span>
                )}
                {!activeViewers && hasViewers && (
                  <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.22)" }}>
                    👀 {shop.view_count}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
    </div>{/* press wrapper */}
    </div>
  );
}

/* ── Extra offers row — compact pills for offers 2..N ───────────
   Shows up to 3 extra offers as small labeled pills with their
   discount value. Tapping the card still navigates to shop page
   where all offers are listed in full.                          */
function ExtraOffersRow({ offers }: { offers: Offer[] }) {
  const visible = offers.slice(0, 3);
  const overflow = offers.length - 3;

  function offerLabel(o: Offer): string {
    if (o.discount_value && o.discount_type === "percent") return `${o.discount_value}% off`;
    if (o.discount_value && o.discount_type === "flat")    return `₹${o.discount_value} off`;
    if (o.discount_type === "bogo")                        return "BOGO";
    if (o.discount_type === "free")                        return "Free";
    // Truncate title to 18 chars
    return o.title.length > 18 ? o.title.slice(0, 17) + "…" : o.title;
  }

  function offerColor(o: Offer): { color: string; bg: string; border: string } {
    if (o.is_flash || o.tier === 2)     return { color: "#E8A800", bg: "rgba(232,168,0,0.07)",  border: "rgba(232,168,0,0.20)"  };
    if (o.is_big_deal || o.tier === 1)  return { color: "#FF6A30", bg: "rgba(255,80,0,0.07)",   border: "rgba(255,80,0,0.20)"   };
    return                                     { color: "rgba(255,255,255,0.40)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.09)" };
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 5 }}>
      {visible.map(o => {
        const c = offerColor(o);
        return (
          <span key={o.id} style={{
            fontSize: "8.5px", fontWeight: 700,
            padding: "2px 7px", borderRadius: 100,
            color: c.color,
            background: c.bg,
            border: `1px solid ${c.border}`,
            whiteSpace: "nowrap",
          }}>
            {offerLabel(o)}
          </span>
        );
      })}
      {overflow > 0 && (
        <span style={{
          fontSize: "8.5px", fontWeight: 600,
          padding: "2px 7px", borderRadius: 100,
          color: "rgba(255,255,255,0.30)",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}>
          +{overflow} more
        </span>
      )}
    </div>
  );
}

/* ── Offer chip — two-row dominant layout ────────────────────────
   Row 1: deal-type badge  •  discount badge  •  countdown  •  claimed
   Row 2: full offer title (wraps naturally, no JS truncation)
   Visual hierarchy: BIG DEAL > FLASH > NORMAL              */
function OfferChip({ offer }: { offer: Offer }) {
  // 60-s tick keeps countdown fresh
  const [, tick] = useState(0);
  const { t }    = useI18n();
  useEffect(() => {
    if (!offer.ends_at) return;
    const iv = setInterval(() => tick(n => n + 1), 60_000);
    return () => clearInterval(iv);
  }, [offer.ends_at]);

  const now      = Date.now();
  const dealType = classifyDealEngineType(offer, now);
  const { discount_type, discount_value, title, ends_at, click_count, badge_override } = offer;

  // ── Style config per deal type ─────────────────────────────────
  type ChipTheme = { label: string; labelColor: string; bg: string; border: string; glow?: string };

  const theme: ChipTheme = (() => {
    if (dealType === "big_deal") return {
      label: `🔥 ${t("bigDeal")}`, labelColor: "#FF6A30",
      bg: "rgba(255,80,0,0.09)", border: "1px solid rgba(255,80,0,0.26)",
      glow: "rgba(255,80,0,0.22)",
    };
    if (dealType === "flash_deal") return {
      label: `⚡ ${t("flashDeal")}`, labelColor: "#E8A800",
      bg: "rgba(232,168,0,0.09)", border: "1px solid rgba(232,168,0,0.26)",
      glow: "rgba(232,168,0,0.28)",
    };
    if (dealType === "mystery") return {
      label: `🎁 ${t("mysteryDeal")}`, labelColor: "#A78BFA",
      bg: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.20)",
    };
    if (discount_type === "bogo" || discount_type === "free") return {
      label: `🟢 ${t("combo")}`, labelColor: "#1FBB5A",
      bg: "rgba(31,187,90,0.07)", border: "1px solid rgba(31,187,90,0.18)",
    };
    return {
      label: `🎯 ${t("offer")}`, labelColor: "rgba(255,255,255,0.50)",
      bg: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    };
  })();

  // ── Discount badge ─────────────────────────────────────────────
  let discountBadge: string | null = null;
  if (discount_value && discount_type === "percent") discountBadge = `${discount_value}% off`;
  else if (discount_value && discount_type === "flat") discountBadge = `₹${discount_value} off`;
  else if (discount_type === "bogo")                   discountBadge = "Buy 1 Get 1";
  else if (discount_type === "free")                   discountBadge = "Free";

  const timeLeft = ends_at ? getTimeLeft(ends_at) : null;
  const claimed  = click_count ?? 0;

  const chipContent = (
    <div style={{
      padding: "6px 9px", borderRadius: 8,
      background: theme.bg, border: theme.border,
      marginBottom: 5,
    }}>
      {/* Row 1: deal type + discount + countdown + claimed */}
      <div style={{
        display: "flex", alignItems: "center",
        gap: 5, flexWrap: "wrap", marginBottom: dealType === "mystery" ? 0 : 3,
      }}>
        <span style={{ fontSize: "9.5px", fontWeight: 800, color: theme.labelColor }}>
          {badge_override ? `🏷 ${badge_override}` : theme.label}
        </span>
        {discountBadge && (
          <span style={{
            fontSize: "9.5px", fontWeight: 800,
            color: theme.labelColor,
            background: "rgba(255,255,255,0.06)",
            padding: "1px 5px", borderRadius: 100,
          }}>
            {discountBadge}
          </span>
        )}
        {timeLeft && (
          <span style={{
            fontSize: "9px", fontWeight: 700, color: "#E8A800",
            background: "rgba(232,168,0,0.10)",
            padding: "1px 5px", borderRadius: 100,
          }}>
            ⏱ {timeLeft}
          </span>
        )}
        {claimed > 0 && (
          <span style={{ fontSize: "8.5px", color: "rgba(255,255,255,0.28)", marginLeft: "auto" }}>
            🔥 {claimed}×
          </span>
        )}
      </div>

      {/* Row 2: full offer title — no truncation, wraps naturally */}
      {dealType === "mystery" ? (
        <span style={{
          fontSize: "10.5px", color: "rgba(167,139,250,0.45)",
          filter: "blur(4px)", userSelect: "none",
          display: "block", lineHeight: 1.4,
        }}>
          {title}
        </span>
      ) : (
        <span style={{
          fontSize: "10.5px", fontWeight: 600,
          color: "rgba(255,255,255,0.72)",
          display: "block", lineHeight: 1.4,
        }}>
          {title}
        </span>
      )}
    </div>
  );

  // Big deal gets slow glow pulse; flash gets fast amber pulse
  if (dealType === "big_deal") {
    return (
      <motion.div
        animate={{ boxShadow: [
          "0 0 0 rgba(255,80,0,0)",
          `0 0 12px ${theme.glow}, inset 0 0 8px rgba(255,80,0,0.04)`,
          "0 0 0 rgba(255,80,0,0)",
        ]}}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{ borderRadius: 8 }}
      >
        {chipContent}
      </motion.div>
    );
  }

  if (dealType === "flash_deal") {
    return (
      <motion.div
        animate={{ boxShadow: [
          "0 0 0 rgba(232,168,0,0)",
          `0 0 8px ${theme.glow}`,
          "0 0 0 rgba(232,168,0,0)",
        ]}}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        style={{ borderRadius: 8 }}
      >
        {chipContent}
      </motion.div>
    );
  }

  return chipContent;
}
