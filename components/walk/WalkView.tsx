"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import YouAreHere            from "./YouAreHere";
import WalkProgress          from "./WalkProgress";
import LocalitySection       from "./LocalitySection";
import LocalityTransition    from "./LocalityTransition";
import LocalityLeaderboard   from "./LocalityLeaderboard";
import StreakBadge            from "./StreakBadge";
import LangToggle             from "@/components/ui/LangToggle";
import { rankLocalities, topOffersAcrossLocalities } from "@/lib/deal-engine";
import type { ScoredOffer } from "@/lib/deal-engine";
import type { WalkLocality, Offer } from "@/types";

interface Props {
  localities:   WalkLocality[];
  loading:      boolean;
  userLat:      number;
  userLng:      number;
  userLocality: string;
  gpsError?:    string | null;
}

export default function WalkView({ localities, loading, userLat, userLng, userLocality, gpsError }: Props) {
  const scrollRef    = useRef<HTMLDivElement>(null);
  const [scrollPct,  setSP]     = useState(0);
  const [activeIdx,  setAI]     = useState(0);
  const [currentLoc, setCL]     = useState("");
  const [crowd,      setCrowd]  = useState(142);
  const raf  = useRef<number>(0);
  const lasy = useRef(0);

  /* Deal engine — rank shops by score, memoised until localities / GPS change */
  const rankedLocalities = useMemo(
    () => rankLocalities(localities, userLat ?? 0, userLng ?? 0),
    [localities, userLat, userLng]
  );

  /* Top offers for FloatingDealBar rotation */
  const topDeals = useMemo(
    () => topOffersAcrossLocalities(localities, userLat ?? 0, userLng ?? 0, 5),
    [localities, userLat, userLng]
  );
  const footTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leftFoot  = useRef(true);

  // Scroll-to-locality: finds the section by data-loc-idx and scrolls container
  const scrollToLocality = useCallback((idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const target = el.querySelector<HTMLElement>(`[data-loc-idx="${idx}"]`);
    if (!target) return;
    el.scrollTo({ top: target.offsetTop - el.offsetTop - 60, behavior: "smooth" });
  }, []);

  useEffect(() => {
    setCL(localities.length > 0 ? localities[0].name : userLocality);
  }, [localities, userLocality]);

  /* Crowd ticker */
  useEffect(() => {
    const iv = setInterval(() => {
      setCrowd(n => Math.max(80, Math.min(220, n + Math.round((Math.random() - 0.48) * 3))));
    }, 3500);
    return () => clearInterval(iv);
  }, []);

  /* Footstep spawner — renders fixed emoji that float up */
  function spawnFootstep(scrollY: number) {
    if (typeof document === "undefined") return;
    const phone = scrollRef.current?.closest("[data-phone]") as HTMLElement | null;
    const target = phone ?? scrollRef.current;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const cx   = rect.left + rect.width / 2;

    const el = document.createElement("div");
    el.textContent = leftFoot.current ? "👣" : "👟";
    leftFoot.current = !leftFoot.current;
    el.style.cssText = `
      position:fixed; pointer-events:none; z-index:9999;
      font-size:14px; opacity:0; user-select:none;
      left:${cx - 12 + (Math.random() - 0.5) * 24}px;
      top:${rect.top + rect.height * 0.55}px;
      animation:footstep-fade 1.2s ease-out forwards;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }

  /* Inject footstep keyframe once */
  useEffect(() => {
    const id = "fs-style";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = `
        @keyframes footstep-fade {
          0%   { opacity:0.7; transform:translateY(0) scale(1) }
          60%  { opacity:0.4; transform:translateY(-8px) scale(1.1) }
          100% { opacity:0;   transform:translateY(-20px) scale(0.8) }
        }
      `;
      document.head.appendChild(s);
    }
  }, []);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el  = e.currentTarget;
    const sy  = el.scrollTop;
    const max = el.scrollHeight - el.clientHeight;
    const pct = max > 0 ? sy / max : 0;
    setSP(pct);

    /* Locality tracking */
    let vis = 0;
    el.querySelectorAll<HTMLElement>("[data-loc]").forEach(d => {
      if (d.offsetTop - el.offsetTop < sy + 160) {
        vis = parseInt(d.dataset.locIdx ?? "0");
        setCL(d.dataset.loc ?? "");
      }
    });
    if (vis !== activeIdx) setAI(vis);

    /* Parallax */
    const delta = sy - lasy.current; lasy.current = sy;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.querySelectorAll<HTMLElement>(".scol-l").forEach(c => {
        const cur = parseFloat(c.dataset.px ?? "0");
        const nxt = Math.max(-10, Math.min(10, cur - delta * 0.045));
        c.dataset.px = String(nxt); c.style.transform = `translateX(${nxt}px)`;
      });
      el.querySelectorAll<HTMLElement>(".scol-r").forEach(c => {
        const cur = parseFloat(c.dataset.px ?? "0");
        const nxt = Math.max(-10, Math.min(10, cur + delta * 0.045));
        c.dataset.px = String(nxt); c.style.transform = `translateX(${nxt}px)`;
      });
    });

    /* Footstep trail — throttled 280ms */
    if (!footTimer.current) {
      spawnFootstep(sy);
      footTimer.current = setTimeout(() => { footTimer.current = null; }, 280);
    }
  }, [activeIdx]);

  if (loading) return <Skel />;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#05070C" }}>

      {/* Status bar */}
      <div style={{ flexShrink: 0, height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px" }}>
        <Clock />
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "12px", color: "rgba(255,255,255,0.42)" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2 }}>
            {[5, 8, 11, 14].map(h => <div key={h} style={{ width: 3, height: h, borderRadius: 1, background: "rgba(255,255,255,0.42)" }} />)}
          </div>
          <span>5G</span><span>🔋</span>
        </div>
      </div>

      {/* Top nav */}
      <div style={{ flexShrink: 0, padding: "0 14px 10px", background: "rgba(5,7,12,0.96)", backdropFilter: "blur(20px)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Syne',sans-serif", fontSize: "20px", fontWeight: 800, color: "#EDEEF5", letterSpacing: "-0.5px" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#FF5E1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", boxShadow: "0 0 16px rgba(255,94,26,0.5), 0 0 32px rgba(255,94,26,0.2)" }}>
              📍
            </div>
            ApnaMap
          </div>
          {/* Lang toggle */}
          <LangToggle />
          {/* GPS pill */}
          <motion.div key={currentLoc}
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px 5px 8px", borderRadius: 100, fontSize: "12px", fontWeight: 600, color: "#1FBB5A", background: "rgba(31,187,90,0.09)", border: "1px solid rgba(31,187,90,0.25)", boxShadow: "0 0 12px rgba(31,187,90,0.1)", cursor: "pointer" }}>
            <motion.div
              style={{ width: 7, height: 7, borderRadius: "50%", background: "#1FBB5A", boxShadow: "0 0 7px #1FBB5A" }}
              animate={{ boxShadow: ["0 0 0 0 rgba(31,187,90,0.6)", "0 0 0 7px rgba(31,187,90,0)", "0 0 0 0 rgba(31,187,90,0.6)"] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            {currentLoc || userLocality || "Detecting…"}
          </motion.div>
        </div>
        {/* Mode tabs */}
        <ModeTabs />
      </div>

      {/* Separator */}
      <div style={{ height: 1, background: "linear-gradient(to right,transparent,rgba(255,255,255,0.07),transparent)", flexShrink: 0 }} />

      {/* Walk progress — clickable locality rail */}
      <WalkProgress
        scrollPct={scrollPct}
        localities={rankedLocalities.map(l => l.name)}
        activeIdx={activeIdx}
        onLocality={scrollToLocality}
      />

      {/* Scroll canvas */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="scroll-none"
        style={{ flex: 1, overflowY: "scroll", overflowX: "hidden", position: "relative" }}
      >
        {gpsError && (
          <div style={{ margin: "10px 12px 0", padding: "8px 12px", borderRadius: 10, fontSize: "11px", background: "rgba(232,168,0,0.09)", border: "1px solid rgba(232,168,0,0.22)", color: "#E8A800" }}>
            ⚠️ {gpsError}
          </div>
        )}

        {/* You are here */}
        <YouAreHere locality={currentLoc || userLocality} />

        {/* Live feed strip — uses ranked data for relevance */}
        <LiveFeedStrip localities={rankedLocalities} />

        {/* Crowd banner */}
        <CrowdBanner crowd={crowd} localities={rankedLocalities} />

        {/* Localities — ranked by deal score */}
        {rankedLocalities.map((loc, i) => (
          <div key={loc.id} data-loc={loc.name} data-loc-idx={i}>
            {/* Top-3 deal leaderboard — collapsed by default, expands on tap */}
            <LocalityLeaderboard locality={loc} />
            {/* Streak badge — fires /api/streak on mount, idempotent per day */}
            <StreakBadge localityId={loc.id} localityName={loc.name} />
            <LocalitySection locality={loc} index={i} />
            {i < rankedLocalities.length - 1 && (
              <>
                <LocalityTransition fromName={loc.name} toName={rankedLocalities[i + 1].name} />
                {/* Mystery deal teaser — appears after first locality transition only */}
                {i === 0 && (
                  <MysteryDeal
                    revealOffer={rankedLocalities[1]?.shops?.find(s => s.top_offer)?.top_offer ?? null}
                  />
                )}
              </>
            )}
          </div>
        ))}

        {rankedLocalities.length === 0 && <EmptyState />}
        {rankedLocalities.length > 0  && <EndCTA localities={rankedLocalities} />}
        <div style={{ height: 18 }} />
      </div>

      {/* Floating deal bar — shows top-scored deal for current locality */}
      <FloatingDealBar topDeals={topDeals} currentLoc={currentLoc || userLocality} />
    </div>
  );
}

/* ─── Clock ─────────────────────────────────────────────────── */
function Clock() {
  const fmt = () => { const n = new Date(); return `${n.getHours()}:${String(n.getMinutes()).padStart(2,"0")}`; };
  const [t, setT] = useState(fmt);
  useEffect(() => { const iv = setInterval(() => setT(fmt), 10000); return () => clearInterval(iv); }, []);
  return <span style={{ fontFamily:"'Syne',sans-serif", fontSize:"15px", fontWeight:700, color:"#EDEEF5", letterSpacing:"-0.3px" }}>{t}</span>;
}

/* ─── Mode tabs — navigates to real pages ───────────────────── */
function ModeTabs() {
  const router  = useRouter();
  const path    = usePathname();
  const TABS = [
    { label: "🚶 Walk",    href: "/explore"  },
    { label: "🗺 Map",     href: "/map"       },
    { label: "🎯 Offers",  href: "/offers"    },
    { label: "📍 Near Me", href: "/near-me"   },
  ];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, overflowX:"auto" }} className="scroll-none">
      {TABS.map((t) => {
        const active = path === t.href || (t.href === "/explore" && path === "/");
        return (
          <button key={t.href} onClick={() => router.push(t.href)} style={{
            flexShrink:0, padding:"6px 13px", borderRadius:100,
            fontSize:"12px", fontWeight:600, cursor:"pointer", border:"none",
            fontFamily:"'DM Sans',sans-serif", transition:"all .2s",
            ...(active
              ? { background:"#FF5E1A", color:"#fff", boxShadow:"0 0 18px rgba(255,94,26,0.4)" }
              : { background:"rgba(255,255,255,0.04)", color:"rgba(255,255,255,0.42)", outline:"1px solid rgba(255,255,255,0.07)" }),
          }}>{t.label}</button>
        );
      })}
    </div>
  );
}

/* ─── Live Feed Strip ────────────────────────────────────────── */
interface FeedItem { icon: string; shop: string; text: string }

function LiveFeedStrip({ localities }: { localities: WalkLocality[] }) {
  const allShops = localities.flatMap(l => l.shops);
  if (allShops.length === 0) return null;

  // Build feed items purely from in-memory locality data — zero extra API calls
  const items: FeedItem[] = [];
  allShops
    .filter(s => (s.view_count ?? 0) > 0)
    .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
    .slice(0, 3)
    .forEach(s => items.push({ icon: "👀", shop: s.name, text: `${s.view_count} views` }));
  allShops
    .filter(s => s.is_featured)
    .slice(0, 2)
    .forEach(s => items.push({ icon: "🔥", shop: s.name, text: "Trending now" }));
  allShops
    .filter(s => s.top_offer)
    .slice(0, 4)
    .forEach(s => items.push({
      icon: s.top_offer!.tier === 1 ? "🔥" : "🎯",
      shop: s.name,
      text: s.top_offer!.title.length > 18
        ? s.top_offer!.title.slice(0, 16) + "…"
        : s.top_offer!.title,
    }));

  if (items.length === 0) return null;

  return (
    <div style={{ margin: "10px 0 0", paddingLeft: 12 }}>
      {/* Label */}
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
        marginBottom: 6, paddingRight: 12,
      }}>
        <motion.div
          style={{ width: 5, height: 5, borderRadius: "50%", background: "#FF5E1A" }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
        <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.30)", textTransform: "uppercase", letterSpacing: "0.7px" }}>
          Live activity
        </span>
      </div>
      {/* Horizontal scroll strip */}
      <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingRight: 12 }} className="scroll-none">
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35, ease: [0.25,0,0,1] }}
            style={{
              flexShrink: 0, display: "flex", alignItems: "center", gap: 5,
              padding: "5px 10px", borderRadius: 100,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              fontSize: "10.5px", whiteSpace: "nowrap",
            }}
          >
            <span>{item.icon}</span>
            <span style={{ color: "#EDEEF5", fontWeight: 600, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis" }}>
              {item.shop}
            </span>
            <span style={{ color: "rgba(255,255,255,0.28)" }}>·</span>
            <span style={{ color: "rgba(255,255,255,0.38)" }}>{item.text}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Crowd banner ───────────────────────────────────────────── */
function CrowdBanner({ crowd, localities }: { crowd: number; localities: WalkLocality[] }) {
  const totalOffers = localities.reduce(
    (sum, l) => sum + l.shops.filter(s => s.top_offer).length, 0
  );
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.5, ease: [0.25,0,0,1] }}
      style={{
        margin: "10px 12px 0", padding: "10px 12px", borderRadius: 10,
        background: "rgba(255,94,26,0.07)", border: "1px solid rgba(255,94,26,0.18)",
        display: "flex", alignItems: "center", gap: 8,
      }}
    >
      <motion.span
        style={{ fontSize: "15px" }}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        🔥
      </motion.span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#EDEEF5" }}>
          Active right now
        </div>
        {totalOffers > 0 && (
          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
            {totalOffers} live deal{totalOffers !== 1 ? "s" : ""} in this area
          </div>
        )}
      </div>
      <motion.span
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2.8, repeat: Infinity }}
        style={{
          fontSize: "10px", fontWeight: 700, color: "#FF5E1A",
          background: "rgba(255,94,26,0.12)", border: "1px solid rgba(255,94,26,0.28)",
          borderRadius: 100, padding: "3px 9px", whiteSpace: "nowrap",
        }}
      >
        🧑 {crowd} exploring
      </motion.span>
    </motion.div>
  );
}

/* ─── Mystery Deal teaser ────────────────────────────────────── */
function MysteryDeal({ revealOffer }: { revealOffer?: Offer | null }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-20px 0px" }}
      transition={{ duration: 0.4, ease: [0.25,0,0,1] }}
      style={{ margin: "4px 12px 4px", position: "relative", overflow: "hidden" }}
    >
      <AnimatePresence mode="wait">
        {!revealed ? (
          /* ── Locked state ── */
          <motion.button
            key="locked"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            onClick={() => setRevealed(true)}
            style={{
              width: "100%", cursor: "pointer", background: "none", border: "none", padding: 0, textAlign: "left",
            }}
          >
            <motion.div
              whileTap={{ scale: 0.98 }}
              style={{
                padding: "14px 16px", borderRadius: 13,
                background: "linear-gradient(135deg,rgba(167,139,250,0.10),rgba(255,94,26,0.06))",
                border: "1px solid rgba(167,139,250,0.22)",
                display: "flex", alignItems: "center", gap: 12,
              }}
            >
              {/* Lock icon */}
              <motion.div
                animate={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                  background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.22)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                }}
              >
                🔒
              </motion.div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="font-syne" style={{ fontSize: "13px", fontWeight: 800, color: "#EDEEF5", marginBottom: 2 }}>
                  🎁 Mystery Deal Nearby
                </div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", lineHeight: 1.4 }}>
                  {revealOffer
                    ? "Tap to reveal a hidden offer in this area"
                    : "Keep exploring to unlock a hidden offer in this area"}
                </div>
              </div>
              {/* Pulse unlock badge */}
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.05, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                style={{
                  flexShrink: 0, fontSize: "9px", fontWeight: 700,
                  color: "rgba(167,139,250,0.7)",
                  background: "rgba(167,139,250,0.08)",
                  border: "1px solid rgba(167,139,250,0.18)",
                  borderRadius: 100, padding: "3px 8px", whiteSpace: "nowrap",
                }}
              >
                🔓 Tap to reveal
              </motion.div>
            </motion.div>
          </motion.button>
        ) : (
          /* ── Revealed state ── */
          <motion.div
            key="revealed"
            initial={{ opacity: 0, scale: 0.94, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
            style={{
              padding: "14px 16px", borderRadius: 13,
              background: "linear-gradient(135deg,rgba(255,94,26,0.10),rgba(167,139,250,0.06))",
              border: "1px solid rgba(255,94,26,0.30)",
              display: "flex", alignItems: "center", gap: 12,
            }}
          >
            {/* Unlocked icon */}
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{
                width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                background: "rgba(255,94,26,0.14)", border: "1px solid rgba(255,94,26,0.28)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
              }}
            >
              🎁
            </motion.div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {revealOffer ? (
                <>
                  <div className="font-syne" style={{ fontSize: "13px", fontWeight: 800, color: "#FF5E1A", marginBottom: 2 }}>
                    {revealOffer.title}
                  </div>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>
                    {revealOffer.discount_type === "percent" && revealOffer.discount_value
                      ? `${revealOffer.discount_value}% off · `
                      : revealOffer.discount_type === "flat" && revealOffer.discount_value
                      ? `₹${revealOffer.discount_value} off · `
                      : ""}
                    {revealOffer.ends_at
                      ? `Ends ${new Date(revealOffer.ends_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                      : "Limited time"}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-syne" style={{ fontSize: "13px", fontWeight: 800, color: "#FF5E1A", marginBottom: 2 }}>
                    You found a hidden deal!
                  </div>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", lineHeight: 1.4 }}>
                    Ask any shop in this area for the explorer discount
                  </div>
                </>
              )}
            </div>
            {/* Unlocked badge */}
            <div style={{
              flexShrink: 0, fontSize: "9px", fontWeight: 700,
              color: "#FF5E1A",
              background: "rgba(255,94,26,0.10)",
              border: "1px solid rgba(255,94,26,0.25)",
              borderRadius: 100, padding: "3px 8px", whiteSpace: "nowrap",
            }}>
              ✅ Unlocked
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Floating Deal Bar ──────────────────────────────────────── */
function FloatingDealBar({
  topDeals,
  currentLoc,
}: {
  topDeals:   ScoredOffer[];
  currentLoc: string;
}) {
  // Rotate through top deals every 4 s
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (topDeals.length <= 1) return;
    const iv = setInterval(() => setIdx(n => (n + 1) % topDeals.length), 4000);
    return () => clearInterval(iv);
  }, [topDeals.length]);

  const show = topDeals.length > 0;
  const top  = topDeals[idx];

  // Deal type → colour
  const TYPE_COLOR: Record<string, string> = {
    big_deal:  "#FF5E1A",
    flash_deal: "#E8A800",
    mystery:   "#A78BFA",
    new_deal:  "#1FBB5A",
  };
  const TYPE_ICON: Record<string, string> = {
    big_deal:  "🔥",
    flash_deal: "⚡",
    mystery:   "🎁",
    new_deal:  "🎯",
  };
  const accent = top ? (TYPE_COLOR[top.dealType] ?? "#FF5E1A") : "#FF5E1A";
  const icon   = top ? (TYPE_ICON[top.dealType]  ?? "🔥")     : "🔥";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="fdb"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.25,0,0,1] }}
          style={{
            flexShrink: 0,
            padding: "10px 14px",
            background: "rgba(5,7,12,0.92)",
            backdropFilter: "blur(18px)",
            borderTop: `1px solid ${accent}28`,
            display: "flex", alignItems: "center", gap: 10,
          }}
        >
          {/* Pulsing dot */}
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            style={{ width: 7, height: 7, borderRadius: "50%", background: accent, flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <AnimatePresence mode="wait">
              <motion.span
                key={idx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                style={{ fontSize: "12px", fontWeight: 700, color: "#EDEEF5", display: "block" }}
              >
                {icon} {topDeals.length} deal{topDeals.length !== 1 ? "s" : ""} nearby · {currentLoc}
              </motion.span>
            </AnimatePresence>
            <span style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.30)" }}>
              Tap any shop to claim
            </span>
          </div>
          {/* Top deal score chip */}
          {top && (
            <motion.div
              key={`chip-${idx}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              style={{
                flexShrink: 0, fontSize: "9.5px", fontWeight: 700,
                color: accent,
                background: `${accent}18`,
                border: `1px solid ${accent}30`,
                borderRadius: 100, padding: "3px 9px", whiteSpace: "nowrap",
                maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis",
              }}
            >
              {top.offer.title.length > 13
                ? top.offer.title.slice(0, 12) + "…"
                : top.offer.title}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── End CTA ────────────────────────────────────────────────── */
function EndCTA({ localities }: { localities: WalkLocality[] }) {
  const shops  = localities.reduce((a, l) => a + l.shops.length, 0);
  const offers = localities.reduce((a, l) => a + l.shops.filter(s => s.top_offer).length, 0);
  const km     = (localities.length * 1.05).toFixed(1);
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"36px 22px 28px", gap:6, textAlign:"center" }}>
      <div style={{ fontSize:"40px", opacity:0.18, marginBottom:4 }}>🏙️</div>
      <h2 className="font-syne" style={{ fontSize:"18px", fontWeight:800, color:"#EDEEF5", letterSpacing:"-0.3px" }}>
        See what's ahead in your city
      </h2>
      <p style={{ fontSize:"12.5px", color:"rgba(255,255,255,0.42)", lineHeight:1.6, maxWidth:260, marginBottom:4 }}>
        You've explored {localities.length} {localities.length === 1 ? "locality" : "localities"}. More areas are waiting just around the corner.
      </p>
      {/* Stats */}
      <div style={{ display:"flex", gap:20, marginTop:4 }}>
        {[
          { n: shops,   l: "Shops visited"   },
          { n: km,      l: "Walked digitally" },
          { n: offers,  l: "Active offers"   },
        ].map(s => (
          <div key={s.l} style={{ textAlign:"center" }}>
            <div className="font-syne" style={{ fontSize:"20px", fontWeight:800, color:"#FF5E1A" }}>{s.n}</div>
            <div style={{ fontSize:"9.5px", color:"rgba(255,255,255,0.20)", marginTop:1 }}>{s.l}</div>
          </div>
        ))}
      </div>
      {/* CTA */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, marginTop:4, width:"100%" }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          animate={{ boxShadow: ["0 0 18px rgba(255,94,26,0.35), 0 4px 12px rgba(255,94,26,0.2)","0 0 32px rgba(255,94,26,0.55), 0 4px 24px rgba(255,94,26,0.35)","0 0 18px rgba(255,94,26,0.35), 0 4px 12px rgba(255,94,26,0.2)"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ padding:"13px 28px", borderRadius:100, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:"14px", fontWeight:700, background:"linear-gradient(135deg,#FF5E1A,#FF8C3A)", color:"#fff", border:"none", width:"100%", maxWidth:280 }}
        >
          🔥 Continue your walk →
        </motion.button>
        <button style={{ fontSize:"12px", color:"rgba(255,255,255,0.20)", cursor:"pointer", background:"none", border:"none", fontFamily:"'DM Sans',sans-serif" }}>
          Unlock more areas nearby
        </button>
      </div>
    </div>
  );
}

/* ─── Empty ──────────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"80px 24px", textAlign:"center", gap:12 }}>
      <div style={{ fontSize:"40px" }}>🏙️</div>
      <div className="font-syne" style={{ fontSize:"18px", fontWeight:800 }}>No shops found nearby</div>
      <p style={{ fontSize:"12.5px", color:"rgba(255,255,255,0.42)" }}>
        Shops need to be approved first. Go to /admin/dashboard and approve them.
      </p>
      <a href="/vendor/onboarding" style={{ marginTop:8, padding:"11px 24px", borderRadius:100, fontSize:"13px", fontWeight:700, color:"#fff", background:"#FF5E1A", textDecoration:"none" }}>
        Add Your Shop →
      </a>
    </div>
  );
}

/* ─── Skeleton ───────────────────────────────────────────────── */
function Skel() {
  return (
    <div style={{ padding:12, display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ height:44 }} className="shimmer" />
      <div style={{ height:36, borderRadius:10 }} className="shimmer" />
      <div style={{ height:28, borderRadius:8, width:"60%" }} className="shimmer" />
      {[0,1,2,3].map(i => <div key={i} style={{ height:160, borderRadius:13 }} className="shimmer" />)}
    </div>
  );
}
