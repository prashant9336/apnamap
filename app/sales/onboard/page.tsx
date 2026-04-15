"use client";

/**
 * /sales/onboard  — Field salesman shop registration
 *
 * Step 1: Business basics  (name, phone, category)
 * Step 2: Location         (GPS capture + locality + address)
 * Step 3: Offer            (optional — auto-generated if skipped)
 * Step 4: Result screen
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Step = 1 | 2 | 3 | 4;

interface Category { id: string; name: string; icon: string; slug: string; }
interface Locality  { id: string; name: string; }

interface GpsState {
  status: "idle" | "loading" | "ok" | "error";
  lat:    number | null;
  lng:    number | null;
  label:  string;        // human-readable address from reverse-geocode
}

const EMPTY_FORM = {
  shop_name:    "",
  phone:        "",
  description:  "",
  address:      "",
  locality_id:  "",
  category_id:  "",
  offer_title:  "",
  offer_type:   "percent",
  offer_value:  "",
};

export default function SalesOnboard() {
  const [step,        setStep]       = useState<Step>(1);
  const [form,        setForm]       = useState(EMPTY_FORM);
  const [categories,  setCats]       = useState<Category[]>([]);
  const [localities,  setLocs]       = useState<Locality[]>([]);
  const [catSearch,   setCatSearch]  = useState("");
  const [gps,         setGps]        = useState<GpsState>({ status: "idle", lat: null, lng: null, label: "" });
  const [loading,     setLoading]    = useState(false);
  const [error,       setError]      = useState("");
  const [result,      setResult]     = useState<{ approved: boolean; shopSlug: string } | null>(null);
  const [token,       setToken]      = useState<string | null>(null);

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const sb = createClient();
    sb.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    Promise.all([
      fetch("/api/categories").then(r => r.json()),
      sb.from("localities").select("id, name").order("priority"),
    ]).then(([catJson, locRes]) => {
      setCats(catJson.categories ?? []);
      setLocs(locRes.data ?? []);
    });
  }, []);

  const filteredCats = catSearch.trim()
    ? categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()))
    : categories;

  /* ── GPS ─────────────────────────────────────────────────────── */
  function captureGps() {
    if (!navigator.geolocation) {
      setGps(g => ({ ...g, status: "error", label: "GPS not supported on this device" }));
      return;
    }
    setGps({ status: "loading", lat: null, lng: null, label: "" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        // Reverse geocode via Nominatim (free, no key)
        let label = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const d = await r.json();
          const a = d.address ?? {};
          const parts = [
            a.road ?? a.pedestrian ?? a.neighbourhood,
            a.suburb ?? a.village ?? a.town ?? a.city_district,
            a.city ?? a.county,
          ].filter(Boolean);
          if (parts.length) label = parts.join(", ");
          // Auto-fill address if empty
          if (!form.address && label) {
            setForm(f => ({ ...f, address: label }));
          }
        } catch { /* use raw coords */ }
        setGps({ status: "ok", lat, lng, label });
      },
      (err) => {
        const msg = err.code === 1
          ? "Location permission denied. Please allow GPS access."
          : err.code === 2
          ? "Location unavailable. Try moving outdoors."
          : "GPS timed out. Try again.";
        setGps({ status: "error", lat: null, lng: null, label: msg });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  /* ── Submit ──────────────────────────────────────────────────── */
  async function submit() {
    if (!token) { setError("Session expired — please log in again"); return; }
    setError("");
    setLoading(true);

    const payload: Record<string, unknown> = {
      shop_name:    form.shop_name.trim(),
      phone:        form.phone.trim(),
      description:  form.description.trim() || undefined,
      address:      form.address.trim()     || undefined,
      locality_id:  form.locality_id        || undefined,
      category_id:  form.category_id,
      offer_title:  form.offer_title.trim() || undefined,
      offer_type:   form.offer_type         || undefined,
      offer_value:  form.offer_value        || undefined,
    };
    if (gps.lat !== null && gps.lng !== null) {
      payload.lat = gps.lat;
      payload.lng = gps.lng;
    }

    const res = await fetch("/api/sales/shops", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
    setResult({ approved: data.approved, shopSlug: data.shop?.slug ?? "" });
    setStep(4);
  }

  /* ── Step 4 — Result ─────────────────────────────────────────── */
  if (step === 4 && result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: "var(--bg)" }}>
        <div className="text-5xl mb-4">{result.approved ? "🎉" : "⏳"}</div>
        <h1 className="font-syne font-black text-2xl mb-2">
          {result.approved ? "Shop is Live!" : "Submitted for Review"}
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--t2)" }}>
          {result.approved
            ? "The shop is now visible on ApnaMap."
            : "Admin will review and approve it shortly."}
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          {result.shopSlug && (
            <Link href={`/shop/${result.shopSlug}`}
              className="px-5 py-2.5 rounded-full text-sm font-bold text-white"
              style={{ background: "var(--accent)" }}>
              View Shop ↗
            </Link>
          )}
          <button
            onClick={() => { setForm(EMPTY_FORM); setGps({ status: "idle", lat: null, lng: null, label: "" }); setStep(1); setResult(null); setCatSearch(""); }}
            className="px-5 py-2.5 rounded-full text-sm font-semibold"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--t1)" }}>
            + Add Another Shop
          </button>
          <Link href="/sales"
            className="px-5 py-2.5 rounded-full text-sm font-semibold"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--t2)", textDecoration: "none" }}>
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  /* ── Progress bar ────────────────────────────────────────────── */
  const STEPS = ["Details", "Location", "Offer"];
  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>

      {/* Header */}
      <div className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(5,7,12,0.96)", backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          paddingTop: "calc(12px + env(safe-area-inset-top, 0px))" }}>
        {step === 1
          ? <Link href="/sales" className="text-xl leading-none">←</Link>
          : <button onClick={() => setStep(s => (s - 1) as Step)} className="text-xl leading-none">←</button>}
        <div className="flex-1">
          <p className="font-syne font-black text-base leading-tight">{STEPS[step - 1]}</p>
          <p className="text-[10px]" style={{ color: "var(--t3)" }}>Step {step} of {STEPS.length}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, background: "var(--accent)" }} />
      </div>

      <div className="px-4 py-5 space-y-4 pb-32">

        {/* ══ STEP 1 — Business Details ══════════════════════════ */}
        {step === 1 && (
          <>
            <Field label="Business Name *">
              <input type="text" value={form.shop_name} autoFocus
                placeholder="e.g. Sharma Medical Store"
                onChange={e => update("shop_name", e.target.value)}
                className="input-field" />
            </Field>

            <Field label="Owner's Mobile Number *">
              <input type="tel" inputMode="numeric" value={form.phone}
                placeholder="10-digit mobile number"
                onChange={e => update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="input-field" />
            </Field>

            <Field label="Category *">
              <input type="text" value={catSearch}
                placeholder="Search category…"
                onChange={e => setCatSearch(e.target.value)}
                className="input-field mb-2" />
              <div className="rounded-xl overflow-y-auto"
                style={{ maxHeight: 220, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
                {filteredCats.map(cat => (
                  <button key={cat.id} type="button"
                    onClick={() => { update("category_id", cat.id); setCatSearch(cat.name); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm"
                    style={{
                      background: form.category_id === cat.id ? "rgba(255,94,26,0.12)" : "transparent",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      color: form.category_id === cat.id ? "var(--accent)" : "var(--t1)",
                    }}>
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                    {form.category_id === cat.id && <span className="ml-auto text-xs">✓</span>}
                  </button>
                ))}
                {filteredCats.length === 0 && (
                  <p className="px-3 py-3 text-sm" style={{ color: "var(--t3)" }}>No match</p>
                )}
              </div>
            </Field>

            <Field label="Short Description (optional)">
              <textarea value={form.description} rows={2}
                placeholder="e.g. Wholesale medicines, home delivery available"
                onChange={e => update("description", e.target.value)}
                className="input-field" style={{ resize: "none" }} />
            </Field>
          </>
        )}

        {/* ══ STEP 2 — Location ══════════════════════════════════ */}
        {step === 2 && (
          <>
            {/* GPS capture — primary CTA */}
            <div className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
              <p className="text-xs font-semibold mb-3" style={{ color: "var(--t2)" }}>
                📍 Shop Location
              </p>

              {gps.status === "idle" && (
                <button onClick={captureGps}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-white"
                  style={{ background: "var(--accent)" }}>
                  📍 Tap to Capture GPS Location
                </button>
              )}

              {gps.status === "loading" && (
                <div className="w-full py-3.5 rounded-xl text-center text-sm font-semibold"
                  style={{ background: "rgba(255,255,255,0.06)", color: "var(--t2)" }}>
                  Getting location… 📡
                </div>
              )}

              {gps.status === "ok" && (
                <div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl mb-2"
                    style={{ background: "rgba(31,187,90,0.08)", border: "1px solid rgba(31,187,90,0.22)" }}>
                    <span className="text-lg flex-shrink-0">✅</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold" style={{ color: "#1FBB5A" }}>GPS Captured</p>
                      <p className="text-xs mt-0.5 break-words" style={{ color: "var(--t2)" }}>{gps.label}</p>
                      <p className="text-[10px] mt-0.5 font-mono" style={{ color: "var(--t3)" }}>
                        {gps.lat?.toFixed(5)}, {gps.lng?.toFixed(5)}
                      </p>
                    </div>
                  </div>
                  <button onClick={captureGps}
                    className="text-xs px-3 py-1.5 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.05)", color: "var(--t3)", border: "1px solid rgba(255,255,255,0.09)" }}>
                    ↻ Retake GPS
                  </button>
                </div>
              )}

              {gps.status === "error" && (
                <div>
                  <div className="p-3 rounded-xl mb-2"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)" }}>
                    <p className="text-xs" style={{ color: "#f87171" }}>⚠ {gps.label}</p>
                  </div>
                  <button onClick={captureGps}
                    className="w-full py-3 rounded-xl text-sm font-semibold"
                    style={{ background: "rgba(255,255,255,0.06)", color: "var(--t2)", border: "1px solid rgba(255,255,255,0.10)" }}>
                    Try Again
                  </button>
                </div>
              )}

              {gps.status === "idle" && (
                <p className="text-[10px] mt-2 text-center" style={{ color: "var(--t3)" }}>
                  Stand at the shop entrance for best accuracy
                </p>
              )}
            </div>

            {/* Locality */}
            <Field label="Area / Locality">
              <select value={form.locality_id}
                onChange={e => update("locality_id", e.target.value)}
                className="input-field">
                <option value="">Select area (optional)</option>
                {localities.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </Field>

            {/* Address */}
            <Field label="Street Address (optional)">
              <input type="text" value={form.address}
                placeholder="e.g. Near Bus Stand, Civil Lines"
                onChange={e => update("address", e.target.value)}
                className="input-field" />
              {gps.status === "ok" && !form.address && (
                <button type="button"
                  onClick={() => update("address", gps.label)}
                  className="mt-1.5 text-[10px] px-2 py-1 rounded"
                  style={{ background: "rgba(255,94,26,0.08)", color: "var(--accent)" }}>
                  Use GPS address →
                </button>
              )}
            </Field>

            {gps.status === "idle" && (
              <p className="text-[11px] px-1" style={{ color: "var(--t3)" }}>
                GPS location helps customers find the shop on the map. You can skip and add it later.
              </p>
            )}
          </>
        )}

        {/* ══ STEP 3 — Offer ═════════════════════════════════════ */}
        {step === 3 && (
          <>
            <div className="p-3.5 rounded-xl"
              style={{ background: "rgba(31,187,90,0.05)", border: "1px solid rgba(31,187,90,0.12)" }}>
              <p className="text-xs font-semibold" style={{ color: "var(--green)" }}>✓ {form.shop_name}</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--t3)" }}>
                An auto-generated offer will be created if you skip this step.
              </p>
            </div>

            <Field label="Offer Headline (optional)">
              <input type="text" value={form.offer_title}
                placeholder="e.g. 10% off on medicines today"
                onChange={e => update("offer_title", e.target.value)}
                className="input-field" />
              <p className="text-[10px] mt-1" style={{ color: "var(--t3)" }}>Hindi or English. Emojis welcome.</p>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Offer Type">
                <select value={form.offer_type}
                  onChange={e => update("offer_type", e.target.value)}
                  className="input-field">
                  <option value="percent">% Off</option>
                  <option value="flat">Flat ₹ Off</option>
                  <option value="bogo">Buy 1 Get 1</option>
                  <option value="free">Free Service</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              {(form.offer_type === "percent" || form.offer_type === "flat") && (
                <Field label="Value">
                  <input type="number" value={form.offer_value} placeholder="e.g. 10"
                    onChange={e => update("offer_value", e.target.value)}
                    className="input-field" />
                </Field>
              )}
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs px-3 py-2.5 rounded-lg"
            style={{ background: "rgba(239,68,68,0.08)", color: "#f87171" }}>
            {error}
          </p>
        )}
      </div>

      {/* ── Bottom action bar ────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-4"
        style={{ background: "rgba(5,7,12,0.97)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>

        {step === 1 && (
          <button
            onClick={() => {
              if (!form.shop_name.trim()) { setError("Business name is required"); return; }
              if (form.phone.length < 10)  { setError("Enter a valid 10-digit mobile number"); return; }
              if (!form.category_id)       { setError("Please select a category"); return; }
              setError(""); setStep(2);
            }}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm"
            style={{ background: "var(--accent)" }}>
            Next — Add Location →
          </button>
        )}

        {step === 2 && (
          <div className="flex gap-3">
            <button onClick={() => { setError(""); setStep(3); }}
              className="flex-1 py-3.5 rounded-2xl font-semibold text-sm"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--t2)" }}>
              Skip GPS →
            </button>
            <button onClick={() => { setError(""); setStep(3); }}
              className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm"
              style={{ background: gps.status === "ok" ? "var(--accent)" : "rgba(255,94,26,0.5)" }}>
              {gps.status === "ok" ? "Next — Add Offer →" : "Continue →"}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="flex gap-3">
            <button
              onClick={() => { setForm(f => ({ ...f, offer_title: "", offer_value: "" })); submit(); }}
              disabled={loading}
              className="flex-1 py-3.5 rounded-2xl font-semibold text-sm"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--t2)", opacity: loading ? 0.5 : 1 }}>
              Skip &amp; Submit
            </button>
            <button onClick={submit} disabled={loading}
              className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm"
              style={{ background: "var(--accent)", opacity: loading ? 0.6 : 1 }}>
              {loading ? "Saving…" : "Submit Shop ✓"}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .input-field {
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 14px;
          outline: none;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
          color: var(--t1);
        }
        .input-field::placeholder { color: var(--t3); }
        select.input-field { appearance: none; }
        textarea.input-field { font-family: inherit; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold mb-1.5 uppercase tracking-wide"
        style={{ color: "var(--t3)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
