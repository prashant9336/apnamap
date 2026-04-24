"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/* ── Types ──────────────────────────────────────────────────────────────── */
interface ShopOffer { id: string; is_active: boolean; ends_at: string | null; }
interface VendorOwner { name: string | null; phone: string | null; status: string; }
interface ShopVendor  { id: string; mobile: string | null; is_approved: boolean; owner: VendorOwner | null; }

type ApprovalStatus = "pending" | "approved" | "rejected";

interface ShopRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  vendor_id: string | null;
  approval_status: ApprovalStatus;
  is_approved: boolean;
  is_active: boolean;
  is_featured: boolean;
  is_boosted: boolean;
  view_count: number;
  avg_rating: number;
  review_count: number;
  updated_at: string;
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  delete_reason: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  category:    { id: string; name: string; icon: string } | null;
  subcategory: { id: string; name: string; icon: string } | null;
  locality:    { id: string; name: string } | null;
  offers: ShopOffer[];
  vendor: ShopVendor | null;
}

type Health = "healthy" | "needs_attention" | "dead";

interface Filters {
  search:   string;
  health:   Health | "all";
  status:   "all" | "pending" | "approved" | "rejected" | "deleted";
  offer:    "all" | "has_offer" | "no_offer";
  active:   "all" | "active" | "inactive";
  locality: string;
  category: string;
}

interface SimpleModal { shopId: string; shopName: string; }

/* ── Health ─────────────────────────────────────────────────────────────── */
function computeHealth(shop: ShopRow): Health {
  if (shop.approval_status !== "approved" || shop.deleted_at) return "dead";
  const activeOffers = shop.offers.filter(o => o.is_active && (!o.ends_at || new Date(o.ends_at) > new Date()));
  const hasOffer   = activeOffers.length > 0;
  const hasContact = !!(shop.phone || shop.whatsapp);
  const hasDesc    = !!shop.description?.trim();
  const daysSince  = (Date.now() - new Date(shop.updated_at).getTime()) / 86_400_000;
  const isStale    = daysSince > 30;
  if (hasOffer && hasContact && hasDesc && !isStale) return "healthy";
  if (!hasOffer && isStale && shop.view_count < 10)  return "dead";
  return "needs_attention";
}

const HEALTH: Record<Health, { label: string; color: string; bg: string; border: string }> = {
  healthy:         { label: "Healthy",      color: "#1FBB5A", bg: "rgba(31,187,90,0.10)",  border: "rgba(31,187,90,0.30)"  },
  needs_attention: { label: "Needs Action", color: "#E8A800", bg: "rgba(232,168,0,0.10)",  border: "rgba(232,168,0,0.30)"  },
  dead:            { label: "Dead",         color: "#f87171", bg: "rgba(239,68,68,0.09)",  border: "rgba(239,68,68,0.25)"  },
};

function sortKey(shop: ShopRow, h: Health): number {
  if (shop.deleted_at) return 99;
  if (shop.approval_status === "pending")  return 0;
  if (shop.approval_status === "rejected") return 1;
  const ord: Record<Health, number> = { dead: 2, needs_attention: 3, healthy: 4 };
  return ord[h];
}

function daysAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d === 0) return "today";
  if (d === 1) return "1d ago";
  if (d < 30)  return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

/* ── Component ──────────────────────────────────────────────────────────── */
export default function AdminShopsPage() {
  const [shops,         setShops]         = useState<ShopRow[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [token,         setToken]         = useState("");
  const [acting,        setActing]        = useState<string | null>(null);
  const [autoApproval,  setAutoApproval]  = useState<boolean | null>(null);
  const [showDeleted,   setShowDeleted]   = useState(false);
  const [deleteModal,   setDeleteModal]   = useState<SimpleModal | null>(null);
  const [rejectModal,   setRejectModal]   = useState<SimpleModal | null>(null);
  const [deleteReason,  setDeleteReason]  = useState("");
  const [rejectReason,  setRejectReason]  = useState("");
  const [suspendVendor, setSuspendVendor] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    search: "", health: "all", status: "all", offer: "all", active: "all", locality: "", category: "",
  });

  /* ── Load ── */
  function loadShops(tok: string, withDeleted: boolean) {
    setLoading(true);
    const qs = withDeleted ? "?include_deleted=true" : "";
    fetch(`/api/admin/shops${qs}`, { headers: tok ? { Authorization: `Bearer ${tok}` } : {} })
      .then(r => r.json())
      .then(d => { setShops(d.shops ?? []); setAutoApproval(d.auto_approval_enabled ?? true); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      const tok = session?.access_token ?? "";
      setToken(tok);
      loadShops(tok, false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleDeleted() {
    const next = !showDeleted;
    setShowDeleted(next);
    loadShops(token, next);
  }

  /* ── Derived ── */
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
    const live = shops.filter(s => !s.deleted_at);
    return {
      total:    live.length,
      pending:  live.filter(s => s.approval_status === "pending").length,
      approved: live.filter(s => s.approval_status === "approved").length,
      rejected: live.filter(s => s.approval_status === "rejected").length,
      deleted:  shops.filter(s => !!s.deleted_at).length,
      healthy:  live.filter(s => healthMap.get(s.id) === "healthy").length,
      attn:     live.filter(s => healthMap.get(s.id) === "needs_attention").length,
      dead:     live.filter(s => healthMap.get(s.id) === "dead").length,
      noOffer:  live.filter(s => {
        const active = s.offers.filter(o => o.is_active && (!o.ends_at || new Date(o.ends_at) > new Date()));
        return active.length === 0;
      }).length,
    };
  }, [shops, healthMap]);

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();
    return shops
      .filter(s => {
        const isDeleted = !!s.deleted_at;
        if (filters.status === "deleted"  && !isDeleted) return false;
        if (filters.status !== "deleted"  && isDeleted && !showDeleted) return false;
        if (filters.status === "pending"  && (s.approval_status !== "pending"  || isDeleted)) return false;
        if (filters.status === "approved" && (s.approval_status !== "approved" || isDeleted)) return false;
        if (filters.status === "rejected" && (s.approval_status !== "rejected" || isDeleted)) return false;
        if (filters.active === "active"   && !s.is_active)  return false;
        if (filters.active === "inactive" &&  s.is_active)  return false;
        if (filters.health !== "all" && healthMap.get(s.id) !== filters.health) return false;
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
        if (q) {
          const ownerName  = (s.vendor?.owner?.name ?? "").toLowerCase();
          const ownerPhone = (s.vendor?.owner?.phone ?? s.vendor?.mobile ?? "").replace(/\D/g, "");
          const shopPhone  = (s.phone ?? "").replace(/\D/g, "");
          const match =
            s.name.toLowerCase().includes(q) ||
            (s.locality?.name ?? "").toLowerCase().includes(q) ||
            ownerName.includes(q) ||
            ownerPhone.includes(q.replace(/\D/g, "")) ||
            shopPhone.includes(q.replace(/\D/g, ""));
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const ha = healthMap.get(a.id) ?? "needs_attention";
        const hb = healthMap.get(b.id) ?? "needs_attention";
        return sortKey(a, ha) - sortKey(b, hb);
      });
  }, [shops, healthMap, filters, showDeleted]);

  /* ── Actions ── */
  async function handleAction(shopId: string, action: string, fields?: Record<string, unknown>, reason?: string, reactivateVendor?: boolean) {
    setActing(shopId);
    const res = await fetch("/api/admin/shops", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ shop_id: shopId, action, fields, reason, reactivate_vendor: reactivateVendor }),
    });
    if (res.ok) {
      const { shop: updated } = await res.json();
      if (action === "restore" || action === "approve") {
        loadShops(token, showDeleted);
      } else {
        setShops(prev => prev.map(s => s.id === shopId ? { ...s, ...updated } : s));
      }
    } else {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      alert(`Action failed: ${err.error ?? "Unknown error"}`);
    }
    setActing(null);
  }

  async function confirmReject() {
    if (!rejectModal) return;
    setRejectModal(null);
    await handleAction(rejectModal.shopId, "reject", undefined, rejectReason.trim() || undefined);
    setRejectReason("");
  }

  async function handleSoftDelete() {
    if (!deleteModal) return;
    setActing(deleteModal.shopId);
    const params = new URLSearchParams({ shop_id: deleteModal.shopId });
    if (deleteReason.trim()) params.set("reason", deleteReason.trim());
    if (suspendVendor) params.set("suspend_vendor", "true");
    const res = await fetch(`/api/admin/shops?${params.toString()}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      showDeleted ? loadShops(token, true) : setShops(prev => prev.filter(s => s.id !== deleteModal.shopId));
    }
    setActing(null);
    setDeleteModal(null);
    setDeleteReason("");
    setSuspendVendor(true);
  }

  function setFilter<K extends keyof Filters>(key: K, val: Filters[K]) {
    setFilters(f => ({ ...f, [key]: val }));
  }
  function clearFilters() {
    setFilters({ search: "", health: "all", status: "all", offer: "all", active: "all", locality: "", category: "" });
  }

  const isFiltered = filters.search || filters.health !== "all" || filters.status !== "all" ||
    filters.offer !== "all" || filters.active !== "all" || filters.locality || filters.category;

  /* ── Render ── */
  return (
    <div className="min-h-screen pb-16" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(5,7,12,0.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingTop: "calc(12px + env(safe-area-inset-top, 0px))" }}>
        <Link href="/admin/dashboard" className="text-xl leading-none">←</Link>
        <span className="font-syne font-black text-base flex-1">Shop Intelligence</span>
        <button onClick={toggleDeleted}
          className="text-[10px] font-bold px-2.5 py-1 rounded-full"
          style={showDeleted
            ? { background: "rgba(239,68,68,0.14)", color: "#f87171", border: "1px solid rgba(239,68,68,0.28)" }
            : { background: "rgba(255,255,255,0.06)", color: "var(--t3)", border: "1px solid rgba(255,255,255,0.09)" }}>
          {showDeleted ? "🗑 Hide Deleted" : "🗑 Show Deleted"}
        </button>
        <span className="text-xs" style={{ color: "var(--t3)" }}>{stats.total} shops</span>
      </div>

      <div className="px-4 pt-4 pb-page space-y-4">
        {/* Auto-approval banner */}
        {autoApproval !== null && (
          <div className="px-3 py-2.5 rounded-xl"
            style={autoApproval
              ? { background: "rgba(31,187,90,0.07)", border: "1px solid rgba(31,187,90,0.22)" }
              : { background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.22)" }}>
            <span className="text-xs font-bold" style={{ color: autoApproval ? "#1FBB5A" : "#f87171" }}>
              {autoApproval ? "✓ Auto-Approval: ON" : "⚠ Auto-Approval: OFF"}
            </span>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--t3)" }}>
              {autoApproval
                ? "Qualifying shops go live instantly. Set AUTO_APPROVAL_ENABLED=false in Vercel env to pause."
                : "All new shops require manual approval. Set AUTO_APPROVAL_ENABLED=true in Vercel env to re-enable."}
            </p>
          </div>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Total",    val: stats.total,    color: "var(--t1)", filterKey: null },
            { label: "Pending",  val: stats.pending,  color: "#a78bfa",  filterKey: "status" as const, filterVal: "pending"  },
            { label: "Approved", val: stats.approved, color: "#1FBB5A",  filterKey: "status" as const, filterVal: "approved" },
            { label: "Rejected", val: stats.rejected, color: "#f87171",  filterKey: "status" as const, filterVal: "rejected" },
            { label: "Deleted",  val: stats.deleted,  color: "#64748b",  filterKey: "status" as const, filterVal: "deleted"  },
            { label: "Healthy",  val: stats.healthy,  color: "#1FBB5A",  filterKey: "health" as const, filterVal: "healthy"  },
          ].map(s => (
            <button key={s.label}
              onClick={() => {
                if (s.filterKey === "status") {
                  const next = filters.status === s.filterVal ? "all" : s.filterVal as Filters["status"];
                  setFilter("status", next);
                  if (s.filterVal === "deleted" && !showDeleted) { setShowDeleted(true); loadShops(token, true); }
                } else if (s.filterKey === "health") {
                  setFilter("health", filters.health === s.filterVal ? "all" : s.filterVal as Health);
                }
              }}
              className="p-2.5 rounded-xl text-left"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-xl font-black" style={{ color: s.color }}>{s.val}</div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--t3)" }}>{s.label}</div>
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by shop name, owner, phone, locality…"
          value={filters.search}
          onChange={e => setFilter("search", e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "var(--t1)" }}
        />

        {/* Filters */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: "status",   options: [["all","All Status"],["pending","Pending"],["approved","Approved"],["rejected","Rejected"],["deleted","Deleted"]] },
            { key: "health",   options: [["all","All Health"],["healthy","Healthy"],["needs_attention","Needs Action"],["dead","Dead"]] },
            { key: "active",   options: [["all","All"],["active","Active"],["inactive","Inactive"]] },
            { key: "offer",    options: [["all","All Offers"],["has_offer","Has Offer"],["no_offer","No Offer"]] },
            { key: "locality", options: [["","All Localities"], ...localities] },
            { key: "category", options: [["","All Categories"], ...categories] },
          ].map(f => (
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

        {loading && [1,2,3,4].map(i => <div key={i} className="h-36 rounded-2xl shimmer" />)}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16" style={{ color: "var(--t2)" }}>
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-semibold">No shops match these filters</p>
          </div>
        )}

        {/* Shop cards */}
        {!loading && filtered.map(shop => {
          const h          = healthMap.get(shop.id) ?? "needs_attention";
          const hc         = HEALTH[h];
          const isDeleted  = !!shop.deleted_at;
          const isPending  = shop.approval_status === "pending"  && !isDeleted;
          const isRejected = shop.approval_status === "rejected" && !isDeleted;
          const isApproved = shop.approval_status === "approved" && !isDeleted;
          const isActing   = acting === shop.id;

          const ownerName       = shop.vendor?.owner?.name ?? null;
          const ownerPhone      = shop.vendor?.owner?.phone ?? shop.vendor?.mobile ?? null;
          const vendorSuspended = shop.vendor?.owner?.status === "suspended" || shop.vendor?.owner?.status === "deleted";

          const cardBorder = isDeleted  ? "rgba(100,116,139,0.35)"
            : isRejected ? "rgba(239,68,68,0.30)"
            : isPending  ? "rgba(167,139,250,0.30)" : hc.border;
          const cardBg = isDeleted  ? "rgba(100,116,139,0.06)"
            : isRejected ? "rgba(239,68,68,0.06)"
            : isPending  ? "rgba(167,139,250,0.06)" : hc.bg;

          const activeOffers = shop.offers.filter(o => o.is_active && (!o.ends_at || new Date(o.ends_at) > new Date()));

          return (
            <div key={shop.id} className="p-4 rounded-2xl"
              style={{ background: cardBg, border: `1px solid ${cardBorder}`, opacity: isDeleted ? 0.75 : 1 }}>

              {isDeleted && (
                <div className="mb-3 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "rgba(239,68,68,0.10)", color: "#f87171", border: "1px solid rgba(239,68,68,0.22)" }}>
                  🗑 Deleted {daysAgo(shop.deleted_at!)}
                  {shop.delete_reason && <span style={{ color: "var(--t3)" }}> · {shop.delete_reason}</span>}
                </div>
              )}

              {isRejected && shop.rejection_reason && (
                <div className="mb-3 px-2.5 py-1.5 rounded-lg text-xs"
                  style={{ background: "rgba(239,68,68,0.07)", color: "rgba(248,113,113,0.80)", border: "1px solid rgba(239,68,68,0.18)" }}>
                  Rejection reason: {shop.rejection_reason}
                </div>
              )}

              {/* Top row */}
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl flex-shrink-0 mt-0.5">{shop.subcategory?.icon ?? shop.category?.icon ?? "🏪"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-syne font-bold text-sm leading-tight">{shop.name}</p>
                    <span className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                      style={isDeleted
                        ? { background: "rgba(100,116,139,0.15)", color: "#64748b", border: "1px solid rgba(100,116,139,0.30)" }
                        : isRejected ? { background: "rgba(239,68,68,0.15)",  color: "#f87171", border: "1px solid rgba(239,68,68,0.30)" }
                        : isPending  ? { background: "rgba(167,139,250,0.15)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.30)" }
                        : { background: hc.bg, color: hc.color, border: `1px solid ${hc.border}` }}>
                      {isDeleted ? "🗑 Deleted" : isRejected ? "✕ Rejected" : isPending ? "⏳ Pending" : hc.label}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>
                    {shop.category?.name}{shop.locality ? ` · ${shop.locality.name}` : ""}
                  </p>
                  {(ownerName || ownerPhone) && (
                    <p className="text-[11px] mt-1" style={{ color: "var(--t2)" }}>
                      👤 {ownerName ?? "—"}{ownerPhone ? ` · 📞 ${ownerPhone}` : ""}
                      {vendorSuspended && (
                        <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
                          ⛔ Suspended
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-semibold" style={{ color: "var(--t2)" }}>👀 {shop.view_count}</p>
                  <p className="text-[10px]" style={{ color: "var(--t3)" }}>{daysAgo(shop.updated_at)}</p>
                </div>
              </div>

              {/* Status badges (approved shops only) */}
              {isApproved && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(31,187,90,0.12)", color: "#1FBB5A", border: "1px solid rgba(31,187,90,0.25)" }}>✓ Live</span>
                  {shop.vendor_id && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)" }}>Claimed</span>}
                  {shop.is_featured && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(232,168,0,0.12)", color: "#E8A800", border: "1px solid rgba(232,168,0,0.25)" }}>⭐ Featured</span>}
                  {shop.is_boosted && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(255,94,26,0.12)", color: "var(--accent)", border: "1px solid rgba(255,94,26,0.25)" }}>🚀 Boosted</span>}
                  {!shop.is_active && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(239,68,68,0.09)", color: "#f87171", border: "1px solid rgba(239,68,68,0.20)" }}>● Inactive</span>}
                </div>
              )}

              {/* Completeness chips */}
              {!isDeleted && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Chip ok={activeOffers.length > 0} label={activeOffers.length > 0 ? `${activeOffers.length} offer${activeOffers.length > 1 ? "s" : ""}` : "No offers"} />
                  <Chip ok={!!shop.description?.trim()} label={shop.description?.trim() ? "Has description" : "No description"} />
                  <Chip ok={!!(shop.phone || shop.whatsapp)} label={(shop.phone || shop.whatsapp) ? "Has contact" : "No contact"} />
                  {shop.avg_rating > 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(232,168,0,0.10)", color: "#E8A800", border: "1px solid rgba(232,168,0,0.20)" }}>
                      ★ {shop.avg_rating.toFixed(1)} ({shop.review_count})
                    </span>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                {isDeleted ? (
                  <ActionBtn label={isActing ? "Restoring…" : "↩ Restore Shop"} disabled={isActing}
                    style={{ background: "rgba(31,187,90,0.10)", color: "#1FBB5A", border: "1px solid rgba(31,187,90,0.25)" }}
                    onClick={() => handleAction(shop.id, "restore", undefined, undefined, true)} />
                ) : isRejected ? (
                  <>
                    <ActionBtn label={isActing ? "…" : "↩ Re-approve"} disabled={isActing}
                      style={{ background: "#1FBB5A", color: "#fff" }}
                      onClick={() => handleAction(shop.id, "approve")} />
                    <a href={`/shop/${shop.slug}`} target="_blank" rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold"
                      style={{ background: "rgba(255,255,255,0.04)", color: "var(--t3)", border: "1px solid rgba(255,255,255,0.08)", textDecoration: "none" }}>
                      ↗ View
                    </a>
                    <ActionBtn label="Delete" disabled={isActing}
                      style={{ background: "rgba(239,68,68,0.06)", color: "#f87171", border: "1px solid rgba(239,68,68,0.15)" }}
                      onClick={() => { setDeleteModal({ shopId: shop.id, shopName: shop.name }); setDeleteReason(""); setSuspendVendor(true); }} />
                  </>
                ) : isPending ? (
                  <>
                    <ActionBtn label={isActing ? "…" : "✕ Reject"} disabled={isActing}
                      style={{ background: "rgba(239,68,68,0.09)", color: "#f87171", border: "1px solid rgba(239,68,68,0.20)" }}
                      onClick={() => { setRejectModal({ shopId: shop.id, shopName: shop.name }); setRejectReason(""); }} />
                    <ActionBtn label={isActing ? "…" : "✓ Approve"} disabled={isActing}
                      style={{ background: "#1FBB5A", color: "#fff" }}
                      onClick={() => handleAction(shop.id, "approve")} />
                    <a href={`/shop/${shop.slug}`} target="_blank" rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold"
                      style={{ background: "rgba(255,255,255,0.04)", color: "var(--t3)", border: "1px solid rgba(255,255,255,0.08)", textDecoration: "none" }}>
                      ↗ View
                    </a>
                    <ActionBtn label="Delete" disabled={isActing}
                      style={{ background: "rgba(239,68,68,0.06)", color: "#f87171", border: "1px solid rgba(239,68,68,0.15)" }}
                      onClick={() => { setDeleteModal({ shopId: shop.id, shopName: shop.name }); setDeleteReason(""); setSuspendVendor(true); }} />
                  </>
                ) : (
                  <>
                    <ActionBtn label={shop.is_active ? "Deactivate" : "Activate"} disabled={isActing}
                      style={{ background: "rgba(255,255,255,0.06)", color: "var(--t2)", border: "1px solid rgba(255,255,255,0.10)" }}
                      onClick={() => handleAction(shop.id, "toggle_active")} />
                    <ActionBtn label={shop.is_featured ? "⭐ Unfeature" : "⭐ Feature"} disabled={isActing}
                      style={{ background: shop.is_featured ? "rgba(232,168,0,0.18)" : "rgba(232,168,0,0.08)", color: "#E8A800", border: "1px solid rgba(232,168,0,0.25)" }}
                      onClick={() => handleAction(shop.id, "edit", { is_featured: !shop.is_featured })} />
                    <ActionBtn label={shop.is_boosted ? "🚀 Unboost" : "🚀 Boost"} disabled={isActing}
                      style={{ background: shop.is_boosted ? "rgba(255,94,26,0.18)" : "rgba(255,94,26,0.08)", color: "var(--accent)", border: "1px solid rgba(255,94,26,0.25)" }}
                      onClick={() => handleAction(shop.id, "edit", { is_boosted: !shop.is_boosted })} />
                    <a href={`/shop/${shop.slug}`} target="_blank" rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold"
                      style={{ background: "rgba(255,255,255,0.04)", color: "var(--t3)", border: "1px solid rgba(255,255,255,0.08)", textDecoration: "none" }}>
                      ↗ View
                    </a>
                    <ActionBtn label="Delete" disabled={isActing}
                      style={{ background: "rgba(239,68,68,0.06)", color: "#f87171", border: "1px solid rgba(239,68,68,0.15)" }}
                      onClick={() => { setDeleteModal({ shopId: shop.id, shopName: shop.name }); setDeleteReason(""); setSuspendVendor(true); }} />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Reject modal ── */}
      {rejectModal && (
        <BottomModal onClose={() => setRejectModal(null)}>
          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: "#F2F5FF", marginBottom: 4 }}>
            Reject Shop
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", marginBottom: 16 }}>
            "{rejectModal.shopName}" will be moved to the Rejected tab.
          </p>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>
            Reason (optional)
          </label>
          <input
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="e.g. Incomplete info, spam, outside service area…"
            style={{ width: "100%", padding: "11px 13px", borderRadius: 11, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#F2F5FF", fontSize: 14, outline: "none", fontFamily: "'DM Sans',sans-serif", boxSizing: "border-box", marginBottom: 16 }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setRejectModal(null)}
              style={{ flex: 1, padding: "13px", borderRadius: 12, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>
              Cancel
            </button>
            <button onClick={confirmReject} disabled={!!acting}
              style={{ flex: 2, padding: "13px", borderRadius: 12, background: "rgba(239,68,68,0.80)", color: "#fff", border: "none", cursor: acting ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>
              Confirm Reject
            </button>
          </div>
        </BottomModal>
      )}

      {/* ── Delete modal ── */}
      {deleteModal && (
        <BottomModal onClose={() => setDeleteModal(null)}>
          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: "#F2F5FF", marginBottom: 4 }}>
            Delete Shop
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", marginBottom: 16 }}>
            "{deleteModal.shopName}" will be hidden from all public views. You can restore it later.
          </p>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>
            Reason (optional)
          </label>
          <input
            value={deleteReason}
            onChange={e => setDeleteReason(e.target.value)}
            placeholder="e.g. Duplicate shop, owner request, spam…"
            style={{ width: "100%", padding: "11px 13px", borderRadius: 11, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#F2F5FF", fontSize: 14, outline: "none", fontFamily: "'DM Sans',sans-serif", boxSizing: "border-box", marginBottom: 12 }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, cursor: "pointer" }}>
            <input type="checkbox" checked={suspendVendor} onChange={e => setSuspendVendor(e.target.checked)} />
            <span style={{ fontSize: 13, color: suspendVendor ? "#F2F5FF" : "rgba(255,255,255,0.50)" }}>
              Also suspend vendor account (blocks dashboard access)
            </span>
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setDeleteModal(null)}
              style={{ flex: 1, padding: "13px", borderRadius: 12, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>
              Cancel
            </button>
            <button onClick={handleSoftDelete} disabled={!!acting}
              style={{ flex: 2, padding: "13px", borderRadius: 12, background: acting ? "rgba(239,68,68,0.30)" : "rgba(239,68,68,0.80)", color: "#fff", border: "none", cursor: acting ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>
              {acting ? "Deleting…" : "Confirm Delete"}
            </button>
          </div>
        </BottomModal>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */
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
  label: string; onClick: () => void; disabled: boolean; style: React.CSSProperties;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
      style={{ opacity: disabled ? 0.5 : 1, ...style }}>
      {label}
    </button>
  );
}

function BottomModal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "flex-end" }}
      onClick={onClose}>
      <div style={{ background: "#0C0F18", borderRadius: "20px 20px 0 0", padding: "20px 18px", width: "100%", boxSizing: "border-box" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 18px" }} />
        {children}
      </div>
    </div>
  );
}
