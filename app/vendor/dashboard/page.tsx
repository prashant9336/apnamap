"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const QUICK_POST_TYPES = [
  { type: "flash_deal",   emoji: "⚡", label: "Flash Deal",    color: "#FF5E1A" },
  { type: "new_arrival",  emoji: "✨", label: "New Arrival",   color: "#1FBB5A" },
  { type: "stock_back",   emoji: "📦", label: "Stock Back",    color: "#3B82F6" },
  { type: "closing_soon", emoji: "🕐", label: "Closing Soon",  color: "#E8A800" },
];

export default function VendorDashboard() {
  const [user,      setUser]      = useState<any>(null);
  const [shops,     setShops]     = useState<any[]>([]);
  const [stats,     setStats]     = useState({ views:0, calls:0, whatsapp:0, saves:0 });
  const [loading,   setLoading]   = useState(true);
  const [postShop,  setPostShop]  = useState<string | null>(null);
  const [postMsg,   setPostMsg]   = useState("");
  const [postType,  setPostType]  = useState("flash_deal");
  const [posting,   setPosting]   = useState(false);
  const [postDone,  setPostDone]  = useState(false);
  const router    = useRouter();
  const supabase  = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      if (!u) { router.push("/auth/login"); return; }
      setUser(u);

      // Ensure vendor record exists
      await supabase.from("vendors").upsert({ id: u.id }).select();
      await supabase.from("profiles").update({ role: "vendor" }).eq("id", u.id);

      const { data: shopData } = await supabase
        .from("shops")
        .select("*, category:categories(name,icon), locality:localities(name), offers(*)")
        .eq("vendor_id", u.id)
        .order("created_at", { ascending: false });

      const myShops = shopData ?? [];
      setShops(myShops);

      // Analytics
      if (myShops.length > 0) {
        const ids = myShops.map((s: any) => s.id);
        const { data: ev } = await supabase
          .from("analytics_events")
          .select("event_type")
          .in("shop_id", ids);
        const events = ev ?? [];
        setStats({
          views:    events.filter((e: any) => e.event_type === "view").length,
          calls:    events.filter((e: any) => e.event_type === "call").length,
          whatsapp: events.filter((e: any) => e.event_type === "whatsapp").length,
          saves:    events.filter((e: any) => e.event_type === "save").length,
        });
      }
      setLoading(false);
    });
  }, []);

  async function sendQuickPost() {
    if (!postShop || !postMsg.trim()) return;
    setPosting(true);
    const { data: { user: u } } = await supabase.auth.getUser();
    await supabase.from("quick_posts").insert({
      shop_id:   postShop,
      user_id:   u!.id,
      post_type: postType,
      message:   postMsg.trim(),
      is_active: true,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    setPosting(false);
    setPostDone(true);
    setPostMsg("");
    setPostShop(null);
    setTimeout(() => setPostDone(false), 3000);
  }

  async function toggleOffer(offerId: string, isActive: boolean) {
    await supabase.from("offers").update({ is_active: !isActive }).eq("id", offerId);
    setShops(prev => prev.map(s => ({
      ...s,
      offers: s.offers?.map((o: any) => o.id === offerId ? { ...o, is_active: !isActive } : o),
    })));
  }

  if (loading) return <VendorSkel />;

  const S = {
    pg: { minHeight:"100vh", background:"#05070C", fontFamily:"'DM Sans',sans-serif" },
    hdr: { position:"sticky" as const, top:0, zIndex:50, display:"flex", alignItems:"center", gap:12, padding:"14px 16px", background:"rgba(5,7,12,0.97)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.07)" },
    h1:  { fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:900, color:"#F2F5FF", letterSpacing:"-0.4px", flex:1 },
    card:{ padding:"14px 15px", borderRadius:16, background:"rgba(255,255,255,0.034)", border:"1px solid rgba(255,255,255,0.07)" },
    label:{ fontSize:10, color:"rgba(255,255,255,0.35)", textTransform:"uppercase" as const, letterSpacing:"1px", fontWeight:700, marginBottom:4 },
    statN:{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:900, color:"#FF5E1A", lineHeight:1 },
    badge:(approved:boolean,active:boolean)=>({
      fontSize:9, fontWeight:700, padding:"3px 8px", borderRadius:100,
      ...(approved && active
        ? { background:"rgba(31,187,90,0.15)", color:"#1FBB5A", border:"1px solid rgba(31,187,90,0.35)" }
        : approved && !active
          ? { background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.35)", border:"1px solid rgba(255,255,255,0.10)" }
          : { background:"rgba(232,168,0,0.14)", color:"#E8A800", border:"1px solid rgba(232,168,0,0.35)" }),
    }),
    input:{ width:"100%", padding:"11px 13px", borderRadius:11, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.10)", color:"#F2F5FF", fontSize:13, outline:"none", fontFamily:"'DM Sans',sans-serif" },
  };

  return (
    <div style={S.pg}>
      {/* Header */}
      <div style={S.hdr}>
        <div style={{ width:32, height:32, borderRadius:9, background:"#FF5E1A", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, boxShadow:"0 0 16px rgba(255,94,26,0.5)" }}>🏪</div>
        <span style={S.h1}>Vendor Dashboard</span>
        <Link href="/profile" style={{ fontSize:12, color:"rgba(255,255,255,0.40)", textDecoration:"none" }}>← Profile</Link>
      </div>

      <div style={{ padding:"16px 14px", display:"flex", flexDirection:"column", gap:16 }}>

        {/* Stats row */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {[
            { label:"Views",    value:stats.views,    icon:"👁", color:"#FF5E1A" },
            { label:"Calls",    value:stats.calls,    icon:"📞", color:"#1FBB5A" },
            { label:"WhatsApp", value:stats.whatsapp, icon:"💬", color:"#25D366" },
            { label:"Saves",    value:stats.saves,    icon:"❤️", color:"#F43F5E" },
          ].map(s => (
            <div key={s.label} style={{ ...S.card, display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ fontSize:22 }}>{s.icon}</div>
              <div>
                <div style={{ ...S.statN, color:s.color, fontSize:22 }}>{s.value}</div>
                <div style={S.label}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick post done toast */}
        {postDone && (
          <div style={{ padding:"11px 14px", borderRadius:11, background:"rgba(31,187,90,0.14)", border:"1px solid rgba(31,187,90,0.30)", color:"#1FBB5A", fontSize:13, fontWeight:600 }}>
            ✓ Quick post sent! Your customers will see it in 5 minutes.
          </div>
        )}

        {/* Quick post picker */}
        {postShop && (
          <div style={{ ...S.card, background:"rgba(255,94,26,0.06)", border:"1px solid rgba(255,94,26,0.22)" }}>
            <p style={{ fontSize:13, fontWeight:700, color:"#F2F5FF", marginBottom:12 }}>📢 Quick Post</p>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
              {QUICK_POST_TYPES.map(qp => (
                <button key={qp.type} onClick={() => setPostType(qp.type)}
                  style={{ padding:"7px 12px", borderRadius:100, fontSize:11, fontWeight:700, cursor:"pointer", border:"none", fontFamily:"'DM Sans',sans-serif",
                    background: postType === qp.type ? qp.color : "rgba(255,255,255,0.07)",
                    color: postType === qp.type ? "#fff" : "rgba(255,255,255,0.45)" }}>
                  {qp.emoji} {qp.label}
                </button>
              ))}
            </div>
            <input value={postMsg} onChange={e => setPostMsg(e.target.value)}
              placeholder="Write your message… (e.g. 30% off on all sweets till 8pm)"
              style={{ ...S.input, marginBottom:10 }} />
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setPostShop(null)}
                style={{ flex:1, padding:"10px", borderRadius:10, background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.45)", border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:13 }}>
                Cancel
              </button>
              <button onClick={sendQuickPost} disabled={posting || !postMsg.trim()}
                style={{ flex:2, padding:"10px", borderRadius:10, background:posting?"rgba(255,94,26,0.5)":"#FF5E1A", color:"#fff", border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:700 }}>
                {posting ? "Posting…" : "📢 Post Now"}
              </button>
            </div>
          </div>
        )}

        {/* Shops */}
        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <p style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:800, color:"#F2F5FF" }}>My Shops</p>
            <Link href="/vendor/onboarding" style={{ fontSize:12, fontWeight:700, color:"#FF5E1A", textDecoration:"none", padding:"6px 12px", borderRadius:100, background:"rgba(255,94,26,0.10)", border:"1px solid rgba(255,94,26,0.25)" }}>
              + Add Shop
            </Link>
          </div>

          {shops.length === 0 && (
            <div style={{ ...S.card, textAlign:"center", padding:"32px 20px" }}>
              <div style={{ fontSize:36, marginBottom:10 }}>🏪</div>
              <p style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:800, color:"#F2F5FF", marginBottom:6 }}>No shops yet</p>
              <p style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginBottom:16, lineHeight:1.6 }}>Add your first shop to start getting customers from Prayagraj</p>
              <Link href="/vendor/onboarding" style={{ display:"inline-block", padding:"11px 24px", borderRadius:100, background:"#FF5E1A", color:"#fff", fontSize:13, fontWeight:700, textDecoration:"none" }}>
                Add My Shop →
              </Link>
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {shops.map((shop: any) => {
              const activeOffers = shop.offers?.filter((o: any) => o.is_active) ?? [];
              return (
                <div key={shop.id} style={S.card}>
                  {/* Shop header */}
                  <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:12 }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:"rgba(255,94,26,0.12)", border:"1px solid rgba(255,94,26,0.22)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
                      {shop.category?.icon ?? "🏪"}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                        <p style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:800, color:"#F2F5FF", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {shop.name}
                        </p>
                        <span style={S.badge(shop.is_approved, shop.is_active)}>
                          {shop.is_approved ? (shop.is_active ? "● Live" : "○ Inactive") : "⏳ Pending"}
                        </span>
                      </div>
                      <p style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>
                        {shop.category?.name} · {shop.locality?.name}
                      </p>
                    </div>
                  </div>

                  {/* Claim status */}
                  {shop.claim_status === 'pending' && (
                    <div style={{ padding:"8px 12px", borderRadius:9, background:"rgba(232,168,0,0.10)", border:"1px solid rgba(232,168,0,0.28)", marginBottom:10, fontSize:11, color:"#E8A800" }}>
                      ⏳ Claim request under review
                    </div>
                  )}

                  {/* Offer summary */}
                  <div style={{ display:"flex", alignItems:"center", gap:16, padding:"10px 12px", borderRadius:10, background:"rgba(255,255,255,0.03)", marginBottom:12, fontSize:12 }}>
                    <span style={{ color:"rgba(255,255,255,0.35)" }}>🎯 {activeOffers.length} active offers</span>
                    <span style={{ color:"rgba(255,255,255,0.35)" }}>⭐ {(shop.avg_rating||0).toFixed(1)} ({shop.review_count||0} reviews)</span>
                  </div>

                  {/* Quick post buttons */}
                  <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
                    {QUICK_POST_TYPES.map(qp => (
                      <button key={qp.type} onClick={() => { setPostShop(shop.id); setPostType(qp.type); }}
                        style={{ fontSize:11, fontWeight:600, padding:"6px 11px", borderRadius:100, border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
                          background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.55)" }}>
                        {qp.emoji} {qp.label}
                      </button>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display:"flex", gap:8 }}>
                    <Link href={`/vendor/shop?id=${shop.id}`} style={{ flex:1, padding:"10px", borderRadius:10, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.10)", color:"rgba(255,255,255,0.70)", fontSize:12, fontWeight:600, textDecoration:"none", textAlign:"center" }}>
                      ✏️ Edit Shop
                    </Link>
                    <Link href={`/vendor/offers?shop_id=${shop.id}`} style={{ flex:1, padding:"10px", borderRadius:10, background:"rgba(255,94,26,0.10)", border:"1px solid rgba(255,94,26,0.25)", color:"#FF5E1A", fontSize:12, fontWeight:600, textDecoration:"none", textAlign:"center" }}>
                      🎯 Manage Offers
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Help section */}
        <div style={{ ...S.card, background:"rgba(31,187,90,0.05)", border:"1px solid rgba(31,187,90,0.16)", textAlign:"center", padding:"20px" }}>
          <p style={{ fontSize:13, fontWeight:700, color:"#F2F5FF", marginBottom:4 }}>Need help?</p>
          <p style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginBottom:12 }}>Call our vendor support team</p>
          <a href="tel:+919999999999" style={{ display:"inline-block", padding:"10px 20px", borderRadius:100, background:"#1FBB5A", color:"#fff", fontSize:13, fontWeight:700, textDecoration:"none" }}>
            📞 Call Support
          </a>
        </div>

        <div style={{ height:24 }} />
      </div>
    </div>
  );
}

function VendorSkel() {
  return (
    <div style={{ minHeight:"100vh", background:"#05070C", padding:16, display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ height:54, borderRadius:14 }} className="shimmer" />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {[1,2,3,4].map(i => <div key={i} style={{ height:72, borderRadius:14 }} className="shimmer" />)}
      </div>
      {[1,2].map(i => <div key={i} style={{ height:180, borderRadius:16 }} className="shimmer" />)}
    </div>
  );
}
