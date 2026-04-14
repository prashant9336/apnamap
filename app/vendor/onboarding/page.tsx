"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BusinessTypeDetector, {
  type CategorySelection,
} from "@/components/vendor/BusinessTypeDetector";
import type { Category } from "@/types";

type Step = 1 | 2 | 3 | 4;

export default function VendorOnboarding() {
  const router   = useRouter();
  const supabase = createClient();

  const [step, setStep]           = useState<Step>(1);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [shopResult, setResult]   = useState<{ approved: boolean; shopSlug: string } | null>(null);

  const [categories, setCategories]     = useState<Category[]>([]);
  const [localities, setLocalities]     = useState<any[]>([]);
  const [catSelection, setCatSelection] = useState<CategorySelection | null>(null);

  const [form, setForm] = useState({
    shop_name:    "",
    description:  "",
    phone:        "",
    whatsapp:     "",
    address:      "",
    locality_id:  "",
    open_time:    "10:00",
    close_time:   "21:00",
    offer_title:  "",
    offer_type:   "percent",
    offer_value:  "",
  });

  const DEFAULT_LAT = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? "25.4358");
  const DEFAULT_LNG = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? "81.8463");

  const [shopLat, setShopLat]   = useState<number | null>(null);
  const [shopLng, setShopLng]   = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsLabel, setGpsLabel] = useState<string | null>(null);

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // ── Load categories + localities ──────────────────────────
  useEffect(() => {
    async function loadMeta() {
      const [catRes, locRes] = await Promise.all([
        fetch("/api/categories"),
        supabase.from("localities").select("id, name").order("priority"),
      ]);
      const catJson = await catRes.json();
      setCategories(catJson.categories ?? []);
      setLocalities(locRes.data ?? []);
    }
    loadMeta();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── GPS capture ───────────────────────────────────────────
  async function captureLocation() {
    if (!navigator.geolocation) { setError("GPS not available"); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setShopLat(lat); setShopLng(lng);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { "User-Agent": "ApnaMap/1.0" } }
          );
          const data = await res.json();
          setGpsLabel(
            data.address?.suburb ||
            data.address?.neighbourhood ||
            data.address?.road ||
            data.address?.city ||
            "Your Location"
          );
        } catch {
          setGpsLabel(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
        setGpsLoading(false);
      },
      () => { setError("Location access denied. City centre will be used."); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // ── Final submit — calls server-side API (validation + auto-approval happen there) ──
  async function submit(skipOffer = false, offerTier: "normal"|"flash"|"big" = "normal") {
    setLoading(true); setError("");
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) { router.push("/auth/login"); return; }

      if (!catSelection?.category_id) {
        setError("Please select a category first.");
        setLoading(false); return;
      }

      const payload = {
        shop_name:              form.shop_name,
        description:            form.description || null,
        phone:                  form.phone,
        whatsapp:               form.whatsapp || form.phone,
        address:                form.address,
        locality_id:            form.locality_id,
        category_id:            catSelection.category_id,
        subcategory_id:         catSelection.subcategory_id ?? null,
        custom_business_type:   catSelection.custom_business_type || null,
        tags:                   catSelection.tags,
        ai_category_confidence: catSelection.ai_category_confidence,
        business_input_text:    catSelection.business_input_text || null,
        lat:                    shopLat ?? DEFAULT_LAT,
        lng:                    shopLng ?? DEFAULT_LNG,
        open_time:              form.open_time,
        close_time:             form.close_time,
        open_days:              ["mon","tue","wed","thu","fri","sat"],
        // Offer fields (optional)
        offer_title: skipOffer ? null : form.offer_title.trim() || null,
        offer_type:  form.offer_type,
        offer_value: form.offer_value,
        offer_tier:  offerTier,
      };

      const { data: { session } } = await supabase.auth.getSession();
      const tok = session?.access_token ?? "";

      const res = await fetch("/api/vendor/shop", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false); return;
      }

      // Show result screen (Step 4) instead of immediate redirect
      setResult({ approved: data.approved, shopSlug: data.shop?.slug ?? "" });
      setStep(4);
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "Something went wrong.");
      setLoading(false);
    }
  }

  // ── Shared input style ────────────────────────────────────
  const inp: React.CSSProperties = {
    width: "100%", padding: "12px 16px", borderRadius: 12, fontSize: 14,
    outline: "none",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    color: "var(--t1)",
  };

  const stepTitles = ["Business Type & Details", "Location & Hours", "First Offer", "Done!"];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>

      {/* ── Header ────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(5,7,12,0.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingTop: "calc(12px + env(safe-area-inset-top, 0px))" }}>
        {step > 1 && (
          <button onClick={() => setStep(s => (s - 1) as Step)} className="text-xl">←</button>
        )}
        <div className="flex-1">
          <p className="font-syne font-black text-base">Add Your Shop</p>
          <p className="text-[10px]" style={{ color: "var(--t3)" }}>
            Step {step} of 3 · {stepTitles[step - 1]}
          </p>
        </div>
      </div>

      {/* ── Progress bar (shows for steps 1–3 only) ──────── */}
      {step <= 3 && (
        <div className="flex gap-1.5 px-4 py-3">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex-1 h-1 rounded-full transition-all"
              style={{ background: s <= step ? "var(--accent)" : "rgba(255,255,255,0.1)" }} />
          ))}
        </div>
      )}

      <div className="px-4 pb-10">

        {/* ════════════════ STEP 1 ════════════════════════ */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="font-syne font-black text-xl mt-2">Tell us about your shop</h2>

            {/* Smart category detector */}
            <BusinessTypeDetector
              categories={categories}
              onChange={sel => setCatSelection(sel)}
              initial={catSelection ?? undefined}
            />

            {/* Shop details */}
            {[
              { key: "shop_name",   label: "Shop Name *",         placeholder: "e.g. Gupta Sweet House",                           type: "text" },
              { key: "description", label: "About Your Shop",      placeholder: "Specialities, years in business, what you offer…", area: true },
              { key: "phone",       label: "Phone Number *",       placeholder: "10-digit mobile number",                           type: "tel" },
              { key: "whatsapp",    label: "WhatsApp (optional)",  placeholder: "Same as phone if blank",                           type: "tel" },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>
                  {f.label}
                </label>
                {f.area ? (
                  <textarea
                    rows={3}
                    value={(form as any)[f.key]}
                    onChange={e => update(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="resize-none"
                    style={inp}
                  />
                ) : (
                  <input
                    type={f.type ?? "text"}
                    value={(form as any)[f.key]}
                    onChange={e => update(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    style={inp}
                  />
                )}
              </div>
            ))}

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              onClick={() => {
                if (!catSelection?.category_id) { setError("Please select a category first"); return; }
                if (!form.shop_name || !form.phone) { setError("Fill shop name and phone"); return; }
                setError(""); setStep(2);
              }}
              className="w-full py-3.5 rounded-xl font-bold text-white"
              style={{ background: "var(--accent)", boxShadow: "0 0 24px rgba(255,94,26,0.3)" }}
            >
              Next: Location & Hours →
            </button>
          </div>
        )}

        {/* ════════════════ STEP 2 ════════════════════════ */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-syne font-black text-xl mt-2">Location & Hours</h2>

            {/* Locality picker */}
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: "var(--t2)" }}>Area / Locality</label>
              <div className="flex flex-wrap gap-2">
                {localities.map(l => (
                  <button
                    key={l.id}
                    onClick={() => update("locality_id", l.id)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={form.locality_id === l.id
                      ? { background: "var(--accent)", color: "#fff" }
                      : { background: "rgba(255,255,255,0.05)", color: "var(--t2)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>Full Address</label>
              <input value={form.address} onChange={e => update("address", e.target.value)}
                placeholder="Shop no., street, landmark, area" style={inp} />
            </div>

            {/* GPS pin */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>Pin Shop on Map</label>
              <button type="button" onClick={captureLocation} disabled={gpsLoading}
                className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                style={shopLat
                  ? { background: "rgba(31,187,90,0.10)", border: "1px solid rgba(31,187,90,0.30)", color: "#1FBB5A" }
                  : { background: "rgba(255,94,26,0.08)", border: "1px dashed rgba(255,94,26,0.35)", color: "var(--accent)" }}
              >
                {gpsLoading ? "Detecting…" : shopLat ? <>✓ Pinned: {gpsLabel}</> : <>📍 Use My Current Location</>}
              </button>
              {!shopLat && (
                <p className="text-[10px] mt-1.5" style={{ color: "var(--t3)" }}>
                  Stand at your shop entrance and tap the button.
                </p>
              )}
            </div>

            {/* Hours */}
            <div className="grid grid-cols-2 gap-3">
              {[{ key: "open_time", label: "Opens at" }, { key: "close_time", label: "Closes at" }].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>{f.label}</label>
                  <input type="time" value={(form as any)[f.key]} onChange={e => update(f.key, e.target.value)} style={inp} />
                </div>
              ))}
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              onClick={() => {
                if (!form.locality_id || !form.address) { setError("Fill locality and address"); return; }
                setError(""); setStep(3);
              }}
              className="w-full py-3.5 rounded-xl font-bold text-white"
              style={{ background: "var(--accent)" }}
            >
              Next: Add First Offer →
            </button>
          </div>
        )}

        {/* ════════════════ STEP 3 ════════════════════════ */}
        {step === 3 && (
          <OfferStep
            form={form}
            update={update}
            inp={inp}
            error={error}
            loading={loading}
            onSubmit={submit}
          />
        )}

        {/* ════════════════ STEP 4 — Result ═══════════════ */}
        {step === 4 && shopResult && (
          <div className="flex flex-col items-center text-center py-8 space-y-5">
            {shopResult.approved ? (
              <>
                <div className="text-7xl">🎉</div>
                <div>
                  <h2 className="font-syne font-black text-2xl mb-2" style={{ color: "#1FBB5A" }}>
                    Your shop is LIVE!
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--t2)" }}>
                    Customers can discover and contact you on ApnaMap right now.
                    Add more offers from your dashboard to get more visits.
                  </p>
                </div>
                <div className="w-full space-y-2.5">
                  {shopResult.shopSlug && (
                    <a href={`/shop/${shopResult.shopSlug}`} target="_blank" rel="noreferrer"
                      className="block w-full py-3.5 rounded-xl font-bold text-center"
                      style={{ background: "rgba(31,187,90,0.12)", color: "#1FBB5A", border: "1px solid rgba(31,187,90,0.28)", textDecoration: "none" }}>
                      👀 View Your Live Shop
                    </a>
                  )}
                  <button onClick={() => router.push("/vendor/dashboard")}
                    className="w-full py-3.5 rounded-xl font-bold text-white"
                    style={{ background: "var(--accent)", boxShadow: "0 0 24px rgba(255,94,26,0.30)" }}>
                    Go to Dashboard →
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-7xl">⏳</div>
                <div>
                  <h2 className="font-syne font-black text-2xl mb-2" style={{ color: "var(--gold)" }}>
                    Shop Submitted!
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--t2)" }}>
                    Your shop is under review. We typically approve listings within a few hours.
                    You'll be notified once it goes live.
                  </p>
                </div>
                <div className="w-full p-3.5 rounded-2xl text-left"
                  style={{ background: "rgba(232,168,0,0.07)", border: "1px solid rgba(232,168,0,0.20)" }}>
                  <p className="text-xs font-bold mb-1.5" style={{ color: "var(--gold)" }}>
                    To speed up approval, make sure your listing has:
                  </p>
                  <ul className="space-y-1">
                    {[
                      "A real, specific shop name",
                      "Your correct phone number",
                      "An active offer or description",
                      "Accurate locality / address",
                    ].map(tip => (
                      <li key={tip} className="text-xs flex items-center gap-2" style={{ color: "var(--t2)" }}>
                        <span style={{ color: "var(--gold)" }}>→</span> {tip}
                      </li>
                    ))}
                  </ul>
                </div>
                <button onClick={() => router.push("/vendor/dashboard")}
                  className="w-full py-3.5 rounded-xl font-bold text-white"
                  style={{ background: "var(--accent)" }}>
                  Go to Dashboard →
                </button>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   OFFER STEP — guided first-offer flow with auto-suggest
   ══════════════════════════════════════════════════════════════ */

type OfferTier = "normal" | "flash" | "big";

// Keyword-based auto-suggest: scan offer title for urgency / value signals
function suggestOfferTier(title: string): OfferTier {
  const t = title.toLowerCase();
  const flashWords = ["today", "aaj", "limited", "few hours", "abhi", "now", "hurry", "jaldi", "tonight", "kal tak"];
  const bigWords   = ["mega", "grand", "50%", "60%", "70%", "half price", "aadha", "bumper", "dhamaka", "special"];
  if (flashWords.some(w => t.includes(w))) return "flash";
  if (bigWords.some(w => t.includes(w))) return "big";
  return "normal";
}

// Auto-suggest tier from discount value alone
function suggestFromValue(type: string, value: string): OfferTier {
  const v = parseFloat(value);
  if (!v) return "normal";
  if (type === "percent" && v >= 40) return "big";
  if (type === "flat"    && v >= 500) return "big";
  return "normal";
}

const TIER_CONFIG: Record<OfferTier, {
  label: string; emoji: string;
  hint: string;
  color: string; bg: string; border: string;
}> = {
  normal: {
    label: "Normal Offer", emoji: "🎯",
    hint: "Regular discount or promotion",
    color: "rgba(255,255,255,0.60)", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)",
  },
  flash: {
    label: "Flash Deal", emoji: "⚡",
    hint: "Time-limited — urgency boosts clicks",
    color: "#E8A800", bg: "rgba(232,168,0,0.08)", border: "rgba(232,168,0,0.30)",
  },
  big: {
    label: "Big Deal", emoji: "🔥",
    hint: "Mega offer — gets top visibility",
    color: "#FF6A30", bg: "rgba(255,94,26,0.09)", border: "rgba(255,94,26,0.32)",
  },
};

const TEMPLATES: Record<string, string[]> = {
  percent: ["Flat 25% OFF on all items", "20% discount for today", "30% OFF — limited time"],
  flat:    ["₹100 OFF on orders above ₹500", "Flat ₹50 OFF today", "₹200 cashback on first visit"],
  bogo:    ["Buy 1 Get 1 FREE today", "Buy any 2, get 1 free", "Ek lo, ek free pao"],
  free:    ["Free home delivery today", "Free consultation — first visit", "Free sample with every order"],
  other:   ["Special offer for new customers", "Walk-in discount available", "Ask us for today's special"],
};

interface OfferStepProps {
  form: { offer_title: string; offer_type: string; offer_value: string };
  update: (k: string, v: string) => void;
  inp: React.CSSProperties;
  error: string;
  loading: boolean;
  onSubmit: (skip: boolean, tier?: "normal"|"flash"|"big") => void;
}

function OfferStep({ form, update, inp, error, loading, onSubmit }: OfferStepProps) {
  const [tier, setTier] = useState<OfferTier>("normal");
  const [autoSuggested, setAutoSuggested] = useState(false);

  // Auto-suggest tier when title or value changes
  useEffect(() => {
    if (!form.offer_title && !form.offer_value) { setAutoSuggested(false); return; }
    const fromTitle = suggestOfferTier(form.offer_title);
    const fromValue = suggestFromValue(form.offer_type, form.offer_value);
    const suggested = fromTitle !== "normal" ? fromTitle : fromValue;
    if (suggested !== "normal") {
      setTier(suggested);
      setAutoSuggested(true);
    } else {
      setAutoSuggested(false);
    }
  }, [form.offer_title, form.offer_value, form.offer_type]);

  function applyTemplate(tpl: string) {
    update("offer_title", tpl);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h2 className="font-syne font-black text-xl mt-2">Add Your First Offer</h2>
        <p className="text-sm" style={{ color: "var(--t2)", marginTop: 6 }}>
          Shops with offers get <strong style={{ color: "var(--accent)" }}>3× more visits</strong>. Takes 30 seconds.
        </p>
      </div>

      {/* ── STEP A: Offer type picker ── */}
      <div>
        <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--t3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.6px" }}>
          What kind of offer?
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          {(["normal", "flash", "big"] as OfferTier[]).map(t => {
            const cfg = TIER_CONFIG[t];
            const active = tier === t;
            return (
              <button
                key={t}
                onClick={() => { setTier(t); setAutoSuggested(false); }}
                style={{
                  flex: 1, padding: "10px 6px", borderRadius: 12,
                  border: `1.5px solid ${active ? cfg.border : "rgba(255,255,255,0.08)"}`,
                  background: active ? cfg.bg : "rgba(255,255,255,0.03)",
                  cursor: "pointer", textAlign: "center",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>{cfg.emoji}</div>
                <div style={{ fontSize: "10.5px", fontWeight: 700, color: active ? cfg.color : "rgba(255,255,255,0.40)", lineHeight: 1.3 }}>
                  {cfg.label}
                </div>
              </button>
            );
          })}
        </div>
        {autoSuggested && (
          <p style={{ fontSize: "10px", color: "var(--accent)", marginTop: 6 }}>
            ✨ Auto-suggested based on your offer
          </p>
        )}
        <p style={{ fontSize: "10px", color: "var(--t3)", marginTop: 4 }}>
          {TIER_CONFIG[tier].hint}
        </p>
      </div>

      {/* ── STEP B: Discount type ── */}
      <div>
        <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--t3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.6px" }}>
          Discount type
        </p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { v: "percent", label: "% Off" },
            { v: "flat",    label: "₹ Flat" },
            { v: "bogo",    label: "Buy 1 Get 1" },
            { v: "free",    label: "Free" },
            { v: "other",   label: "Other" },
          ].map(({ v, label }) => (
            <button
              key={v}
              onClick={() => { update("offer_type", v); update("offer_value", ""); }}
              style={{
                padding: "6px 12px", borderRadius: 100, fontSize: "12px", fontWeight: 700,
                border: "none", cursor: "pointer",
                background: form.offer_type === v ? "var(--accent)" : "rgba(255,255,255,0.05)",
                color: form.offer_type === v ? "#fff" : "rgba(255,255,255,0.45)",
                outline: form.offer_type !== v ? "1px solid rgba(255,255,255,0.08)" : "none",
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Value input for numeric discount types */}
      {(form.offer_type === "percent" || form.offer_type === "flat") && (
        <div>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--t3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.6px" }}>
            {form.offer_type === "percent" ? "Discount %" : "Amount Off (₹)"}
          </label>
          <input
            type="number"
            value={form.offer_value}
            onChange={e => update("offer_value", e.target.value)}
            placeholder={form.offer_type === "percent" ? "e.g. 25" : "e.g. 100"}
            style={{ ...inp, fontSize: "18px", fontWeight: 800, textAlign: "center" as const }}
          />
        </div>
      )}

      {/* ── STEP C: Offer title ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.6px" }}>
            Offer Title
          </label>
          <span style={{ fontSize: "10px", color: "var(--t3)" }}>Quick fill ↓</span>
        </div>
        <input
          value={form.offer_title}
          onChange={e => update("offer_title", e.target.value)}
          placeholder="Describe your offer in one line…"
          style={inp}
        />
        {/* Template suggestions */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
          {(TEMPLATES[form.offer_type] ?? TEMPLATES.other).map(tpl => (
            <button
              key={tpl}
              onClick={() => applyTemplate(tpl)}
              style={{
                fontSize: "10px", padding: "4px 9px", borderRadius: 100,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
                color: "rgba(255,255,255,0.45)",
                cursor: "pointer", textAlign: "left" as const,
                transition: "all 0.15s",
              }}
            >
              {tpl}
            </button>
          ))}
        </div>
      </div>

      {/* ── Preview ── */}
      {form.offer_title && (
        <div style={{
          padding: "10px 12px", borderRadius: 10,
          background: TIER_CONFIG[tier].bg,
          border: `1px solid ${TIER_CONFIG[tier].border}`,
        }}>
          <div style={{ fontSize: "10px", fontWeight: 800, color: TIER_CONFIG[tier].color, marginBottom: 4 }}>
            {TIER_CONFIG[tier].emoji} {TIER_CONFIG[tier].label}
          </div>
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)", lineHeight: 1.4 }}>
            {form.offer_title}
          </div>
        </div>
      )}

      {error && <p style={{ fontSize: "12px", color: "#F87171" }}>{error}</p>}

      <button
        onClick={() => onSubmit(false, tier)}
        disabled={loading}
        style={{
          width: "100%", padding: "14px", borderRadius: 13,
          background: loading ? "rgba(255,94,26,0.5)" : "var(--accent)",
          color: "#fff", border: "none", cursor: loading ? "not-allowed" : "pointer",
          fontSize: 15, fontWeight: 800,
          boxShadow: loading ? "none" : "0 0 24px rgba(255,94,26,0.30)",
        }}
      >
        {loading ? "Submitting…" : "🚀 Submit My Shop"}
      </button>

      <button
        onClick={() => onSubmit(true)}
        disabled={loading}
        style={{ background: "none", border: "none", color: "var(--t3)", fontSize: 13, cursor: "pointer", padding: 0 }}
      >
        Skip offer for now
      </button>
    </div>
  );
}
