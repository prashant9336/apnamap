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

  const [offers, setOffers] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY_OFFER);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
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
      tier: parseInt(form.tier),
      ends_at: form.ends_at || null,
    };

    const r = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      p.map((o) =>
        o.id === id ? { ...o, is_active: !is_active } : o
      )
    );
  }

  async function deleteOffer(id: string) {
    await supabase.from("offers").delete().eq("id", id);

    setOffers((p) => p.filter((o) => o.id !== id));
  }

  return (
    <div className="min-h-screen">
      <h1 style={{ padding: 20 }}>Manage Offers</h1>

      {offers.map((offer) => (
        <div key={offer.id}>
          {offer.title} - {offer.click_count ?? 0}
        </div>
      ))}
    </div>
  );
}