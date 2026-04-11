"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Shared style tokens ───────────────────────────────────────────
const S = {
  page:  {
    minHeight: "100vh", background: "#05070C",
    display: "flex", flexDirection: "column" as const,
    alignItems: "center", padding: "24px 20px 48px",
  },
  card:  { width: "100%", maxWidth: 420 },
  label: {
    display: "block" as const, fontSize: 11, fontWeight: 700,
    color: "rgba(255,255,255,0.40)", textTransform: "uppercase" as const,
    letterSpacing: "0.8px", marginBottom: 7,
  },
  input: {
    width: "100%", padding: "13px 14px", borderRadius: 12,
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    color: "#F2F5FF", fontSize: 15, outline: "none",
    fontFamily: "'DM Sans',sans-serif", display: "block",
    boxSizing: "border-box" as const,
  },
  textarea: {
    width: "100%", padding: "13px 14px", borderRadius: 12,
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    color: "#F2F5FF", fontSize: 14, outline: "none",
    fontFamily: "'DM Sans',sans-serif", resize: "none" as const,
    boxSizing: "border-box" as const,
  },
  err: {
    padding: "10px 13px", borderRadius: 10,
    background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)",
    color: "#F87171", fontSize: 12, marginBottom: 4,
  },
  info: {
    padding: "10px 14px", borderRadius: 11,
    background: "rgba(232,168,0,0.08)", border: "1px solid rgba(232,168,0,0.22)",
    fontSize: 12, color: "#E8A800", lineHeight: 1.5,
  } as React.CSSProperties,
  btn: (disabled: boolean): React.CSSProperties => ({
    width: "100%", padding: "14px", borderRadius: 13,
    background: disabled ? "rgba(255,94,26,0.45)" : "#FF5E1A",
    color: "#fff", border: "none", cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 15, fontWeight: 800, fontFamily: "'DM Sans',sans-serif",
    boxShadow: disabled ? "none" : "0 0 24px rgba(255,94,26,0.35)",
  }),
  btnGhost: {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)",
    color: "rgba(255,255,255,0.55)", borderRadius: 13, padding: "13px",
    fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%",
    fontFamily: "'DM Sans',sans-serif",
  } as React.CSSProperties,
  chip: (active: boolean): React.CSSProperties => ({
    padding: "7px 13px", borderRadius: 100, fontSize: 12, fontWeight: 600,
    border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
    flexShrink: 0,
    background: active ? "#FF5E1A" : "rgba(255,255,255,0.06)",
    color:      active ? "#fff" : "rgba(255,255,255,0.50)",
    outline:    active ? "none" : "1px solid rgba(255,255,255,0.10)",
  }),
};

type Step = "account" | "shop" | "offer";
const STEPS: Step[] = ["account", "shop", "offer"];

interface AccountForm {
  owner_name: string;
  mobile:     string;
  password:   string;
  confirm:    string;
}

interface ShopForm {
  shop_name:   string;
  category_id: string;
  locality_id: string;
  address:     string;
  description: string;
  shop_phone:  string;
  lat:         number | null;
  lng:         number | null;
}

interface OfferForm {
  title:          string;
  deal_type:      string;
  discount_value: string;
  expiry_hours:   number;
}

// ── GPS button ─────────────────────────────────────────────────────
function GpsButton({ onCapture }: { onCapture: (lat: number, lng: number) => void }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "err">("idle");
  function capture() {
    if (!navigator.geolocation) { setState("err"); return; }
    setState("loading");
    navigator.geolocation.getCurrentPosition(
      pos => { onCapture(pos.coords.latitude, pos.coords.longitude); setState("done"); },
      ()  => setState("err"),
      { timeout: 8000 }
    );
  }
  const label = { idle: "📍 Pin My Location", loading: "Locating…", done: "✓ Location Pinned", err: "❌ Location Failed" }[state];
  return (
    <button type="button" onClick={capture} disabled={state === "loading"}
      style={{ ...S.btnGhost, fontSize: 13, padding: "11px", color: state === "done" ? "#1FBB5A" : state === "err" ? "#F87171" : "rgba(255,255,255,0.55)" }}>
      {label}
    </button>
  );
}

// ── Main wizard form ───────────────────────────────────────────────
function VendorJoinWizard() {
  const router   = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>("account");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [done,    setDone]    = useState(false);

  const [localities,  setLocalities]  = useState<{ id: string; name: string }[]>([]);
  const [categories,  setCategories]  = useState<{ id: string; name: string; icon: string }[]>([]);
  const [showPw,     setShowPw]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [account, setAccount] = useState<AccountForm>({
    owner_name: "", mobile: "", password: "", confirm: "",
  });
  const [shop, setShop] = useState<ShopForm>({
    shop_name: "", category_id: "", locality_id: "",
    address: "", description: "", shop_phone: "", lat: null, lng: null,
  });
  const [offer, setOffer] = useState<OfferForm>({
    title: "", deal_type: "percent", discount_value: "", expiry_hours: 24,
  });

  const upA = (k: keyof AccountForm, v: string) => setAccount(f => ({ ...f, [k]: v }));
  const upS = (k: keyof ShopForm, v: string | number | null) =>
    setShop(f => ({ ...f, [k]: v }));
  const upO = (k: keyof OfferForm, v: string | number) => setOffer(f => ({ ...f, [k]: v }));

  // Load localities + categories once
  useEffect(() => {
    Promise.all([fetch("/api/localities"), fetch("/api/categories")]).then(
      async ([locRes, catRes]) => {
        if (locRes.ok) { const j = await locRes.json(); setLocalities(j.localities ?? j ?? []); }
        if (catRes.ok) { const j = await catRes.json(); setCategories(j.categories ?? []); }
      }
    );
  }, []);

  const stepIdx = STEPS.indexOf(step);

  // ── Validate step-by-step before advancing ──────────────────────
  function validateAccount(): string {
    const digits = account.mobile.replace(/\D/g, "");
    if (!account.owner_name.trim())     return "Owner name is required";
    if (digits.length !== 10)           return "Enter a valid 10-digit mobile number";
    if (account.password.length < 6)    return "Password must be at least 6 characters";
    if (account.password !== account.confirm) return "Passwords do not match";
    return "";
  }

  function validateShop(): string {
    if (!shop.shop_name.trim())  return "Shop name is required";
    if (!shop.category_id)       return "Please select a category";
    if (!shop.locality_id)       return "Please select a locality";
    return "";
  }

  function nextStep() {
    setError("");
    if (step === "account") {
      const e = validateAccount();
      if (e) { setError(e); return; }
      setStep("shop");
    } else if (step === "shop") {
      const e = validateShop();
      if (e) { setError(e); return; }
      setStep("offer");
    }
  }

  function prevStep() {
    setError("");
    if (step === "shop")  setStep("account");
    if (step === "offer") setStep("shop");
  }

  // ── Final submit ────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent, skipOffer = false) {
    e.preventDefault();
    setError("");

    const shopValidErr = validateShop();
    if (shopValidErr) { setStep("shop"); setError(shopValidErr); return; }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        owner_name:   account.owner_name.trim(),
        mobile:       account.mobile.replace(/\D/g, ""),
        password:     account.password,
        shop_name:    shop.shop_name.trim(),
        category_id:  shop.category_id,
        locality_id:  shop.locality_id,
        address:      shop.address.trim()      || undefined,
        description:  shop.description.trim()  || undefined,
        shop_phone:   shop.shop_phone.trim()   || undefined,
        ...(shop.lat !== null && shop.lng !== null
          ? { lat: shop.lat, lng: shop.lng }
          : {}),
      };

      if (!skipOffer && offer.title.trim()) {
        payload.offer = {
          title:          offer.title.trim(),
          deal_type:      offer.deal_type,
          discount_value: offer.discount_value ? Number(offer.discount_value) : undefined,
          expiry_hours:   offer.expiry_hours,
          tier:           3,
        };
      }

      const res  = await fetch("/api/vendor/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.alreadyExists) {
          setError("An account already exists for this mobile number.");
          setStep("account");
        } else {
          setError(data.error ?? "Something went wrong. Please try again.");
        }
        return;
      }

      // Hydrate Supabase session so vendor is logged in immediately
      if (data.access_token && data.refresh_token) {
        await supabase.auth.setSession({
          access_token:  data.access_token,
          refresh_token: data.refresh_token,
        });
      }

      setDone(true);
      setTimeout(() => {
        window.location.href = "/my-shop";
      }, 1600);

    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Success screen ───────────────────────────────────────────────
  if (done) {
    return (
      <div style={S.page}>
        <div style={{ textAlign: "center", paddingTop: 40 }}>
          <div style={{
            width: 68, height: 68, borderRadius: "50%",
            background: "rgba(31,187,90,0.15)", border: "2px solid rgba(31,187,90,0.40)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, margin: "0 auto 20px",
          }}>
            ✓
          </div>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 900, color: "#F2F5FF", marginBottom: 8 }}>
            Shop Registered!
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, maxWidth: 300, margin: "0 auto" }}>
            Your shop is under review. We&apos;ll activate it within 24 hours. Taking you to your dashboard…
          </p>
        </div>
      </div>
    );
  }

  // ── Step meta ────────────────────────────────────────────────────
  const meta = {
    account: { icon: "👤", title: "Your Account",  sub: "Owner details and login credentials" },
    shop:    { icon: "🏪", title: "Your Shop",     sub: "Shop details, location and category" },
    offer:   { icon: "🎯", title: "First Offer",   sub: "Optional — add an offer to attract customers" },
  }[step];

  const digits = account.mobile.replace(/\D/g, "");

  return (
    <div style={S.page}>
      <div style={S.card}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: "#FF5E1A",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, margin: "0 auto 14px", boxShadow: "0 0 28px rgba(255,94,26,0.45)",
          }}>
            {meta.icon}
          </div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 900, color: "#F2F5FF", letterSpacing: "-0.4px", marginBottom: 5 }}>
            {meta.title}
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.40)" }}>{meta.sub}</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: stepIdx >= i ? "#FF5E1A" : "rgba(255,255,255,0.10)",
              transition: "background .3s",
            }} />
          ))}
        </div>

        {/* ── STEP 1: Account ─────────────────────────────────────────── */}
        {step === "account" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Owner name */}
            <div>
              <label style={S.label}>Your Full Name *</label>
              <input
                type="text"
                value={account.owner_name}
                onChange={e => upA("owner_name", e.target.value)}
                placeholder="e.g. Ramesh Gupta"
                style={S.input}
                autoFocus
              />
            </div>

            {/* Mobile */}
            <div>
              <label style={S.label}>Mobile Number *</label>
              <div style={{ display: "flex", gap: 9 }}>
                <div style={{
                  padding: "13px 12px", borderRadius: 12, flexShrink: 0,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                  fontSize: 15, fontWeight: 700, color: "#F2F5FF",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  🇮🇳 <span style={{ color: "rgba(255,255,255,0.55)" }}>+91</span>
                </div>
                <input
                  type="tel" inputMode="numeric"
                  value={account.mobile}
                  onChange={e => upA("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit number"
                  style={{ ...S.input, flex: 1 }}
                />
              </div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 6 }}>
                This will be your login. Customers will also see it on your shop page.
              </p>
            </div>

            {/* Password */}
            <div>
              <label style={S.label}>Password *</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  value={account.password}
                  onChange={e => upA("password", e.target.value)}
                  placeholder="At least 6 characters"
                  style={{ ...S.input, paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "rgba(255,255,255,0.40)" }}>
                  {showPw ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label style={S.label}>Confirm Password *</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirm ? "text" : "password"}
                  value={account.confirm}
                  onChange={e => upA("confirm", e.target.value)}
                  placeholder="Re-enter password"
                  style={{ ...S.input, paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowConfirm(p => !p)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "rgba(255,255,255,0.40)" }}>
                  {showConfirm ? "🙈" : "👁"}
                </button>
              </div>
              {account.confirm && account.password !== account.confirm && (
                <p style={{ fontSize: 11, color: "#F87171", marginTop: 5 }}>Passwords don&apos;t match</p>
              )}
            </div>

            {error && <div style={S.err}>{error}</div>}

            <button type="button" onClick={nextStep}
              disabled={!account.owner_name.trim() || digits.length !== 10 || account.password.length < 6 || account.password !== account.confirm}
              style={S.btn(!account.owner_name.trim() || digits.length !== 10 || account.password.length < 6 || account.password !== account.confirm)}>
              Next: Shop Details →
            </button>

            <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.30)", marginTop: 4 }}>
              Already have an account?{" "}
              <a href="/vendor/login" style={{ color: "#FF5E1A", fontWeight: 700, textDecoration: "none" }}>
                Login
              </a>
            </p>
          </div>
        )}

        {/* ── STEP 2: Shop ─────────────────────────────────────────────── */}
        {step === "shop" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Shop name */}
            <div>
              <label style={S.label}>Shop / Business Name *</label>
              <input
                type="text"
                value={shop.shop_name}
                onChange={e => upS("shop_name", e.target.value)}
                placeholder="e.g. Gupta Sweet House"
                style={S.input}
                autoFocus
              />
            </div>

            {/* Category */}
            {categories.length > 0 && (
              <div>
                <label style={S.label}>Business Category *</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {categories.map(c => (
                    <button
                      key={c.id} type="button"
                      onClick={() => upS("category_id", shop.category_id === c.id ? "" : c.id)}
                      style={S.chip(shop.category_id === c.id)}
                    >
                      {c.icon} {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Locality */}
            {localities.length > 0 && (
              <div>
                <label style={S.label}>Area / Locality *</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {localities.map(l => (
                    <button
                      key={l.id} type="button"
                      onClick={() => upS("locality_id", shop.locality_id === l.id ? "" : l.id)}
                      style={S.chip(shop.locality_id === l.id)}
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Address */}
            <div>
              <label style={S.label}>Shop Address</label>
              <input
                type="text"
                value={shop.address}
                onChange={e => upS("address", e.target.value)}
                placeholder="Building, street, landmark"
                style={S.input}
              />
            </div>

            {/* Description */}
            <div>
              <label style={S.label}>Short Description</label>
              <textarea
                rows={2}
                value={shop.description}
                onChange={e => upS("description", e.target.value)}
                placeholder="What makes your shop special?"
                style={S.textarea}
              />
            </div>

            {/* Shop phone (optional — defaults to owner mobile) */}
            <div>
              <label style={S.label}>Shop Contact Number</label>
              <input
                type="tel" inputMode="numeric"
                value={shop.shop_phone}
                onChange={e => upS("shop_phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder={`Default: +91 ${account.mobile || "your mobile"}`}
                style={S.input}
              />
            </div>

            {/* GPS pin */}
            <div>
              <label style={S.label}>Shop Location</label>
              <GpsButton onCapture={(lat, lng) => { upS("lat", lat); upS("lng", lng); }} />
              {shop.lat !== null && (
                <p style={{ fontSize: 11, color: "#1FBB5A", marginTop: 5 }}>
                  📍 {shop.lat.toFixed(5)}, {shop.lng?.toFixed(5)}
                </p>
              )}
            </div>

            {error && <div style={S.err}>{error}</div>}

            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={prevStep} style={{ ...S.btnGhost, flex: "none", width: "auto", padding: "13px 20px" }}>
                ← Back
              </button>
              <button type="button" onClick={nextStep}
                disabled={!shop.shop_name.trim() || !shop.category_id || !shop.locality_id}
                style={{ ...S.btn(!shop.shop_name.trim() || !shop.category_id || !shop.locality_id), flex: 1 }}>
                Next: Add Offer →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Offer ─────────────────────────────────────────────── */}
        {step === "offer" && (
          <form onSubmit={e => handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={S.info}>
              🎯 Adding a launch offer helps your shop appear higher and attract first customers.
            </div>

            {/* Offer title */}
            <div>
              <label style={S.label}>Offer Title</label>
              <input
                type="text"
                value={offer.title}
                onChange={e => upO("title", e.target.value)}
                placeholder="e.g. 10% off on first order"
                style={S.input}
                autoFocus
              />
            </div>

            {/* Deal type */}
            <div>
              <label style={S.label}>Deal Type</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {[
                  { v: "percent",  label: "% Off" },
                  { v: "flat",     label: "₹ Flat Off" },
                  { v: "bogo",     label: "Buy 1 Get 1" },
                  { v: "free",     label: "Free Item" },
                  { v: "other",    label: "Other" },
                ].map(opt => (
                  <button key={opt.v} type="button"
                    onClick={() => upO("deal_type", opt.v)}
                    style={S.chip(offer.deal_type === opt.v)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Discount value */}
            {(offer.deal_type === "percent" || offer.deal_type === "flat") && (
              <div>
                <label style={S.label}>
                  {offer.deal_type === "percent" ? "Discount %" : "Flat Discount (₹)"}
                </label>
                <input
                  type="number" inputMode="numeric"
                  value={offer.discount_value}
                  onChange={e => upO("discount_value", e.target.value)}
                  placeholder={offer.deal_type === "percent" ? "e.g. 10" : "e.g. 50"}
                  min={1} max={offer.deal_type === "percent" ? 90 : undefined}
                  style={S.input}
                />
              </div>
            )}

            {/* Expiry */}
            <div>
              <label style={S.label}>Offer Valid For</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {[
                  { v: 24,  label: "1 Day" },
                  { v: 72,  label: "3 Days" },
                  { v: 168, label: "1 Week" },
                  { v: 720, label: "1 Month" },
                  { v: 0,   label: "No Expiry" },
                ].map(opt => (
                  <button key={opt.v} type="button"
                    onClick={() => upO("expiry_hours", opt.v)}
                    style={S.chip(offer.expiry_hours === opt.v)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <div style={S.err}>{error}</div>}

            <button type="submit" disabled={loading} style={S.btn(loading)}>
              {loading ? "Creating your shop…" : "🚀 Submit & Open My Shop"}
            </button>

            <button type="button" disabled={loading}
              onClick={e => handleSubmit(e as unknown as React.FormEvent, true)}
              style={{ ...S.btnGhost, opacity: loading ? 0.5 : 1 }}>
              Skip offer — submit anyway
            </button>

            <button type="button" onClick={prevStep}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 13, cursor: "pointer", marginTop: 4 }}>
              ← Back to shop details
            </button>
          </form>
        )}

      </div>
    </div>
  );
}

export default function VendorJoinPage() {
  return (
    <Suspense>
      <VendorJoinWizard />
    </Suspense>
  );
}
