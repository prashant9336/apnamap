"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import YouAreHere         from "./YouAreHere";
import WalkProgress       from "./WalkProgress";
import LocalitySection    from "./LocalitySection";
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

export default function WalkView({ localities, loading, userLocality, gpsError }: Props) {
  const scrollRef    = useRef<HTMLDivElement>(null);
  const [scrollPct,  setSP]     = useState(0);
  const [activeIdx,  setAI]     = useState(0);
  const [currentLoc, setCL]     = useState("");
  const [crowd,      setCrowd]  = useState(142);
  const raf  = useRef<number>(0);
  const lasy = useRef(0);
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
        localities={localities.map(l => l.name)}
        activeIdx={activeIdx}
        onLocality={scrollToLocality}
      />

      {/* Scroll canvas */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="scroll-none"
        style={{ flex: 1, overflowY: "scroll", overflowX: "hidden" }}
      >
        {gpsError && (
          <div style={{ margin: "10px 12px 0", padding: "8px 12px", borderRadius: 10, fontSize: "11px", background: "rgba(232,168,0,0.09)", border: "1px solid rgba(232,168,0,0.22)", color: "#E8A800" }}>
            ⚠️ {gpsError}
          </div>
        )}

        {/* You are here */}
        <YouAreHere locality={currentLoc || userLocality} />

        {/* Crowd banner */}
        <CrowdBanner crowd={crowd} />

        {/* Localities */}
        {localities.map((loc, i) => (
          <div key={loc.id} data-loc={loc.name} data-loc-idx={i}>
            <LocalitySection locality={loc} index={i} />
            {i < localities.length - 1 && (
              <LocalityTransition fromName={loc.name} toName={localities[i + 1].name} />
            )}
          </div>
        ))}

        {localities.length === 0 && <EmptyState />}
        {localities.length > 0  && <EndCTA localities={localities} />}
        <div style={{ height: 18 }} />
      </div>
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

/* ─── Crowd banner ───────────────────────────────────────────── */
function CrowdBanner({ crowd }: { crowd: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.5, ease: [0.25,0,0,1] }}
      style={{
        margin: "10px 12px 0", padding: "9px 12px", borderRadius: 10,
        background: "rgba(255,94,26,0.07)", border: "1px solid rgba(255,94,26,0.18)",
        display: "flex", alignItems: "center", gap: 8, fontSize: "11px",
      }}
    >
      <span style={{ fontSize: "14px" }}>🔥</span>
      <span style={{ flex: 1, fontWeight: 600, color: "#EDEEF5" }}>Active right now in your city</span>
      <motion.span
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 2.8, repeat: Infinity }}
        style={{
          fontSize: "10px", fontWeight: 700, color: "#FF5E1A",
          background: "rgba(255,94,26,0.12)", border: "1px solid rgba(255,94,26,0.28)",
          borderRadius: 100, padding: "2px 8px", whiteSpace: "nowrap",
        }}
      >
        🧑 {crowd} exploring
      </motion.span>
    </motion.div>
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
