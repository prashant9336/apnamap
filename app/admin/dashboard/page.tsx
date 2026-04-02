"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Tab = "pending" | "claims" | "all" | "vendors";

export default function AdminDashboard() {
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<Tab>("pending");
  const [stats,    setStats]    = useState<any>({});
  const [shops,    setShops]    = useState<any[]>([]);
  const [claims,   setClaims]   = useState<any[]>([]);
  const [vendors,  setVendors]  = useState<any[]>([]);
  const [search,   setSearch]   = useState("");
  const [acting,   setActing]   = useState<string|null>(null);
  const [preview,  setPreview]  = useState<any|null>(null);
  const router  = useRouter();
  const sb      = createClient();

  useEffect(() => {
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      const { data: p } = await sb.from("profiles").select("role").eq("id", user.id).single();
      if (p?.role !== "admin") { router.push("/"); return; }
      await load();
    });
  }, []);

  async function load() {
    setLoading(true);

    const [
      { count: totalShops },
      { count: pendingShops },
      { count: claimedShops },
      { count: totalUsers },
      { data: vendorData },
      { data: pendingData },
      { data: claimData },
      { data: allShopData },
    ] = await Promise.all([
      sb.from("shops").select("*", { count:"exact", head:true }),
      sb.from("shops").select("*", { count:"exact", head:true }).eq("is_approved", false),
      sb.from("shops").select("*", { count:"exact", head:true }).eq("is_claimed", true),
      sb.from("profiles").select("*", { count:"exact", head:true }),
      sb.from("vendors").select("id, profiles(name, created_at)").limit(50),
      sb.from("shops")
        .select("*, category:categories(name,icon), locality:localities(name)")
        .eq("is_approved", false)
        .order("created_at", { ascending: false }),
      sb.from("shop_claim_requests")
        .select("*, shop:shops(name, address, locality:localities(name)), profile:profiles(name)")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      sb.from("shops")
        .select("*, category:categories(name,icon), locality:localities(name)")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(80),
    ]);

    setStats({ totalShops, pendingShops, claimedShops, totalUsers, activeVendors: vendorData?.length ?? 0 });
    setPendingInternal(pendingData ?? []);
    setClaims(claimData ?? []);
    setVendors(vendorData ?? []);
    setShops([...(pendingData ?? []), ...(allShopData ?? [])]);
    setLoading(false);
  }

  const [pendingInternal, setPendingInternal] = useState<any[]>([]);

  async function approveShop(shopId: string) {
    setActing(shopId);
    await sb.from("shops").update({ is_approved: true, is_active: true }).eq("id", shopId);
    setPendingInternal(p => p.filter(s => s.id !== shopId));
    setStats((s: any) => ({ ...s, pendingShops: Math.max(0, (s.pendingShops||1)-1), totalShops:(s.totalShops||0)+1 }));
    setActing(null);
  }

  async function rejectShop(shopId: string) {
    setActing(shopId);
    await sb.from("shops").update({ is_approved: false, is_active: false }).eq("id", shopId);
    setPendingInternal(p => p.filter(s => s.id !== shopId));
    setActing(null);
  }

  async function approveClaim(claimId: string) {
    setActing(claimId);
    await sb.rpc("approve_shop_claim", { p_claim_id: claimId });
    setClaims(p => p.filter(c => c.id !== claimId));
    setActing(null);
  }

  async function rejectClaim(claimId: string) {
    setActing(claimId);
    await sb.from("shop_claim_requests").update({ status:"rejected", reviewed_at: new Date().toISOString() }).eq("id", claimId);
    setClaims(p => p.filter(c => c.id !== claimId));
    setActing(null);
  }

  const filteredShops = (tab === "pending" ? pendingInternal : shops.filter(s => s.is_approved))
    .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.locality?.name?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <AdminSkel />;

  const S = {
    pg: { minHeight:"100vh", background:"#05070C" },
    hdr: { position:"sticky" as const, top:0, zIndex:50, display:"flex", alignItems:"center", gap:12, padding:"14px 16px", background:"rgba(5,7,12,0.97)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.07)" },
    h1: { fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:900, color:"#F2F5FF", flex:1, letterSpacing:"-0.4px" },
    card: { padding:"14px 15px", borderRadius:16, background:"rgba(255,255,255,0.034)", border:"1px solid rgba(255,255,255,0.07)" },
    statCard: (c:string) => ({ padding:"13px 14px", borderRadius:14, background:"rgba(255,255,255,0.034)", border:`1px solid ${c}22` }),
    tab: (active:boolean) => ({ padding:"7px 14px", borderRadius:100, fontSize:12, fontWeight:700, cursor:"pointer", border:"none", fontFamily:"'DM Sans',sans-serif", flexShrink:0 as const,
      background: active?"#FF5E1A":"rgba(255,255,255,0.06)",
      color: active?"#fff":"rgba(255,255,255,0.40)" }),
    shopCard: { padding:"14px", borderRadius:14, background:"rgba(255,255,255,0.034)", border:"1px solid rgba(255,255,255,0.07)" },
    input: { width:"100%", padding:"10px 13px", borderRadius:11, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.10)", color:"#F2F5FF", fontSize:13, outline:"none", fontFamily:"'DM Sans',sans-serif" },
    approve: { flex:1 as const, padding:"10px", borderRadius:10, background:"#1FBB5A", color:"#fff", border:"none", cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"'DM Sans',sans-serif" },
    reject:  { flex:1 as const, padding:"10px", borderRadius:10, background:"rgba(239,68,68,0.10)", border:"1px solid rgba(239,68,68,0.22)", color:"#F87171", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif" },
  };

  return (
    <div style={S.pg}>
      {/* Header */}
      <div style={S.hdr}>
        <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,#FF5E1A,#E8A800)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🛡️</div>
        <span style={S.h1}>Admin Panel</span>
        <Link href="/profile" style={{ fontSize:12, color:"rgba(255,255,255,0.40)", textDecoration:"none" }}>← Back</Link>
      </div>

      <div style={{ padding:"14px", display:"flex", flexDirection:"column", gap:14 }}>

        {/* Stats grid */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
          {[
            { label:"Total Shops",   value:stats.totalShops??0,      icon:"🏪", color:"#FF5E1A" },
            { label:"Pending",       value:stats.pendingShops??0,     icon:"⏳", color:"#E8A800" },
            { label:"Claimed",       value:stats.claimedShops??0,     icon:"✅", color:"#1FBB5A" },
            { label:"Vendors",       value:stats.activeVendors??0,    icon:"👔", color:"#3B82F6" },
            { label:"Users",         value:stats.totalUsers??0,       icon:"👥", color:"#8B5CF6" },
            { label:"Claim Pending", value:claims.length,             icon:"🔔", color:"#F43F5E" },
          ].map(s => (
            <div key={s.label} style={S.statCard(s.color)}>
              <div style={{ fontSize:18, marginBottom:4 }}>{s.icon}</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:900, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.30)", textTransform:"uppercase", letterSpacing:"0.8px", fontWeight:700 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:8, overflowX:"auto" }} className="scroll-none">
          {([
            { id:"pending", label:`⏳ Pending (${pendingInternal.length})` },
            { id:"claims",  label:`🔔 Claims (${claims.length})` },
            { id:"all",     label:"✅ All Shops" },
            { id:"vendors", label:"👔 Vendors" },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={S.tab(tab === t.id)}>{t.label}</button>
          ))}
        </div>

        {/* Search (shops tabs) */}
        {(tab === "pending" || tab === "all") && (
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by shop name or locality…" style={S.input} />
        )}

        {/* PENDING SHOPS */}
        {tab === "pending" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {filteredShops.length === 0 && (
              <div style={{ ...S.card, textAlign:"center", padding:"32px" }}>
                <div style={{ fontSize:32, marginBottom:8 }}>✅</div>
                <p style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:800, color:"#F2F5FF" }}>All caught up!</p>
                <p style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:4 }}>No shops pending approval.</p>
              </div>
            )}
            {filteredShops.map(shop => (
              <ShopReviewCard key={shop.id} shop={shop} acting={acting}
                onApprove={() => approveShop(shop.id)}
                onReject={() => rejectShop(shop.id)}
                onPreview={() => setPreview(shop)}
              />
            ))}
          </div>
        )}

        {/* CLAIM REQUESTS */}
        {tab === "claims" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {claims.length === 0 && (
              <div style={{ ...S.card, textAlign:"center", padding:"32px" }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🔔</div>
                <p style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:800, color:"#F2F5FF" }}>No pending claims</p>
              </div>
            )}
            {claims.map(claim => (
              <div key={claim.id} style={S.shopCard}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
                  <div>
                    <p style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:800, color:"#F2F5FF", marginBottom:3 }}>
                      {claim.shop?.name}
                    </p>
                    <p style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>
                      {claim.shop?.locality?.name} · {claim.shop?.address}
                    </p>
                  </div>
                  <span style={{ fontSize:9, fontWeight:700, padding:"3px 8px", borderRadius:100, background:"rgba(232,168,0,0.14)", color:"#E8A800", border:"1px solid rgba(232,168,0,0.30)" }}>
                    ⏳ Pending
                  </span>
                </div>
                <div style={{ padding:"10px 12px", borderRadius:10, background:"rgba(255,255,255,0.03)", marginBottom:10 }}>
                  <p style={{ fontSize:12, color:"rgba(255,255,255,0.55)", marginBottom:4 }}>Claimant: <strong style={{ color:"#F2F5FF" }}>{claim.claimant_name}</strong></p>
                  <p style={{ fontSize:12, color:"rgba(255,255,255,0.55)", marginBottom:4 }}>Phone: <strong style={{ color:"#F2F5FF" }}>{claim.claimant_phone}</strong></p>
                  <p style={{ fontSize:12, color:"rgba(255,255,255,0.55)" }}>OTP: <strong style={{ color: claim.otp_verified?"#1FBB5A":"#E8A800" }}>{claim.otp_verified?"✓ Verified":"Not verified"}</strong></p>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => rejectClaim(claim.id)} disabled={acting===claim.id} style={S.reject}>✕ Reject</button>
                  <button onClick={() => approveClaim(claim.id)} disabled={acting===claim.id} style={S.approve}>{acting===claim.id?"…":"✓ Approve Claim"}</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ALL SHOPS */}
        {tab === "all" && (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {filteredShops.map(shop => (
              <div key={shop.id} style={{ ...S.shopCard, display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ fontSize:22, flexShrink:0 }}>{shop.category?.icon??"🏪"}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:"#F2F5FF", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{shop.name}</p>
                  <p style={{ fontSize:10, color:"rgba(255,255,255,0.35)" }}>{shop.locality?.name} · {shop.category?.name}</p>
                </div>
                <span style={{ fontSize:9, fontWeight:700, padding:"3px 7px", borderRadius:100, flexShrink:0,
                  ...(shop.is_claimed ? { background:"rgba(31,187,90,0.13)", color:"#1FBB5A", border:"1px solid rgba(31,187,90,0.30)" }
                    : { background:"rgba(255,255,255,0.05)", color:"rgba(255,255,255,0.30)", border:"1px solid rgba(255,255,255,0.10)" }) }}>
                  {shop.is_claimed ? "✓ Claimed" : "Unclaimed"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* VENDORS */}
        {tab === "vendors" && (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {vendors.map((v: any) => (
              <div key={v.id} style={{ ...S.shopCard, display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:"rgba(59,130,246,0.15)", border:"1px solid rgba(59,130,246,0.28)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>👔</div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:"#F2F5FF" }}>{(v.profiles as any)?.name ?? "Vendor"}</p>
                  <p style={{ fontSize:10, color:"rgba(255,255,255,0.35)" }}>Joined {new Date((v.profiles as any)?.created_at).toLocaleDateString("en-IN")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shop preview sheet */}
      {preview && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.80)", zIndex:100, display:"flex", alignItems:"flex-end" }}
          onClick={() => setPreview(null)}>
          <div style={{ background:"#0C0F18", borderRadius:"20px 20px 0 0", padding:"20px 18px", width:"100%", maxHeight:"70vh", overflowY:"auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width:40, height:4, borderRadius:2, background:"rgba(255,255,255,0.15)", margin:"0 auto 18px" }} />
            <p style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:900, color:"#F2F5FF", marginBottom:4 }}>{preview.name}</p>
            <p style={{ fontSize:12, color:"rgba(255,255,255,0.40)", marginBottom:14 }}>{preview.locality?.name} · {preview.category?.name}</p>
            {preview.description && <p style={{ fontSize:13, color:"rgba(255,255,255,0.55)", marginBottom:14, lineHeight:1.6 }}>{preview.description}</p>}
            {[
              { label:"📍 Address",  value:preview.address },
              { label:"📞 Phone",    value:preview.phone },
              { label:"🕐 Hours",    value:preview.open_time ? `${preview.open_time} – ${preview.close_time}` : null },
            ].filter(r => r.value).map(r => (
              <div key={r.label} style={{ display:"flex", gap:10, marginBottom:8, fontSize:12 }}>
                <span style={{ color:"rgba(255,255,255,0.40)", flexShrink:0 }}>{r.label}</span>
                <span style={{ color:"#F2F5FF" }}>{r.value}</span>
              </div>
            ))}
            <div style={{ display:"flex", gap:8, marginTop:18 }}>
              <button onClick={() => { rejectShop(preview.id); setPreview(null); }}
                style={{ flex:1, padding:"12px", borderRadius:11, background:"rgba(239,68,68,0.10)", border:"1px solid rgba(239,68,68,0.22)", color:"#F87171", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                ✕ Reject
              </button>
              <button onClick={() => { approveShop(preview.id); setPreview(null); }}
                style={{ flex:2, padding:"12px", borderRadius:11, background:"#1FBB5A", color:"#fff", border:"none", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"'DM Sans',sans-serif" }}>
                ✓ Approve Shop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShopReviewCard({ shop, acting, onApprove, onReject, onPreview }: any) {
  const S = {
    card: { padding:"14px", borderRadius:14, background:"rgba(255,255,255,0.034)", border:"1px solid rgba(255,255,255,0.07)" },
    approve: { flex:1 as const, padding:"10px", borderRadius:10, background:"#1FBB5A", color:"#fff", border:"none", cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"'DM Sans',sans-serif" },
    reject:  { flex:1 as const, padding:"10px", borderRadius:10, background:"rgba(239,68,68,0.10)", border:"1px solid rgba(239,68,68,0.22)", color:"#F87171", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif" },
  };
  return (
    <div style={S.card}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:10 }}>
        <div style={{ fontSize:22, flexShrink:0 }}>{shop.category?.icon ?? "🏪"}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:800, color:"#F2F5FF", marginBottom:2 }}>{shop.name}</p>
          <p style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>{shop.category?.name} · {shop.locality?.name}</p>
          {shop.address && <p style={{ fontSize:11, color:"rgba(255,255,255,0.28)", marginTop:3 }}>📍 {shop.address}</p>}
          {shop.phone && <p style={{ fontSize:11, color:"rgba(255,255,255,0.28)" }}>📞 {shop.phone}</p>}
          {shop.description && <p style={{ fontSize:11, color:"rgba(255,255,255,0.40)", marginTop:4, lineHeight:1.5 }}>{shop.description}</p>}
        </div>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={onPreview} style={{ padding:"9px 14px", borderRadius:10, background:"rgba(255,255,255,0.05)", color:"rgba(255,255,255,0.50)", border:"none", cursor:"pointer", fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>Preview</button>
        <button onClick={onReject} disabled={acting===shop.id} style={S.reject}>✕ Reject</button>
        <button onClick={onApprove} disabled={acting===shop.id} style={S.approve}>{acting===shop.id?"…":"✓ Approve"}</button>
      </div>
    </div>
  );
}

function AdminSkel() {
  return (
    <div style={{ minHeight:"100vh", background:"#05070C", padding:14, display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ height:54, borderRadius:14 }} className="shimmer" />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
        {[1,2,3,4,5,6].map(i => <div key={i} style={{ height:68, borderRadius:12 }} className="shimmer" />)}
      </div>
      {[1,2,3].map(i => <div key={i} style={{ height:140, borderRadius:14 }} className="shimmer" />)}
    </div>
  );
}
