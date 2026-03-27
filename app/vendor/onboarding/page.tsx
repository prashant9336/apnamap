"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Step = 1 | 2 | 3 | 4;

const CATEGORIES = [
  { id: "", slug: "sweet-shop",   icon: "🍮", name: "Sweet Shop"   },
  { id: "", slug: "restaurant",   icon: "🍽️", name: "Restaurant"   },
  { id: "", slug: "street-food",  icon: "🍜", name: "Street Food"  },
  { id: "", slug: "grocery",      icon: "🛒", name: "Grocery"      },
  { id: "", slug: "fashion",      icon: "👗", name: "Fashion"      },
  { id: "", slug: "electronics",  icon: "📺", name: "Electronics"  },
  { id: "", slug: "salon",        icon: "✂️", name: "Salon"        },
  { id: "", slug: "mobile-repair",icon: "📱", name: "Mobile Repair"},
  { id: "", slug: "jewellery",    icon: "💍", name: "Jewellery"    },
  { id: "", slug: "pharmacy",     icon: "💊", name: "Pharmacy"     },
];

const LOCALITIES = ["Civil Lines", "Chowk Bazar", "Katra Market", "Rambagh", "Naini"];

export default function VendorOnboarding() {
  const [step, setStep]     = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [form, setForm]       = useState({
    shop_name: "", category_slug: "", description: "",
    phone: "", whatsapp: "", address: "", locality: "",
    open_time: "10:00", close_time: "21:00",
    offer_title: "", offer_type: "percent", offer_value: "",
  });
  const router   = useRouter();
  const supabase = createClient();

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    setLoading(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    // Ensure vendor record
    await supabase.from("vendors").upsert({ id: user.id }).select();
    await supabase.from("profiles").update({ role: "vendor" }).eq("id", user.id);

    // Get category ID
    const { data: cat } = await supabase.from("categories").select("id").eq("slug", form.category_slug).single();
    // Get locality ID
    const { data: loc } = await supabase.from("localities").select("id").ilike("name", `%${form.locality}%`).single();

    if (!cat || !loc) { setError("Invalid category or locality. Please try again."); setLoading(false); return; }

    const slug = form.shop_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now();

    const { data: shop, error: shopErr } = await supabase.from("shops").insert({
      vendor_id: user.id, category_id: cat.id, locality_id: loc.id,
      name: form.shop_name, slug, description: form.description,
      phone: form.phone, whatsapp: form.whatsapp || form.phone,
      address: form.address,
      lat: 25.4358, lng: 81.8463, // Default; vendor should update with GPS
      open_time: form.open_time, close_time: form.close_time,
      is_approved: false,
    }).select().single();

    if (shopErr) { setError(shopErr.message); setLoading(false); return; }

    // Add first offer if provided
    if (form.offer_title && shop) {
      await supabase.from("offers").insert({
        shop_id: shop.id, title: form.offer_title,
        discount_type: form.offer_type,
        discount_value: form.offer_value ? parseFloat(form.offer_value) : null,
        tier: 1, is_active: true,
      });
    }

    setLoading(false);
    router.push("/vendor/dashboard");
  }

  const STEPS = ["Your Shop", "Location & Hours", "First Offer", "Done!"];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(5,7,12,0.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {step > 1 && <button onClick={() => setStep((s) => (s - 1) as Step)} className="text-xl">←</button>}
        <div className="flex-1">
          <p className="font-syne font-black text-base">Add Your Shop</p>
          <p className="text-[10px]" style={{ color: "var(--t3)" }}>Step {step} of 4 · {STEPS[step - 1]}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-1.5 px-4 py-3">
        {[1,2,3,4].map((s) => (
          <div key={s} className="flex-1 h-1 rounded-full transition-all"
            style={{ background: s <= step ? "var(--accent)" : "rgba(255,255,255,0.1)" }} />
        ))}
      </div>

      <div className="px-4 pb-8">
        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-syne font-black text-xl mt-2">Tell us about your shop</h2>
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: "var(--t2)" }}>Shop Category</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c.slug} onClick={() => update("category_slug", c.slug)}
                    className="p-3 rounded-xl text-center transition-all"
                    style={form.category_slug === c.slug
                      ? { background: "rgba(255,94,26,0.14)", border: "1px solid var(--accent)", color: "var(--accent)" }
                      : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "var(--t2)" }}>
                    <div className="text-xl mb-1">{c.icon}</div>
                    <div className="text-[10px] font-semibold leading-tight">{c.name}</div>
                  </button>
                ))}
              </div>
            </div>
            {[
              { key: "shop_name",    label: "Shop Name *",        placeholder: "e.g. Gupta Sweet House" },
              { key: "description",  label: "About Your Shop",    placeholder: "What makes you special? Specialities, years in business…", area: true },
              { key: "phone",        label: "Phone Number *",     placeholder: "10-digit mobile number" },
              { key: "whatsapp",     label: "WhatsApp (optional)", placeholder: "Same as phone if blank" },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>{f.label}</label>
                {f.area ? (
                  <textarea rows={3} value={(form as any)[f.key]} onChange={(e) => update(f.key, e.target.value)}
                    placeholder={f.placeholder} className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--t1)" }} />
                ) : (
                  <input type={f.key.includes("phone") || f.key.includes("whatsapp") ? "tel" : "text"}
                    value={(form as any)[f.key]} onChange={(e) => update(f.key, e.target.value)}
                    placeholder={f.placeholder} className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--t1)" }} />
                )}
              </div>
            ))}
            <button onClick={() => { if (!form.shop_name || !form.category_slug || !form.phone) { setError("Fill shop name, category, and phone"); return; } setError(""); setStep(2); }}
              className="w-full py-3.5 rounded-xl font-bold text-white"
              style={{ background: "var(--accent)", boxShadow: "0 0 24px rgba(255,94,26,0.3)" }}>
              Next: Location & Hours →
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-syne font-black text-xl mt-2">Location & Hours</h2>
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: "var(--t2)" }}>Area / Locality</label>
              <div className="flex flex-wrap gap-2">
                {LOCALITIES.map((l) => (
                  <button key={l} onClick={() => update("locality", l)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={form.locality === l
                      ? { background: "var(--accent)", color: "#fff" }
                      : { background: "rgba(255,255,255,0.05)", color: "var(--t2)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>Full Address</label>
              <input value={form.address} onChange={(e) => update("address", e.target.value)}
                placeholder="Shop no., street, landmark, area" className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--t1)" }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[{ key: "open_time", label: "Opens at" }, { key: "close_time", label: "Closes at" }].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>{f.label}</label>
                  <input type="time" value={(form as any)[f.key]} onChange={(e) => update(f.key, e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--t1)" }} />
                </div>
              ))}
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button onClick={() => { if (!form.locality || !form.address) { setError("Fill locality and address"); return; } setError(""); setStep(3); }}
              className="w-full py-3.5 rounded-xl font-bold text-white"
              style={{ background: "var(--accent)" }}>Next: Add First Offer →</button>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-syne font-black text-xl mt-2">Add Your First Offer</h2>
            <p className="text-sm" style={{ color: "var(--t2)" }}>Shops with offers get 5× more visits. Skip if you want to add later.</p>
            {[
              { key: "offer_title", label: "Offer Title *", placeholder: "e.g. Flat 25% OFF on all sweets" },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>{f.label}</label>
                <input value={(form as any)[f.key]} onChange={(e) => update(f.key, e.target.value)}
                  placeholder={f.placeholder} className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--t1)" }} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>Type</label>
                <select value={form.offer_type} onChange={(e) => update("offer_type", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--t1)" }}>
                  <option value="percent">% Discount</option>
                  <option value="flat">Flat Amount Off</option>
                  <option value="bogo">Buy 1 Get 1</option>
                  <option value="free">Free Service</option>
                </select>
              </div>
              {(form.offer_type === "percent" || form.offer_type === "flat") && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>Value</label>
                  <input type="number" value={form.offer_value} onChange={(e) => update("offer_value", e.target.value)}
                    placeholder={form.offer_type === "percent" ? "25" : "100"} className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--t1)" }} />
                </div>
              )}
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button onClick={submit} disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-white"
              style={{ background: loading ? "rgba(255,94,26,0.5)" : "var(--accent)", boxShadow: loading ? "none" : "0 0 24px rgba(255,94,26,0.3)" }}>
              {loading ? "Submitting…" : "🚀 Submit My Shop"}
            </button>
            <button onClick={submit} disabled={loading}
              className="w-full py-2 text-sm" style={{ background: "none", border: "none", color: "var(--t3)" }}>
              Skip offer for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
