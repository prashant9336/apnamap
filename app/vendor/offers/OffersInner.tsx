"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const EMPTY_OFFER = {
  title: "",
  description: "",
  discount_type: "percent",
  discount_value: "",
  coupon_code: "",
  ends_at: "",
  tier: "2",
};

export default function OffersInner() {
  const params = useSearchParams();
  const shopId = params.get("shop_id");

  const supabase = createClient();
  const [token, setToken] = useState("");

  const [offers, setOffers] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY_OFFER);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Get session token on mount for Bearer auth (mobile-reliable)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token ?? "");
    });

    if (!shopId) return;

    supabase
      .from("offers")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setOffers(data ?? []));
  }, [shopId]);

  async function saveOffer() {
    setSaving(true);

    const payload = {
      shop_id: shopId,
      ...form,
      discount_value: form.discount_value
        ? parseFloat(form.discount_value)
        : null,
      // Tier clamped to 2–3: vendors cannot self-assign Big Deal (tier 1)
      tier: Math.max(2, Math.min(3, parseInt(form.tier) || 2)),
      ends_at: form.ends_at || null,
    };

    const r = await fetch("/api/offers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    const d = await r.json();

    if (d.offer) {
      setOffers((p) => [d.offer, ...p]);
      setForm(EMPTY_OFFER);
      setAdding(false);
    }

    setSaving(false);
  }

  async function toggleOffer(id: string, is_active: boolean) {
    await supabase
      .from("offers")
      .update({ is_active: !is_active })
      .eq("id", id);

    setOffers((p) =>
      p.map((o) => (o.id === id ? { ...o, is_active: !is_active } : o))
    );
  }

  async function deleteOffer(id: string) {
    await supabase.from("offers").delete().eq("id", id);
    setOffers((p) => p.filter((o) => o.id !== id));
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div
        className="sticky top-0 z-50 flex items-center gap-3 px-4 py-3"
        style={{
          background: "rgba(5,7,12,0.96)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
        }}
      >
        <button onClick={() => history.back()} className="text-xl">
          ←
        </button>
        <p className="font-syne font-black text-base flex-1">Manage Offers</p>
        <button
          onClick={() => setAdding(true)}
          className="px-3 py-1.5 rounded-full text-xs font-bold text-white"
          style={{ background: "var(--accent)" }}
        >
          + New Offer
        </button>
      </div>

      <div className="px-4 py-4">
        {adding && (
          <div
            className="p-4 rounded-2xl mb-4"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <p className="font-syne font-bold text-sm mb-3">New Offer</p>

            <div className="space-y-3">
              {[
                {
                  k: "title",
                  label: "Title *",
                  type: "text",
                  ph: "e.g. Flat 25% OFF on all items",
                },
                {
                  k: "description",
                  label: "Description",
                  type: "text",
                  ph: "Terms and conditions",
                },
                {
                  k: "coupon_code",
                  label: "Coupon Code",
                  type: "text",
                  ph: "SAVE25 (optional)",
                },
                {
                  k: "ends_at",
                  label: "Expiry Date",
                  type: "date",
                  ph: "",
                },
              ].map((f) => (
                <div key={f.k}>
                  <label
                    className="block text-[10px] font-semibold mb-1"
                    style={{ color: "var(--t3)" }}
                  >
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    value={(form as any)[f.k]}
                    placeholder={f.ph}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, [f.k]: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      color: "var(--t1)",
                    }}
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-[10px] font-semibold mb-1"
                    style={{ color: "var(--t3)" }}
                  >
                    Discount Type
                  </label>
                  <select
                    value={form.discount_type}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, discount_type: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      color: "var(--t1)",
                    }}
                  >
                    <option value="percent">% Off</option>
                    <option value="flat">Flat ₹ Off</option>
                    <option value="bogo">Buy 1 Get 1</option>
                    <option value="free">Free Service</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {(form.discount_type === "percent" ||
                  form.discount_type === "flat") && (
                  <div>
                    <label
                      className="block text-[10px] font-semibold mb-1"
                      style={{ color: "var(--t3)" }}
                    >
                      Value
                    </label>
                    <input
                      type="number"
                      value={form.discount_value}
                      placeholder="25"
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          discount_value: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        color: "var(--t1)",
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label
                  className="block text-[10px] font-semibold mb-1"
                  style={{ color: "var(--t3)" }}
                >
                  Offer Priority
                </label>
                <select
                  value={form.tier}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, tier: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: "var(--t1)",
                  }}
                >
                  <option value="2">⚡ Normal Offer</option>
                  <option value="3">🟢 Basic Listing</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setAdding(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--t2)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveOffer}
                disabled={saving || !form.title}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{
                  background: "var(--accent)",
                  opacity: saving || !form.title ? 0.5 : 1,
                }}
              >
                {saving ? "Saving…" : "Save Offer"}
              </button>
            </div>
          </div>
        )}

        {offers.length === 0 && !adding && (
          <div className="text-center py-12" style={{ color: "var(--t2)" }}>
            <div className="text-4xl mb-3">🎯</div>
            <p className="font-semibold">No offers yet</p>
            <p className="text-sm mt-1" style={{ color: "var(--t3)" }}>
              Shops with offers get 5× more visits
            </p>
          </div>
        )}

        <div className="space-y-3">
          {offers.map((offer) => {
            const isAuto = offer.source_type === "auto_generated";
            return (
            <div
              key={offer.id}
              className="p-4 rounded-2xl"
              style={{
                background: isAuto
                  ? "rgba(167,139,250,0.05)"
                  : offer.is_active ? "rgba(255,255,255,0.034)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${isAuto ? "rgba(167,139,250,0.22)" : offer.is_active ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)"}`,
                opacity: offer.is_active ? 1 : 0.55,
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  {isAuto && (
                    <p className="text-[9px] font-black uppercase tracking-wide mb-1" style={{ color: "#a78bfa" }}>
                      ✦ Starter offer — tap edit to personalise
                    </p>
                  )}
                  <p className="font-bold text-sm">{offer.title}</p>
                  {offer.description && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>
                      {offer.description}
                    </p>
                  )}
                </div>

                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{
                    background:
                      offer.tier === 1
                        ? "rgba(255,80,0,0.15)"
                        : "rgba(255,255,255,0.06)",
                    color: offer.tier === 1 ? "#FF6830" : "var(--t3)",
                  }}
                >
                  T{offer.tier}
                </span>
              </div>

              <div
                className="flex items-center gap-2 text-xs mb-3"
                style={{ color: "var(--t3)" }}
              >
                {offer.coupon_code && (
                  <span
                    className="font-mono px-1.5 py-0.5 rounded"
                    style={{
                      background: "rgba(255,94,26,0.1)",
                      color: "var(--accent)",
                    }}
                  >
                    {offer.coupon_code}
                  </span>
                )}
                {offer.ends_at && (
                  <span>
                    Expires {new Date(offer.ends_at).toLocaleDateString("en-IN")}
                  </span>
                )}
                <span>{offer.click_count ?? 0} clicks</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => toggleOffer(offer.id, offer.is_active)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold"
                  style={{
                    background: offer.is_active
                      ? "rgba(31,187,90,0.1)"
                      : "rgba(255,255,255,0.06)",
                    border: `1px solid ${
                      offer.is_active
                        ? "rgba(31,187,90,0.25)"
                        : "rgba(255,255,255,0.08)"
                    }`,
                    color: offer.is_active ? "var(--green)" : "var(--t2)",
                  }}
                >
                  {offer.is_active ? "● Active" : "○ Paused"}
                </button>

                <button
                  onClick={() => deleteOffer(offer.id)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.18)",
                    color: "#f87171",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}