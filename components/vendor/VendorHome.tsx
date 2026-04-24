"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import VendorPostPanel from "./VendorPostPanel";

/* ── Types ───────────────────────────────────────────────────────── */
interface ShopRow {
  id:              string;
  name:            string;
  is_approved:     boolean;
  approval_status: "pending" | "approved" | "rejected";
  rejection_reason?: string | null;
  avg_rating:      number;
  review_count:    number;
  category?:       { icon: string } | null;
  locality?:       { name: string } | null;
  offers:          { id: string; is_active: boolean; ends_at: string | null }[];
}

interface TodayStats {
  views:  number;
  clicks: number;
  saves:  number;
  calls:  number;
}

/* ── Smart hints pool ────────────────────────────────────────────── */
function pickHint(activeOffers: number, todayViews: number, todayClicks: number): string {
  const ctr = todayViews > 0 ? todayClicks / todayViews : 0;
  if (activeOffers === 0) return "Shops with deals get 3× more visits — post your first deal!";
  if (ctr < 0.1 && todayViews > 10) return "Low click rate? Add urgency: 'Today only' or a clear discount.";
  if (activeOffers < 2) return "Flash deals get 2× faster attention. Try one during 12–2 PM or 6–9 PM.";
  return "Post during peak hours (12–2 PM, 6–9 PM) for maximum reach.";
}

/* ── First-offer guidance card ───────────────────────────────────── */
function FirstOfferGuide({ onAction }: { onAction: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0, 0, 1] }}
      style={{
        borderRadius: 18,
        background: "linear-gradient(135deg, rgba(255,94,26,0.08), rgba(232,168,0,0.06))",
        border: "1px solid rgba(255,94,26,0.22)",
        padding: "20px 18px",
        marginBottom: 4,
      }}
    >
      <div style={{ fontSize: "22px", marginBottom: 10 }}>🎉</div>
      <div className="font-syne" style={{ fontSize: "15px", fontWeight: 800, color: "#EDEEF5", marginBottom: 4 }}>
        Welcome! Post your first deal
      </div>
      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", marginBottom: 18, lineHeight: 1.5 }}>
        Your deal will appear in the neighborhood feed instantly.
      </div>

      {/* Deal type explainer — 3 simple rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
        {[
          { icon: "🎯", label: "Normal Offer",  desc: "Everyday update — new stock, menu item, service" },
          { icon: "⚡", label: "Flash Deal",    desc: "Urgent, time-limited — 'Today only', 'Ends tonight'" },
          { icon: "🔥", label: "Big Deal",      desc: "Major offer — featured at the top, gets the most eyes" },
        ].map(({ icon, label, desc }) => (
          <div
            key={label}
            style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              padding: "10px 12px", borderRadius: 11,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <span style={{ fontSize: "18px", lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{icon}</span>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#EDEEF5", marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.38)", lineHeight: 1.4 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onAction}
        style={{
          width: "100%", padding: "13px", borderRadius: 12,
          background: "#FF5E1A", color: "#fff",
          fontWeight: 800, fontSize: "14px",
          border: "none", cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
          boxShadow: "0 0 20px rgba(255,94,26,0.35)",
        }}
      >
        🎤 Speak My First Deal
      </motion.button>
    </motion.div>
  );
}

/* ── Multi-shop switcher chip ────────────────────────────────────── */
function ShopSwitcher({
  shops,
  activeId,
  onSwitch,
}: {
  shops:    ShopRow[];
  activeId: string;
  onSwitch: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = shops.find(s => s.id === activeId);
  if (shops.length <= 1) return null;

  return (
    <div style={{ position: "relative" }}>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "5px 10px 5px 8px", borderRadius: 100,
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "rgba(255,255,255,0.65)", fontSize: "11px", fontWeight: 600,
          cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <span style={{ fontSize: "13px" }}>{active?.category?.icon ?? "🏪"}</span>
        <span style={{ maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {active?.name ?? "Shop"}
        </span>
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>{open ? "▲" : "▾"}</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 100,
              background: "#0D1016", border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 12, overflow: "hidden", minWidth: 160,
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            {shops.map(s => (
              <button
                key={s.id}
                onClick={() => { onSwitch(s.id); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 9, width: "100%",
                  padding: "11px 14px", border: "none", cursor: "pointer",
                  background: s.id === activeId ? "rgba(255,94,26,0.10)" : "transparent",
                  borderLeft: s.id === activeId ? "2px solid #FF5E1A" : "2px solid transparent",
                  color: "#EDEEF5", fontSize: "13px", fontFamily: "'DM Sans', sans-serif",
                  textAlign: "left",
                }}
              >
                <span>{s.category?.icon ?? "🏪"}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
                    {s.locality?.name ?? ""}
                  </div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Stat card ───────────────────────────────────────────────────── */
function StatCard({ icon, value, label, accent }: { icon: string; value: string | number; label: string; accent?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0, 0, 1] }}
      style={{
        flex: 1, padding: "12px 10px 10px", borderRadius: 14, textAlign: "center",
        background: "rgba(255,255,255,0.034)",
        border: `1px solid ${accent ? `${accent}22` : "rgba(255,255,255,0.07)"}`,
      }}
    >
      <div style={{ fontSize: "18px", marginBottom: 4, lineHeight: 1 }}>{icon}</div>
      <div
        className="font-syne"
        style={{ fontSize: "18px", fontWeight: 800, color: accent ?? "#EDEEF5", lineHeight: 1, marginBottom: 3 }}
      >
        {value}
      </div>
      <div style={{ fontSize: "9.5px", color: "rgba(255,255,255,0.30)", fontWeight: 600, letterSpacing: "0.3px" }}>
        {label}
      </div>
    </motion.div>
  );
}

/* ── VendorHome ──────────────────────────────────────────────────── */
export default function VendorHome() {
  const [shops,        setShops]        = useState<ShopRow[]>([]);
  const [activeShopId, setActiveShopId] = useState<string | null>(null);
  const [todayStats,   setTodayStats]   = useState<TodayStats>({ views: 0, clicks: 0, saves: 0, calls: 0 });
  const [loading,      setLoading]      = useState(true);
  const [postPanelKey, setPostPanelKey] = useState(0);  // force re-mount on shop switch

  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    /* Shops + active offer count */
    const { data: shopData } = await supabase
      .from("shops")
      .select("id, name, is_approved, approval_status, rejection_reason, avg_rating, review_count, category:categories(icon), locality:localities(name), offers(id, is_active, ends_at)")
      .eq("vendor_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    const rows = (shopData ?? []) as unknown as ShopRow[];
    setShops(rows);
    setActiveShopId(prev => prev ?? (rows[0]?.id ?? null));

    /* Today's analytics (all shops combined for now) */
    const shopIds = rows.map(s => s.id);
    if (shopIds.length > 0) {
      const todayISO = new Date().toISOString().split("T")[0];
      const { data: evs } = await supabase
        .from("analytics_events")
        .select("event_type")
        .in("shop_id", shopIds)
        .gte("created_at", todayISO);

      const all = evs ?? [];
      setTodayStats({
        views:  all.filter(e => e.event_type === "view").length,
        clicks: all.filter(e => e.event_type === "click").length,
        saves:  all.filter(e => e.event_type === "save").length,
        calls:  all.filter(e => e.event_type === "call").length,
      });
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const activeShop = shops.find(s => s.id === activeShopId);

  /* Active offer count for the selected shop */
  const activeOfferCount = activeShop?.offers?.filter(o => {
    if (!o.is_active) return false;
    if (o.ends_at && new Date(o.ends_at) <= new Date()) return false;
    return true;
  }).length ?? 0;

  const hint = pickHint(activeOfferCount, todayStats.views, todayStats.clicks);

  /* ── Loading skeleton ──────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#05070C" }}>
        <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="shimmer" style={{ height: 48, borderRadius: 12 }} />
        </div>
        <div style={{ flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="shimmer" style={{ height: 80, borderRadius: 14 }} />
          <div className="shimmer" style={{ height: 56, borderRadius: 14 }} />
          <div className="shimmer" style={{ height: 160, borderRadius: 14 }} />
        </div>
      </div>
    );
  }

  /* ── No shop yet ───────────────────────────────────────────────── */
  if (shops.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "0 24px", gap: 16 }}>
        <div style={{ fontSize: "52px" }}>🏪</div>
        <div className="font-syne" style={{ fontSize: "20px", fontWeight: 800, color: "#EDEEF5", textAlign: "center" }}>
          Add your shop
        </div>
        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.42)", textAlign: "center", lineHeight: 1.6 }}>
          List your shop to start reaching customers in your neighborhood.
        </div>
        <Link
          href="/vendor/onboarding"
          style={{
            marginTop: 8, padding: "14px 32px", borderRadius: 14,
            background: "#FF5E1A", color: "#fff",
            fontWeight: 800, fontSize: "14px",
            textDecoration: "none", display: "inline-block",
            boxShadow: "0 0 20px rgba(255,94,26,0.35)",
          }}
        >
          + Add My Shop
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#05070C", overflowY: "hidden" }}>

      {/* ── Sticky header ──────────────────────────────────────── */}
      <div
        style={{
          flexShrink: 0, padding: "12px 16px 10px",
          background: "rgba(5,7,12,0.96)", backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", gap: 10,
        }}
      >
        {/* Shop icon + name + locality */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: "22px", lineHeight: 1 }}>{activeShop?.category?.icon ?? "🏪"}</span>
            <div style={{ minWidth: 0 }}>
              <div className="font-syne" style={{
                fontSize: "15px", fontWeight: 800, color: "#EDEEF5",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {activeShop?.name ?? "My Shop"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 1 }}>
                <span style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.38)" }}>
                  {activeShop?.locality?.name ?? ""}
                </span>
                <span
                  style={{
                    fontSize: "9.5px", fontWeight: 700, padding: "1px 7px", borderRadius: 100,
                    ...(activeShop?.approval_status === "approved"
                      ? { background: "rgba(31,187,90,0.12)", color: "#1FBB5A" }
                      : activeShop?.approval_status === "rejected"
                      ? { background: "rgba(239,68,68,0.12)", color: "#f87171" }
                      : { background: "rgba(232,168,0,0.12)", color: "#E8A800" }),
                  }}
                >
                  {activeShop?.approval_status === "approved" ? "✓ Live"
                    : activeShop?.approval_status === "rejected" ? "✕ Rejected"
                    : "⏳ Pending"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-shop switcher (only renders if >1 shop) */}
        <ShopSwitcher
          shops={shops}
          activeId={activeShopId!}
          onSwitch={id => { setActiveShopId(id); setPostPanelKey(k => k + 1); }}
        />

        {/* Add shop link */}
        <Link
          href="/vendor/onboarding"
          style={{
            flexShrink: 0, padding: "6px 12px", borderRadius: 100,
            background: "rgba(255,94,26,0.10)", border: "1px solid rgba(255,94,26,0.25)",
            color: "#FF5E1A", fontSize: "11px", fontWeight: 700,
            textDecoration: "none",
          }}
        >
          + Shop
        </Link>
      </div>

      {/* ── Scrollable body ────────────────────────────────────── */}
      <div
        className="scroll-none"
        style={{ flex: 1, overflowY: "scroll", padding: "14px 16px 20px", display: "flex", flexDirection: "column", gap: 14 }}
      >
        {/* ── Approval status banner ──────────────────────────── */}
        {activeShop && activeShop.approval_status === "rejected" && (
          <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.28)" }}>
            <div style={{ fontSize: "13px", fontWeight: 800, color: "#f87171", marginBottom: 4 }}>
              ✕ Your shop was not approved
            </div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.50)", lineHeight: 1.6 }}>
              {activeShop.rejection_reason
                ? `Reason: ${activeShop.rejection_reason}. `
                : ""}
              Please contact ApnaMap support to understand what changes are needed before resubmitting.
            </div>
          </div>
        )}
        {activeShop && activeShop.approval_status === "pending" && (
          <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(232,168,0,0.08)", border: "1px solid rgba(232,168,0,0.28)" }}>
            <div style={{ fontSize: "13px", fontWeight: 800, color: "#E8A800", marginBottom: 4 }}>
              ⏳ Your shop is under review
            </div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.50)", lineHeight: 1.6 }}>
              The ApnaMap team is verifying your listing. It usually takes less than 24 hours.
              Once approved, your shop and offers will appear to users in the explore feed.
            </div>
          </div>
        )}

        {/* ── Today's stats ─────────────────────────────────────── */}
        <div>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>
            Today
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <StatCard icon="👁"  value={todayStats.views}  label="Views"   accent="#56CFE1" />
            <StatCard icon="🎯" value={activeOfferCount}   label="Active"  accent="#1FBB5A" />
            <StatCard icon="⭐" value={(activeShop?.avg_rating ?? 0).toFixed(1)} label="Rating" accent="#E8A800" />
            <StatCard icon="❤️"  value={todayStats.saves}  label="Saves"   />
          </div>
        </div>

        {/* ── Smart hint ────────────────────────────────────────── */}
        <motion.div
          key={hint}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          style={{
            display: "flex", alignItems: "flex-start", gap: 9,
            padding: "10px 12px", borderRadius: 11,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span style={{ fontSize: "14px", flexShrink: 0, marginTop: 1 }}>💡</span>
          <span style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{hint}</span>
        </motion.div>

        {/* ── First-offer guidance (only if no active deals) ────── */}
        {activeOfferCount === 0 && activeShop && (
          <FirstOfferGuide onAction={() => {
            // scroll down to the post panel's Speak button
            document
              .getElementById("vendor-post-panel")
              ?.querySelector<HTMLButtonElement>("[data-action='voice']")
              ?.click();
          }} />
        )}

        {/* ── Post panel + deal list ────────────────────────────── */}
        {activeShopId && activeShop && (
          <div id="vendor-post-panel">
            <VendorPostPanel
              key={postPanelKey}
              shopId={activeShopId}
              shopName={activeShop.name}
            />
          </div>
        )}

        {/* ── Bottom quick links ────────────────────────────────── */}
        {activeShopId && (
          <div style={{ display: "flex", gap: 9, marginTop: 4 }}>
            <Link
              href={`/vendor/shop?id=${activeShopId}`}
              style={{
                flex: 1, padding: "12px 8px", borderRadius: 12, textAlign: "center",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.55)", fontSize: "12px", fontWeight: 600,
                textDecoration: "none",
              }}
            >
              ✏️ Edit Shop Info
            </Link>
            <Link
              href={`/vendor/offers?shop_id=${activeShopId}`}
              style={{
                flex: 1, padding: "12px 8px", borderRadius: 12, textAlign: "center",
                background: "rgba(255,94,26,0.07)", border: "1px solid rgba(255,94,26,0.18)",
                color: "#FF5E1A", fontSize: "12px", fontWeight: 600,
                textDecoration: "none",
              }}
            >
              🎯 All Offers
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
