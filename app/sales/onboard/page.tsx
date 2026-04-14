"use client";

/**
 * /sales/onboard
 *
 * Fast 2-step shop registration form for field salesmen.
 * No AI category wizard — direct selects for speed.
 *
 * Step 1: Business basics (name, category, locality, phone, address)
 * Step 2: Offer (optional) + submit
 * Step 3: Result screen
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Step = 1 | 2 | 3;

interface Category {
  id: string;
  name: string;
  icon: string;
  slug: string;
}

interface Locality {
  id: string;
  name: string;
}

const EMPTY_FORM = {
  shop_name:   "",
  phone:       "",
  address:     "",
  locality_id: "",
  category_id: "",
  offer_title: "",
  offer_type:  "percent",
  offer_value: "",
};

export default function SalesOnboard() {
  const [step, setStep]           = useState<Step>(1);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [categories, setCategories] = useState<Category[]>([]);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [catSearch, setCatSearch] = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [result, setResult]       = useState<{ approved: boolean; shopSlug: string } | null>(null);
  const [token, setToken]         = useState<string | null>(null);

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const sb = createClient();
    sb.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null);
    });
    // Load categories + localities in parallel
    Promise.all([
      fetch("/api/categories").then(r => r.json()),
      sb.from("localities").select("id, name").order("priority"),
    ]).then(([catJson, locRes]) => {
      setCategories(catJson.categories ?? []);
      setLocalities(locRes.data ?? []);
    });
  }, []);

  const filteredCats = catSearch.trim()
    ? categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()))
    : categories;

  async function submit() {
    if (!token) { setError("Session expired — please log in again"); return; }
    setError("");
    setLoading(true);

    const payload = {
      shop_name:   form.shop_name.trim(),
      phone:       form.phone.trim(),
      address:     form.address.trim() || undefined,
      locality_id: form.locality_id || undefined,
      category_id: form.category_id,
      offer_title: form.offer_title.trim() || undefined,
      offer_type:  form.offer_type || undefined,
      offer_value: form.offer_value || undefined,
    };

    const res = await fetch("/api/sales/shops", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      return;
    }

    setResult({ approved: data.approved, shopSlug: data.shop?.slug ?? "" });
    setStep(3);
  }

  /* ────────────────────────────────────────────────────────────── */
  /* Step 3 — Result                                                */
  /* ────────────────────────────────────────────────────────────── */
  if (step === 3 && result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: "var(--bg)" }}>
        <div className="text-5xl mb-4">{result.approved ? "🎉" : "⏳"}</div>
        <h1 className="font-syne font-black text-2xl mb-2">
          {result.approved ? "Shop is Live!" : "Shop Submitted!"}
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--t2)" }}>
          {result.approved
            ? "The shop is now visible on ApnaMap."
            : "The shop is pending review and will go live once approved."}
        </p>

        <div className="flex gap-3 flex-wrap justify-center">
          {result.shopSlug && (
            <Link
              href={`/shop/${result.shopSlug}`}
              className="px-5 py-2.5 rounded-full text-sm font-bold text-white"
              style={{ background: "var(--accent)" }}
            >
              View Shop
            </Link>
          )}
          <button
            onClick={() => { setForm(EMPTY_FORM); setStep(1); setResult(null); setCatSearch(""); }}
            className="px-5 py-2.5 rounded-full text-sm font-semibold"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--t1)" }}
          >
            + Add Another Shop
          </button>
          <Link
            href="/sales"
            className="px-5 py-2.5 rounded-full text-sm font-semibold"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--t2)" }}
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  /* ────────────────────────────────────────────────────────────── */
  /* Shared header                                                  */
  /* ────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3"
        style={{
          background: "rgba(5,7,12,0.96)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {step === 1 ? (
          <Link href="/sales" className="text-xl">←</Link>
        ) : (
          <button onClick={() => setStep(1)} className="text-xl">←</button>
        )}
        <p className="font-syne font-black text-base flex-1">
          {step === 1 ? "Shop Details" : "Add Offer (Optional)"}
        </p>
        <span className="text-xs px-2 py-1 rounded-full"
          style={{ background: "rgba(255,255,255,0.06)", color: "var(--t3)" }}>
          Step {step}/2
        </span>
      </div>

      <div className="px-4 py-5 space-y-4 pb-32">

        {/* ── STEP 1 ───────────────────────────────────────── */}
        {step === 1 && (
          <>
            {/* Shop name */}
            <Field label="Business Name *">
              <input
                type="text"
                value={form.shop_name}
                placeholder="e.g. Sharma Medical Store"
                onChange={e => update("shop_name", e.target.value)}
                autoFocus
                className="input-field"
              />
            </Field>

            {/* Phone */}
            <Field label="Owner's Mobile Number *">
              <input
                type="tel"
                inputMode="numeric"
                value={form.phone}
                placeholder="10-digit mobile number"
                onChange={e => update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="input-field"
              />
            </Field>

            {/* Category — searchable list */}
            <Field label="Category *">
              <input
                type="text"
                value={catSearch}
                placeholder="Search category…"
                onChange={e => setCatSearch(e.target.value)}
                className="input-field mb-2"
              />
              <div
                className="rounded-xl overflow-y-auto"
                style={{
                  maxHeight: 200,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.09)",
                }}
              >
                {filteredCats.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => { update("category_id", cat.id); setCatSearch(cat.name); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm"
                    style={{
                      background: form.category_id === cat.id
                        ? "rgba(255,94,26,0.12)"
                        : "transparent",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      color: form.category_id === cat.id ? "var(--accent)" : "var(--t1)",
                    }}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
                {filteredCats.length === 0 && (
                  <p className="px-3 py-3 text-sm" style={{ color: "var(--t3)" }}>No match</p>
                )}
              </div>
            </Field>

            {/* Locality */}
            <Field label="Area / Locality">
              <select
                value={form.locality_id}
                onChange={e => update("locality_id", e.target.value)}
                className="input-field"
              >
                <option value="">Select area (optional)</option>
                {localities.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </Field>

            {/* Address */}
            <Field label="Street Address (optional)">
              <input
                type="text"
                value={form.address}
                placeholder="e.g. Near Bus Stand, Civil Lines"
                onChange={e => update("address", e.target.value)}
                className="input-field"
              />
            </Field>
          </>
        )}

        {/* ── STEP 2 ───────────────────────────────────────── */}
        {step === 2 && (
          <>
            <div className="p-3.5 rounded-xl mb-1"
              style={{ background: "rgba(31,187,90,0.05)", border: "1px solid rgba(31,187,90,0.12)" }}>
              <p className="text-xs font-semibold" style={{ color: "var(--green)" }}>
                ✓ {form.shop_name}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--t3)" }}>
                An auto-generated offer will be added if you skip this step.
              </p>
            </div>

            <Field label="Offer Headline (optional)">
              <input
                type="text"
                value={form.offer_title}
                placeholder="e.g. 10% off on medicines today"
                onChange={e => update("offer_title", e.target.value)}
                className="input-field"
              />
              <p className="text-[10px] mt-1" style={{ color: "var(--t3)" }}>
                Can be in Hindi or English. Emojis welcome.
              </p>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Offer Type">
                <select
                  value={form.offer_type}
                  onChange={e => update("offer_type", e.target.value)}
                  className="input-field"
                >
                  <option value="percent">% Off</option>
                  <option value="flat">Flat ₹ Off</option>
                  <option value="bogo">Buy 1 Get 1</option>
                  <option value="free">Free Service</option>
                  <option value="other">Other</option>
                </select>
              </Field>

              {(form.offer_type === "percent" || form.offer_type === "flat") && (
                <Field label="Value">
                  <input
                    type="number"
                    value={form.offer_value}
                    placeholder="e.g. 10"
                    onChange={e => update("offer_value", e.target.value)}
                    className="input-field"
                  />
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

      {/* Bottom action bar */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-4"
        style={{ background: "rgba(5,7,12,0.97)", borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        {step === 1 ? (
          <button
            onClick={() => {
              if (!form.shop_name.trim()) { setError("Business name is required"); return; }
              if (form.phone.length < 10)  { setError("Enter a valid 10-digit mobile number"); return; }
              if (!form.category_id)       { setError("Please select a category"); return; }
              setError("");
              setStep(2);
            }}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm"
            style={{ background: "var(--accent)" }}
          >
            Next — Add Offer →
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => { setForm(f => ({ ...f, offer_title: "", offer_value: "" })); submit(); }}
              disabled={loading}
              className="flex-1 py-3.5 rounded-2xl font-semibold text-sm"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--t2)",
                opacity: loading ? 0.5 : 1,
              }}
            >
              Skip &amp; Submit
            </button>
            <button
              onClick={submit}
              disabled={loading}
              className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm"
              style={{ background: "var(--accent)", opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "Saving…" : "Submit Shop"}
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
        .input-field::placeholder {
          color: var(--t3);
        }
        select.input-field {
          appearance: none;
        }
      `}</style>
    </div>
  );
}

/* ── tiny helper ─────────────────────────────────────────────────── */
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
