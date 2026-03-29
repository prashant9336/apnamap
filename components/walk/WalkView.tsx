"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import YouAreHere from "./YouAreHere";
import WalkProgress from "./WalkProgress";
import LocalitySection from "./LocalitySection";
import LocalityTransition from "./LocalityTransition";
import type { WalkLocality } from "@/types";

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
  const [scrollPct, setScrollPct]       = useState(0);
  const [activeLocIdx, setActiveLocIdx] = useState(0);
  const [currentLoc, setCurrentLoc]     = useState(userLocality);
  const [crowdCount, setCrowdCount]     = useState(142);
  const rafRef = useRef<number>(0);
  const lastSY = useRef(0);

  // Crowd simulation
  useEffect(() => {
    const iv = setInterval(() => {
      setCrowdCount((n) => Math.max(80, Math.min(250, n + Math.round((Math.random() - 0.48) * 4))));
    }, 3200);
    return () => clearInterval(iv);
  }, []);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el   = e.currentTarget;
    const sy   = el.scrollTop;
    const max  = el.scrollHeight - el.clientHeight;
    const pct  = max > 0 ? sy / max : 0;
    setScrollPct(pct);

    // Locality detection by section offsets
    const sections = el.querySelectorAll("[data-locality-idx]");
    sections.forEach((sec) => {
      const top = (sec as HTMLElement).offsetTop - sy;
      if (top < 200) {
        const idx = parseInt((sec as HTMLElement).dataset.localityIdx ?? "0");
        setActiveLocIdx(idx);
        setCurrentLoc(localities[idx]?.name ?? userLocality);
      }
    });

    // Parallax
    const delta = sy - lastSY.current;
    lastSY.current = sy;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      el.querySelectorAll<HTMLElement>(".scol-l").forEach((c) => {
        const cur = parseFloat(c.dataset.px ?? "0");
        const nxt = Math.max(-10, Math.min(10, cur - delta * 0.04));
        c.dataset.px = String(nxt);
        c.style.transform = `translateX(${nxt}px)`;
      });
      el.querySelectorAll<HTMLElement>(".scol-r").forEach((c) => {
        const cur = parseFloat(c.dataset.px ?? "0");
        const nxt = Math.max(-10, Math.min(10, cur + delta * 0.04));
        c.dataset.px = String(nxt);
        c.style.transform = `translateX(${nxt}px)`;
      });
    });
  }, [localities, userLocality]);

  if (loading) return <WalkSkeleton />;

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      {/* STATUS BAR */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 h-11" style={{ background: "var(--bg)" }}>
        <ClockDisplay />
        <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          <span>▲▲▲▲</span><span>5G</span><span>🔋</span>
        </div>
      </div>

      {/* TOP NAV */}
      <TopNav currentLoc={currentLoc} crowdCount={crowdCount} />

      {/* PROGRESS BAR */}
      <WalkProgress
        scrollPct={scrollPct}
        localities={localities.map((l) => l.name)}
        activeIdx={activeLocIdx}
      />

      {/* SCROLL CANVAS */}
      <div ref={scrollRef} onScroll={onScroll}
        className="flex-1 overflow-y-scroll scroll-none"
        style={{ overflowX: "hidden" }}>

        <YouAreHere locality={userLocality} />

        {/* Crowd banner */}
        <CrowdBanner count={crowdCount} />

        {localities.map((loc, i) => (
          <div key={loc.id} data-locality-idx={i}>
            <LocalitySection locality={loc} index={i} />
            {i < localities.length - 1 && (
              <LocalityTransition fromName={loc.name} toName={localities[i + 1].name} />
            )}
          </div>
        ))}

        {localities.length === 0 && !loading && <EmptyState />}

        {/* End CTA */}
        {localities.length > 0 && <EndCTA localities={localities} />}
        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}

// ── SUB-COMPONENTS ──────────────────────────────────────────────

function ClockDisplay() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => {
      const n = new Date();
      setTime(`${n.getHours()}:${String(n.getMinutes()).padStart(2, "0")}`);
    };
    update();
    const iv = setInterval(update, 10000);
    return () => clearInterval(iv);
  }, []);
  return <span className="font-syne font-bold text-base">{time}</span>;
}

function TopNav({ currentLoc, crowdCount }: { currentLoc: string; crowdCount: number }) {
  const [activeMode, setActiveMode] = useState("walk");
  const MODES = [
    { id: "walk",   label: "🚶 Walk"   },
    { id: "map",    label: "🗺 Map"    },
    { id: "offers", label: "🎯 Offers" },
    { id: "near",   label: "📍 Near Me" },
  ];
  return (
    <div className="flex-shrink-0 px-4 pb-3" style={{ background: "rgba(5,7,12,0.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between mb-3 pt-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: "var(--accent)", boxShadow: "0 0 14px rgba(255,94,26,0.5)" }}>📍</div>
          <span className="font-syne font-black text-[19px]" style={{ letterSpacing: "-0.4px" }}>ApnaMap</span>
        </div>
        <motion.div key={currentLoc} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer"
          style={{ background: "rgba(31,187,90,0.09)", border: "1px solid rgba(31,187,90,0.25)", color: "var(--green)" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--green)", boxShadow: "0 0 5px var(--green)", animation: "gpspulse 2s infinite" }} />
          {currentLoc}
        </motion.div>
      </div>
      <div className="flex gap-1.5 overflow-x-auto scroll-none">
        {MODES.map((m) => (
          <button key={m.id} onClick={() => setActiveMode(m.id)}
            className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
            style={activeMode === m.id
              ? { background: "var(--accent)", color: "#fff", boxShadow: "0 0 16px rgba(255,94,26,0.38)" }
              : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CrowdBanner({ count }: { count: number }) {
  return (
    <div className="mx-3 mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
      style={{ background: "rgba(255,94,26,0.07)", border: "1px solid rgba(255,94,26,0.18)" }}>
      <span className="text-sm">🔥</span>
      <span className="font-semibold flex-1" style={{ color: "var(--t1)" }}>Active right now in Prayagraj</span>
      <span className="font-bold px-2 py-0.5 rounded-full text-[10px]"
        style={{ background: "rgba(255,94,26,0.12)", color: "var(--accent)", border: "1px solid rgba(255,94,26,0.25)" }}>
        🧑 {count} exploring
      </span>
    </div>
  );
}

function EndCTA({ localities }: { localities: WalkLocality[] }) {
  const totalShops  = localities.reduce((a, l) => a + l.shops.length, 0);
  const totalOffers = localities.reduce((a, l) => a + l.shops.filter((s) => s.top_offer).length, 0);
  return (
    <div className="flex flex-col items-center px-5 py-12 text-center gap-3">
      <div className="text-4xl opacity-20">🏙️</div>
      <h3 className="font-syne font-black text-xl" style={{ letterSpacing: "-0.3px" }}>
        See what's ahead in your city
      </h3>
      <p className="text-sm leading-relaxed max-w-xs" style={{ color: "var(--t2)" }}>
        You've explored {localities.length} localities. More areas are just around the corner.
      </p>
      <div className="flex gap-8 my-2">
        {[
          { n: totalShops,  l: "Shops explored" },
          { n: totalOffers, l: "Active offers" },
        ].map((s) => (
          <div key={s.l} className="text-center">
            <div className="font-syne font-black text-2xl" style={{ color: "var(--accent)" }}>{s.n}</div>
            <div className="text-[10px] mt-0.5" style={{ color: "var(--t3)" }}>{s.l}</div>
          </div>
        ))}
      </div>
      <button className="px-8 py-3.5 rounded-full font-bold text-white text-sm mt-1"
        style={{ background: "linear-gradient(135deg,#FF5E1A,#FF7A40)", boxShadow: "0 0 28px rgba(255,94,26,0.4)" }}>
        🔥 Continue your walk →
      </button>
      <button className="text-xs mt-1" style={{ color: "var(--t3)", background: "none", border: "none" }}>
        Unlock more areas nearby
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-3">
      <div className="text-4xl">🏙️</div>
      <div className="font-syne font-bold text-lg">No shops found nearby</div>
      <p className="text-sm" style={{ color: "var(--t2)" }}>
        Be the first to add your shop in this area!
      </p>
      <a href="/vendor/onboarding" className="mt-2 px-6 py-2.5 rounded-full text-sm font-bold text-white"
        style={{ background: "var(--accent)" }}>
        Add Your Shop →
      </a>
    </div>
  );
}

function WalkSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-40 rounded-2xl shimmer" />
      ))}
    </div>
  );
}
