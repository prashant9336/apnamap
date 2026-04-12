"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/* ── Types ─────────────────────────────────────────────────────────── */
interface ShopOffer { id: string; is_active: boolean; ends_at: string | null; }
interface ShopRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  vendor_id: string | null;
  is_approved: boolean;
  is_active: boolean;
  is_featured: boolean;
  is_boosted: boolean;
  view_count: number;
  avg_rating: number;
  review_count: number;
  updated_at: string;
  created_at: string;
  category: { id: string; name: string; icon: string } | null;
  locality:  { id: string; name: string } | null;
  offers: ShopOffer[];
}

type Health = "healthy" | "needs_attention" | "dead";

interface Filters {
  search:    string;
  health:    Health | "all";
  status:    "all" | "approved" | "pending";
  claimed:   "all" | "claimed" | "unclaimed";
  offer:     "all" | "has_offer" | "no_offer";
  locality:  string;   // id or ""
  category:  string;   // id or ""
}

/* ── Health logic ───────────────────────────────────────────────────── */
function computeHealth(shop: ShopRow): Health {
  if (!shop.is_approved) return "dead"; // not yet live — treat as dead for action priority

  const activeOffers = shop.offers.filter(o => {
    if (!o.is_active) return false;
    if (o.ends_at && new Date(o.ends_at) < new Date()) return false;
    return true;
  });
  const hasOffer     = activeOffers.length > 0;
  const hasContact   = !!(shop.phone || shop.whatsapp);
  const hasDesc      = !!shop.description?.trim();
  const daysSince    = (Date.now() - new Date(shop.updated_at).getTime()) / 86_400_000;
  const isStale      = daysSince > 30;

  if (hasOffer && hasContact && hasDesc && !isStale) return "healthy";
  if (!hasOffer && isStale && shop.view_count < 10)   return "dead";
  return "needs_attention";
}

const HEALTH: Record<Health, { label: string; color: string; bg: string; border: string }> = {
  healthy:         { label: "Healthy",      color: "#1FBB5A", bg: "rgba(31,187,90,0.10)",   border: "rgba(31,187,90,0.30)"  },
  needs_attention: { label: "Needs Action", color: "#E8A800", bg: "rgba(232,168,0,0.10)",   border: "rgba(232,168,0,0.30)"  },
  dead:            { label: "Dead",         color: "#f87171", bg: "rgba(239,68,68,0.09)",   border: "rgba(239,68,68,0.25)"  },
};

/* ── Sort weight ────────────────────────────────────────────────────── */
const SORT_ORDER: Record<string, number> = {
  pending_approval: 0,   // unapproved shops first
  dead:             1,
  needs_attention:  2,
  healthy:          3,
};
function sortKey(shop: ShopRow, h: Health): number {
  if (!shop.is_approved) return SORT_ORDER["pending_approval"];
  return SORT_ORDER[h];
}

/* ── Helpers ────────────────────────────────────────────────────────── */
function daysAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d === 0) return "today";
  if (d === 1) return "1d ago";
  if (d < 30)  return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

/* ── Component ──────────────────────────────────────────────────────── */
export default function AdminShopsPage() {
  const [shops,   setShops]   = useState<ShopRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [token,   setToken]   = useState("");
  const [acting,  setActing]  = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: "", health: "all", status: "all", claimed: "all",
    offer: "all", locality: "", category: "",
  });

  /* ── Load token + data ── */
  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      const tok = session?.access_token ?? "";
      setToken(tok);
      fetch("/api/admin/shops", { headers: tok ? { Authorization: `Bearer ${tok}` } : {} })
        .then(r => r.json())
        .then(d => { setShops(d.shops ?? []); setLoading(false); })
        .catch(() => setLoading(false));
    });
  }, []);

  /* ── Derived state ── */
  const healthMap = useMemo<Map<string, Health>>(() => {
    const m = new Map<string, Health>();
    shops.forEach(s => m.set(s.id, computeHealth(s)));
    return m;
  }, [shops]);

  const localities = useMemo(() => {
    const seen = new Map<string, string>();
    shops.forEach(s => { if (s.locality) seen.set(s.locality.id, s.locality.name); });
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [shops]);

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    shops.forEach(s => { if (s.category) seen.set(s.category.id, s.category.name); });
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [shops]);

  const stats = useMemo(() => {
    const total    = shops.length;
    const healthy  = shops.filter(s => healthMap.get(s.id) === "healthy").length;
    const attn     = shops.filter(s => healthMap.get(s.id) === "needs_attention").length;
    const dead     = shops.filter(s => healthMap.get(s.id) === "dead").length;
    const pending  = shops.filter(s => !s.is_approved).length;
    const noOffer  = shops.filter(s => {
      const active = s.offers.filter(o => o.is_active && (!o.ends_at || new Date(o.ends_at) > new Date()));
      return active.length === 0;
    }).length;
    return { total, healthy, attn, dead, pending, noOffer };
  }, [shops, healthMap]);

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase();
    return shops
      .filter(s => {
        if (q && !s.name.toLowerCase().includes(q) && !s.locality?.name.toLowerCase().includes(q)) return false;
        if (filters.health !== "all" && healthMap.get(s.id) !== filters.health) return false;
        if (filters.status === "approved" && !s.is_approved) return false;
        if (filters.status === "pending"  &&  s.is_approved) return false;
        if (filters.claimed === "claimed"   && !s.vendor_id) return false;
        if (filters.claimed === "unclaimed" &&  s.vendor_id) return false;
        if (filters.offer === "has_offer") {
          const live = s.offers.filter(o => o.is_active && (!o.ends_at || new Date(o.ends_at) > new Date()));
          if (live.length === 0) return false;
        }
        if (filters.offer === "no_offer") {
          const live = s.offers.filter(o => o.is_active && (!o.ends_at || new Date(o.ends_at) > new Date()));
          if (live.length > 0) return false;
        }
        if (filters.locality && s.locality?.id !== filters.locality) return false;
        if (filters.category && s.category?.id !== filters.category) return false;
        return true;
      })
      .sort((a, b) => {
        const ha = healthMap.get(a.id) ?? "needs_attention";
        const hb = healthMap.get(b.id) ?? "needs_attention";
        return sortKey(a, ha) - sortKey(b, hb);
      });
  }, [shops, healthMap, filters]);

  /* ── Action handler ── */
  async function handleAction(shopId: string, action: string, fields?: Record<string, unknown>) {
    setActing(shopId);
    const res = await fetch("/api/admin/shops", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ shop_id: shopId, action, fields }),
    });
    if (res.ok) {
      const { shop: updated } = await res.json();
      setShops(prev => prev.map(s => s.id === shopId ? { ...s, ...updated } : s));
    }
    setActing(null);
  }

  function setFilter<K extends keyof Filters>(key: K, val: Filters[K]) {
    setFilters(f => ({ ...f, [key]: val }));
  }

  function clearFilters() {
    setFilters({ search: "", health: "all", status: "all", claimed: "all", offer: "all", locality: "", category: "" });
  }

  const isFiltered = filters.search || filters.health !== "all" || filters.status !== "all" ||
    filters.claimed !== "all" || filters.offer !== "all" || filters.locality || filters.category;

  /* ── Render ── */
  return (
    <div className="min-h-screen pb-16" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(5,7,12,0.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/admin/dashboard" className="text-xl leading-none">←</Link>
        <span className="font-syne font-black text-base flex-1">Shop Intelligence</span>
        <span className="text-xs" style={{ color: "var(--t3)" }}>{shops.length} shops</span>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* ── Stats bar ── */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Total",    val: stats.total,   key: null,              color: "var(--t1)" },
            { label: "Healthy",  val: stats.healthy,  key: "healthy" as Health, color: "#1FBB5A" },
            { label: "Action",   val: stats.attn,    key: "needs_attention" as Health, color: "#E8A800" },
            { label: "Dead",     val: stats.dead,    key: "dead" as Health,  color: "#f87171" },
            { label: "Pending",  val: stats.pending, key: null,              color: "#a78bfa", filterKey: "status" as const, filterVal: "pending" },
            { label: "No Offer", val: stats.noOffer, key: null,              color: "var(--t2)", filterKey: "offer" as const, filterVal: "no_offer" },
          ].map((s) => (
            <button key={s.label}
              onClick={() => {
                if (s.key) setFilter("health", filters.health === s.key ? "all" : s.key);
                else if (s.filterKey && s.filterVal) setFilter(s.filterKey as any, (filters as any)[s.filterKey!] === s.filterVal ? "all" : s.filterVal);
              }}
              className="p-2.5 rounded-xl text-left transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-xl font-black" style={{ color: s.color }}>{s.val}</div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--t3)" }}>{s.label}</div>
            </button>
          ))}
        </div>

        {/* ── Search ── */}
        <input
          type="text"
          placeholder="Search shops or localities…"
          value={filters.search}
          onChange={e => setFilter("search", e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "var(--t1)" }}
        />

        {/* ── Filters ── */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: "health",   label: "Health",   options: [["all","All Health"],["healthy","Healthy"],["needs_attention","Needs Action"],["dead","Dead"]] },
            { key: "status",   label: "Status",   options: [["all","All Status"],["pending","Pending"],["approved","Approved"]] },
            { key: "claimed",  label: "Claimed",  options: [["all","All"],["claimed","Claimed"],["unclaimed","Unclaimed"]] },
            { key: "offer",    label: "Offer",    options: [["all","All Offers"],["has_offer","Has Offer"],["no_offer","No Offer"]] },
            { key: "locality", label: "Locality", options: [["","All Localities"], ...localities] },
            { key: "category", label: "Category", options: [["","All Categories"], ...categories] },
          ].map((f) => (
            <select key={f.key} value={(filters as any)[f.key]}
              onChange={e => setFilter(f.key as keyof Filters, e.target.value as any)}
              className="px-2.5 py-2 rounded-xl text-xs outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "var(--t2)" }}>
              {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
        </div>

        {isFiltered && (
          <button onClick={clearFilters} className="text-xs px-3 py-1 rounded-lg"
            style={{ background: "rgba(255,94,26,0.10)", color: "var(--accent)", border: "1px solid rgba(255,94,26,0.20)" }}>
            ✕ Clear filters · {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </button>
        )}

        {/* ── Skeleton ── */}
        {loading && [1,2,3,4].map(i => <div key={i} className="h-36 rounded-2xl shimmer" />)}

        {/* ── Empty ── */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16" style={{ color: "var(--t2)" }}>
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-semibold">No shops match these filters</p>
          </div>
        )}

        {/* ── Shop cards ── */}
        {!loading && filtered.map(shop => {
          const h = healthMap.get(shop.id) ?? "needs_attention";
          const hc = HEALTH[h];
          const isPending = !shop.is_approved;
          const activeOffers = shop.offers.filter(o => o.is_active && (!o.ends_at || new Date(o.ends_at) > new Date()));
          const isActing = acting === shop.id;

          const cardBorder = isPending
            ? "rgba(167,139,250,0.30)"
            : hc.border;
          const cardBg = isPending
            ? "rgba(167,139,250,0.06)"
            : hc.bg;

          return (
            <div key={shop.id} className="p-4 rounded-2xl"
              style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>

              {/* Top row */}
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl flex-shrink-0 mt-0.5">{shop.category?.icon ?? "🏪"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-syne font-bold text-sm leading-tight">{shop.name}</p>
                    {/* Health badge */}
                    <span className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                      style={{ background: isPending ? "rgba(167,139,250,0.15)" : hc.bg,
                               color: isPending ? "#a78bfa" : hc.color,
                               border: `1px solid ${isPending ? "rgba(167,139,250,0.30)" : hc.border}` }}>
                      {isPending ? "⏳ Pending" : hc.label}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>
                    {shop.category?.name}{shop.locality ? ` · ${shop.locality.name}` : ""}
                  </p>
                </div>
                {/* Views */}
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-semibold" style={{ color: "var(--t2)" }}>👀 {shop.view_count}</p>
                  <p className="text-[10px]" style={{ color: "var(--t3)" }}>{daysAgo(shop.updated_at)}</p>
                </div>
              </div>

              {/* Status badges */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {shop.is_approved && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(31,187,90,0.12)", color: "#1FBB5A", border: "1px solid rgba(31,187,90,0.25)" }}>
                    ✓ Live
                  </span>
                )}
                {shop.vendor_id && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)" }}>
                    Claimed
                  </span>
                )}
                {shop.is_featured && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(232,168,0,0.12)", color: "#E8A800", border: "1px solid rgba(232,168,0,0.25)" }}>
                    ⭐ Featured
                  </span>
                )}
                {shop.is_boosted && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(255,94,26,0.12)", color: "var(--accent)", border: "1px solid rgba(255,94,26,0.25)" }}>
                    🚀 Boosted
                  </span>
                )}
              </div>

              {/* Completeness chips */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <Chip ok={activeOffers.length > 0}  label={activeOffers.length > 0 ? `${activeOffers.length} offer${activeOffers.length > 1 ? "s" : ""}` : "No offers"} />
                <Chip ok={!!shop.description?.trim()} label={shop.description?.trim() ? "Has description" : "No description"} />
                <Chip ok={!!(shop.phone || shop.whatsapp)} label={(shop.phone || shop.whatsapp) ? "Has contact" : "No contact"} />
                {shop.avg_rating > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(232,168,0,0.10)", color: "#E8A800", border: "1px solid rgba(232,168,0,0.20)" }}>
                    ★ {shop.avg_rating.toFixed(1)} ({shop.review_count})
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {!shop.is_approved ? (
                  <>
                    <ActionBtn
                      label="✕ Reject" disabled={isActing}
                      style={{ background: "rgba(239,68,68,0.09)", color: "#f87171", border: "1px solid rgba(239,68,68,0.20)" }}
                      onClick={() => handleAction(shop.id, "reject")}
                    />
                    <ActionBtn
                      label={isActing ? "…" : "✓ Approve"} disabled={isActing}
                      style={{ background: "#1FBB5A", color: "#fff" }}
                      onClick={() => handleAction(shop.id, "approve")}
                    />
                  </>
                ) : (
                  <>
                    <ActionBtn
                      label={shop.is_active ? "Deactivate" : "Activate"} disabled={isActing}
                      style={{ background: "rgba(255,255,255,0.06)", color: "var(--t2)", border: "1px solid rgba(255,255,255,0.10)" }}
                      onClick={() => handleAction(shop.id, "toggle_active")}
                    />
                    <ActionBtn
                      label={shop.is_featured ? "⭐ Unfeature" : "⭐ Feature"} disabled={isActing}
                      style={{
                        background: shop.is_featured ? "rgba(232,168,0,0.18)" : "rgba(232,168,0,0.08)",
                        color: "#E8A800", border: "1px solid rgba(232,168,0,0.25)"
                      }}
                      onClick={() => handleAction(shop.id, "edit", { is_featured: !shop.is_featured })}
                    />
                    <ActionBtn
                      label={shop.is_boosted ? "🚀 Unboost" : "🚀 Boost"} disabled={isActing}
                      style={{
                        background: shop.is_boosted ? "rgba(255,94,26,0.18)" : "rgba(255,94,26,0.08)",
                        color: "var(--accent)", border: "1px solid rgba(255,94,26,0.25)"
                      }}
                      onClick={() => handleAction(shop.id, "edit", { is_boosted: !shop.is_boosted })}
                    />
                  </>
                )}
                <a href={`/shop/${shop.slug}`} target="_blank" rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", color: "var(--t3)", border: "1px solid rgba(255,255,255,0.08)", textDecoration: "none" }}>
                  ↗ View
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────── */
function Chip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded-full"
      style={{
        background: ok ? "rgba(31,187,90,0.09)"  : "rgba(239,68,68,0.08)",
        color:      ok ? "#1FBB5A"               : "#f87171",
        border:     ok ? "1px solid rgba(31,187,90,0.20)" : "1px solid rgba(239,68,68,0.18)",
      }}>
      {ok ? "✓" : "✕"} {label}
    </span>
  );
}

function ActionBtn({ label, onClick, disabled, style }: {
  label: string; onClick: () => void; disabled: boolean;
  style: React.CSSProperties;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
      style={{ opacity: disabled ? 0.5 : 1, ...style }}>
      {label}
    </button>
  );
}
