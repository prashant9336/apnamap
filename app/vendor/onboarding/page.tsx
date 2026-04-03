"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BusinessTypeDetector, {
  type CategorySelection,
} from "@/components/vendor/BusinessTypeDetector";
import type { Category } from "@/types";

type Step = 1 | 2 | 3;

export default function VendorOnboarding() {
  const router   = useRouter();
  const supabase = createClient();

  const [step, setStep]       = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

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

  // ── Final submit ──────────────────────────────────────────
  async function submit(skipOffer = false) {
    setLoading(true); setError("");
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) { router.push("/auth/login"); return; }

      await supabase.auth.updateUser({ data: { role: "vendor" } });

      if (!catSelection?.category_id || !form.locality_id) {
        setError("Please select a category and locality.");
        setLoading(false); return;
      }

      await Promise.all([
        supabase.from("vendors").upsert({ id: user.id }),
        supabase.from("profiles").upsert({ id: user.id, role: "vendor" }),
      ]);

      const slugBase = form.shop_name
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const slug = `${slugBase}-${Date.now()}`;

      const { data: shop, error: shopErr } = await supabase
        .from("shops")
        .insert({
          vendor_id:              user.id,
          category_id:            catSelection.category_id,
          subcategory_id:         catSelection.subcategory_id ?? null,
          custom_business_type:   catSelection.custom_business_type || null,
          tags:                   catSelection.tags,
          ai_category_confidence: catSelection.ai_category_confidence,
          business_input_text:    catSelection.business_input_text || null,
          locality_id:            form.locality_id,
          name:                   form.shop_name,
          slug,
          description:            form.description || null,
          phone:                  form.phone,
          whatsapp:               form.whatsapp || form.phone,
          address:                form.address,
          lat:                    shopLat ?? DEFAULT_LAT,
          lng:                    shopLng ?? DEFAULT_LNG,
          open_time:              form.open_time,
          close_time:             form.close_time,
          is_approved: false,
          is_active:   true,
          is_featured: false,
          open_days:   ["mon","tue","wed","thu","fri","sat"],
        })
        .select()
        .single();

      if (shopErr || !shop) {
        setError(shopErr?.message || "Failed to create shop.");
        setLoading(false); return;
      }

      if (!skipOffer && form.offer_title.trim()) {
        await supabase.from("offers").insert({
          shop_id:        shop.id,
          title:          form.offer_title.trim(),
          discount_type:  form.offer_type,
          discount_value: form.offer_value && !isNaN(Number(form.offer_value))
                            ? parseFloat(form.offer_value) : null,
          tier:       1,
          is_active:  true,
          is_featured: false,
        });
      }

      router.push("/vendor/dashboard");
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
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

  const stepTitles = ["Business Type & Details", "Location & Hours", "First Offer"];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>

      {/* ── Header ────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(5,7,12,0.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
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

      {/* ── Progress bar ─────────────────────────────────── */}
      <div className="flex gap-1.5 px-4 py-3">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex-1 h-1 rounded-full transition-all"
            style={{ background: s <= step ? "var(--accent)" : "rgba(255,255,255,0.1)" }} />
        ))}
      </div>

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
          <div className="space-y-4">
            <h2 className="font-syne font-black text-xl mt-2">Add Your First Offer</h2>
            <p className="text-sm" style={{ color: "var(--t2)" }}>
              Shops with offers get more visits. You can skip this for now.
            </p>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>Offer Title</label>
              <input value={form.offer_title} onChange={e => update("offer_title", e.target.value)}
                placeholder="e.g. Flat 25% OFF on all sweets" style={inp} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>Type</label>
                <select value={form.offer_type} onChange={e => update("offer_type", e.target.value)} style={inp}>
                  <option value="percent">% Discount</option>
                  <option value="flat">Flat Amount Off</option>
                  <option value="bogo">Buy 1 Get 1</option>
                  <option value="free">Free Service</option>
                  <option value="other">Other</option>
                </select>
              </div>
              {(form.offer_type === "percent" || form.offer_type === "flat") && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>Value</label>
                  <input type="number" value={form.offer_value} onChange={e => update("offer_value", e.target.value)}
                    placeholder={form.offer_type === "percent" ? "25" : "100"} style={inp} />
                </div>
              )}
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button onClick={() => submit(false)} disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-white"
              style={{ background: loading ? "rgba(255,94,26,0.5)" : "var(--accent)", boxShadow: loading ? "none" : "0 0 24px rgba(255,94,26,0.3)" }}>
              {loading ? "Submitting…" : "🚀 Submit My Shop"}
            </button>

            <button onClick={() => submit(true)} disabled={loading}
              className="w-full py-2 text-sm"
              style={{ background: "none", border: "none", color: "var(--t3)" }}>
              Skip offer for now
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
