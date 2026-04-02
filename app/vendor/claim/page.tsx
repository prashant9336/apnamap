"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Step = "details" | "otp" | "done";

// OTP service abstraction — swap this for Twilio/MSG91/2Factor in production
async function sendOTP(phone: string): Promise<{ success: boolean; code?: string }> {
  // In production: call your SMS API here
  // For beta: generate a 4-digit code and store it
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  console.log(`[DEV] OTP for ${phone}: ${code}`); // Remove in production
  return { success: true, code };
}

export default function ClaimShopPage() {
  const params = useSearchParams();
  const shopId = params.get("shop_id");
  const router = useRouter();
  const sb = createClient();

  const [step,      setStep]      = useState<Step>("details");
  const [shop,      setShop]      = useState<any>(null);
  const [name,      setName]      = useState("");
  const [phone,     setPhone]     = useState("");
  const [otp,       setOtp]       = useState("");
  const [sentCode,  setSentCode]  = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  useEffect(() => {
    if (!shopId) { router.push("/explore"); return; }
    sb.from("shops").select("*, locality:localities(name), category:categories(name,icon)")
      .eq("id", shopId).single()
      .then(({ data }) => { if (data) setShop(data); });
  }, [shopId]);

  async function submitDetails() {
    if (!name.trim() || phone.length < 10) { setError("Enter your full name and 10-digit phone number"); return; }
    setLoading(true); setError("");

    // Check for existing pending claim
    const { data: existing } = await sb.from("shop_claim_requests")
      .select("id").eq("shop_id", shopId).eq("status", "pending").single();
    if (existing) { setError("A claim is already pending for this shop. Our team will review it."); setLoading(false); return; }

    const result = await sendOTP(phone);
    if (!result.success) { setError("Could not send OTP. Try again."); setLoading(false); return; }

    setSentCode(result.code ?? "");
    setStep("otp");
    setLoading(false);
  }

  async function verifyAndSubmit() {
    if (otp.length !== 4) { setError("Enter the 4-digit OTP"); return; }
    // In production: verify with SMS provider. For beta: compare locally.
    const verified = sentCode === "" || otp === sentCode; // sentCode="" means server-side verified
    if (!verified) { setError("Incorrect OTP. Please try again."); return; }

    setLoading(true); setError("");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    const { error: claimErr } = await sb.from("shop_claim_requests").insert({
      shop_id:        shopId,
      user_id:        user.id,
      claimant_name:  name,
      claimant_phone: phone,
      otp_verified:   verified,
      status:         "pending",
    });

    if (claimErr) { setError("Could not submit claim. Please try again."); setLoading(false); return; }

    // Update shop claim_status to pending
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
    input: { width:"100%", padding:"13px 14px", borderRadius:12, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", color:"#F2F5FF", fontSize:15, outline:"none", fontFamily:"'DM Sans',sans-serif" },
    btn:   { width:"100%", padding:"14px", borderRadius:12, background:"#FF5E1A", color:"#fff", border:"none", cursor:"pointer", fontSize:15, fontWeight:700, fontFamily:"'DM Sans',sans-serif", boxShadow:"0 0 24px rgba(255,94,26,0.35)" },
    err:   { padding:"10px 13px", borderRadius:10, background:"rgba(239,68,68,0.10)", border:"1px solid rgba(239,68,68,0.22)", color:"#F87171", fontSize:12, marginBottom:12 },
  };

  return (
    <div style={S.pg}>
      <div style={S.hdr}>
        <button onClick={() => router.back()} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.50)", fontSize:20, cursor:"pointer" }}>←</button>
        <span style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:900, color:"#F2F5FF" }}>Claim This Shop</span>
      </div>

      <div style={S.body}>
        {/* Shop info card */}
        {shop && (
          <div style={S.card}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:48, height:48, borderRadius:13, background:"rgba(255,94,26,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>
                {shop.category?.icon ?? "🏪"}
              </div>
              <div>
                <p style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:800, color:"#F2F5FF" }}>{shop.name}</p>
                <p style={{ fontSize:12, color:"rgba(255,255,255,0.40)" }}>{shop.locality?.name} · {shop.category?.name}</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP: Details */}
        {step === "details" && (
          <>
            <p style={{ fontSize:13, color:"rgba(255,255,255,0.45)", lineHeight:1.7, marginBottom:20 }}>
              To claim this shop, enter your name and the phone number registered with this business. We'll send an OTP to verify.
            </p>
            <div style={{ marginBottom:14 }}>
              <label style={S.label}>Your Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ramesh Gupta" style={S.input} />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={S.label}>Business Phone Number</label>
              <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,"").slice(0,10))} placeholder="10-digit mobile" style={S.input} type="tel" />
            </div>
            {error && <div style={S.err}>{error}</div>}
            <button onClick={submitDetails} disabled={loading} style={{ ...S.btn, opacity:loading?0.6:1 }}>
              {loading ? "Sending OTP…" : "Send OTP →"}
            </button>
          </>
        )}

        {/* STEP: OTP */}
        {step === "otp" && (
          <>
            <div style={{ padding:"14px", borderRadius:12, background:"rgba(31,187,90,0.08)", border:"1px solid rgba(31,187,90,0.22)", marginBottom:20, fontSize:13, color:"#1FBB5A" }}>
              ✓ OTP sent to +91 {phone}
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={S.label}>Enter 4-digit OTP</label>
              <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,"").slice(0,4))}
                placeholder="_ _ _ _" style={{ ...S.input, fontSize:24, textAlign:"center", letterSpacing:12 }} type="tel" />
            </div>
            {error && <div style={S.err}>{error}</div>}
            <button onClick={verifyAndSubmit} disabled={loading} style={{ ...S.btn, opacity:loading?0.6:1 }}>
              {loading ? "Submitting…" : "Verify & Submit Claim →"}
            </button>
            <button onClick={() => { setStep("details"); setError(""); setOtp(""); }}
              style={{ width:"100%", marginTop:12, padding:"12px", borderRadius:12, background:"none", border:"1px solid rgba(255,255,255,0.10)", color:"rgba(255,255,255,0.40)", cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
              ← Change number
            </button>
          </>
        )}

        {/* STEP: Done */}
        {step === "done" && (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ fontSize:52, marginBottom:16 }}>🎉</div>
            <p style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:900, color:"#F2F5FF", marginBottom:8 }}>Claim Submitted!</p>
            <p style={{ fontSize:13, color:"rgba(255,255,255,0.45)", lineHeight:1.7, marginBottom:24 }}>
              Our team will review your claim within 24 hours. You'll be notified once approved. After approval, you'll have full control of this shop listing.
            </p>
            <button onClick={() => router.push("/explore")} style={S.btn}>← Back to Explore</button>
          </div>
        )}
      </div>
    </div>
  );
}
