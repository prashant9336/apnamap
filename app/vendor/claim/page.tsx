"use client";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Step = "details" | "done";

function ClaimShopForm() {
  const params = useSearchParams();
  const shopId = params.get("shop_id");
  const router = useRouter();
  const sb = createClient();

  const [step,    setStep]    = useState<Step>("details");
  const [shop,    setShop]    = useState<any>(null);
  const [name,    setName]    = useState("");
  const [phone,   setPhone]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (!shopId) { router.push("/explore"); return; }
    sb.from("shops").select("*, locality:localities(name), category:categories(name,icon)")
      .eq("id", shopId).single()
      .then(({ data }) => { if (data) setShop(data); });
  }, [shopId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submitClaim() {
    if (!name.trim() || phone.replace(/\D/g, "").length !== 10) {
      setError("Enter your full name and a 10-digit phone number");
      return;
    }
    setLoading(true); setError("");

    const { data: existing } = await sb
      .from("shop_claim_requests")
      .select("id")
      .eq("shop_id", shopId)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      setError("A claim is already pending for this shop. Our team will review it.");
      setLoading(false); return;
    }

    const { data: { user } } = await sb.auth.getUser();
    if (!user) { router.push(`/auth/login?redirect=/vendor/claim?shop_id=${shopId}`); return; }

    const { error: claimErr } = await sb.from("shop_claim_requests").insert({
      shop_id:        shopId,
      user_id:        user.id,
      claimant_name:  name.trim(),
      claimant_phone: phone.replace(/\D/g, ""),
      status:         "pending",
    });

    if (claimErr) { setError("Could not submit claim. Please try again."); setLoading(false); return; }

    await sb.from("shops").update({ claim_status: "pending" }).eq("id", shopId);
    setLoading(false);
    setStep("done");
  }

  const S = {
    pg:    { minHeight:"100vh", background:"#05070C", fontFamily:"'DM Sans',sans-serif" },
    hdr:   { padding:"16px", display:"flex", alignItems:"center", gap:12, borderBottom:"1px solid rgba(255,255,255,0.07)" },
    body:  { padding:"20px 16px", maxWidth:480, margin:"0 auto" },
    card:  { padding:"20px", borderRadius:18, background:"rgba(255,255,255,0.034)", border:"1px solid rgba(255,255,255,0.07)", marginBottom:16 },
    label: { fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.40)", textTransform:"uppercase" as const, letterSpacing:"0.8px", marginBottom:6, display:"block" },
    input: { width:"100%", padding:"13px 14px", borderRadius:12, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", color:"#F2F5FF", fontSize:15, outline:"none", fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box" as const },
    btn:   (dis: boolean): React.CSSProperties => ({ width:"100%", padding:"14px", borderRadius:12, background:dis?"rgba(255,94,26,0.5)":"#FF5E1A", color:"#fff", border:"none", cursor:dis?"not-allowed":"pointer", fontSize:15, fontWeight:700, fontFamily:"'DM Sans',sans-serif", boxShadow:dis?"none":"0 0 24px rgba(255,94,26,0.35)" }),
    err:   { padding:"10px 13px", borderRadius:10, background:"rgba(239,68,68,0.10)", border:"1px solid rgba(239,68,68,0.22)", color:"#F87171", fontSize:12, marginBottom:12 },
  };

  if (step === "done") return (
    <div style={S.pg}>
      <div style={{ textAlign:"center", padding:"60px 20px" }}>
        <div style={{ fontSize:52, marginBottom:16 }}>🎉</div>
        <p style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:900, color:"#F2F5FF", marginBottom:8 }}>Claim Submitted!</p>
        <p style={{ fontSize:13, color:"rgba(255,255,255,0.45)", lineHeight:1.7, marginBottom:24 }}>
          Our team will review your claim within 24 hours and contact you on the number provided.
        </p>
        <button onClick={() => router.push("/explore")} style={S.btn(false)}>← Back to Explore</button>
      </div>
    </div>
  );

  return (
    <div style={S.pg}>
      <div style={S.hdr}>
        <button onClick={() => router.back()} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.50)", fontSize:20, cursor:"pointer" }}>←</button>
        <span style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:900, color:"#F2F5FF" }}>Claim This Shop</span>
      </div>

      <div style={S.body}>
        {shop && (
          <div style={S.card}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:48, height:48, borderRadius:13, background:"rgba(255,94,26,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>
                {shop.category?.icon ?? "🏪"}
              </div>
              <div>
                <p style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:800, color:"#F2F5FF", margin:0 }}>{shop.name}</p>
                <p style={{ fontSize:12, color:"rgba(255,255,255,0.40)", margin:"3px 0 0" }}>{shop.locality?.name} · {shop.category?.name}</p>
              </div>
            </div>
          </div>
        )}

        <p style={{ fontSize:13, color:"rgba(255,255,255,0.45)", lineHeight:1.7, marginBottom:20 }}>
          Enter your name and the phone number registered with this business. Our team will verify and contact you within 24 hours.
        </p>

        <div style={{ marginBottom:14 }}>
          <label style={S.label}>Your Full Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ramesh Gupta" style={S.input} />
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={S.label}>Business Phone Number</label>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g,"").slice(0,10))}
            placeholder="10-digit mobile"
            style={S.input}
            type="tel"
            inputMode="numeric"
          />
        </div>

        {error && <div style={S.err}>{error}</div>}

        <button onClick={submitClaim} disabled={loading} style={S.btn(loading)}>
          {loading ? "Submitting…" : "Submit Claim →"}
        </button>
      </div>
    </div>
  );
}

export default function ClaimShopPage() {
  return (
    <Suspense>
      <ClaimShopForm />
    </Suspense>
  );
}
