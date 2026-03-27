"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AdminOffersPage() {
  const [offers,  setOffers]  = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("offers")
      .select("*, shop:shops(name, slug, locality:localities(name), category:categories(icon))")
      .order("created_at", { ascending: false }).limit(80)
      .then(({ data }) => { setOffers(data ?? []); setLoading(false); });
  }, []);

  async function toggleOffer(id: string, isActive: boolean) {
    await supabase.from("offers").update({ is_active: !isActive }).eq("id", id);
    setOffers((p) => p.map((o) => o.id === id ? { ...o, is_active: !isActive } : o));
  }

  async function deleteOffer(id: string) {
    if (!confirm("Delete this offer?")) return;
    await supabase.from("offers").delete().eq("id", id);
    setOffers((p) => p.filter((o) => o.id !== id));
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(5,7,12,0.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/admin/dashboard" className="text-xl">←</Link>
        <p className="font-syne font-black text-base flex-1">Offer Management</p>
        <span className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "var(--t3)" }}>
          {offers.filter((o) => o.is_active).length} active
        </span>
      </div>

      <div className="px-4 py-3 space-y-2.5">
        {loading && [1,2,3,4].map((i) => <div key={i} className="h-20 rounded-xl shimmer" />)}

        {!loading && offers.map((offer) => (
          <div key={offer.id} className="p-3.5 rounded-2xl flex items-start gap-3"
            style={{ background: "rgba(255,255,255,0.034)", border: `1px solid ${offer.is_active ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)"}`, opacity: offer.is_active ? 1 : 0.5 }}>
            <span className="text-xl flex-shrink-0">{offer.shop?.category?.icon ?? "🎯"}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm line-clamp-1">{offer.title}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>
                {offer.shop?.name} · {offer.shop?.locality?.name}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: offer.tier === 1 ? "rgba(255,80,0,0.15)" : "rgba(255,255,255,0.06)", color: offer.tier === 1 ? "#FF6830" : "var(--t3)" }}>
                  T{offer.tier}
                </span>
                <span className="text-[9px]" style={{ color: "var(--t3)" }}>{offer.click_count ?? 0} clicks</span>
                {offer.ends_at && (
                  <span className="text-[9px]" style={{ color: new Date(offer.ends_at) < new Date() ? "#f87171" : "var(--gold)" }}>
                    {new Date(offer.ends_at) < new Date() ? "Expired" : `Ends ${new Date(offer.ends_at).toLocaleDateString("en-IN")}`}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <button onClick={() => toggleOffer(offer.id, offer.is_active)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold"
                style={offer.is_active
                  ? { background: "rgba(31,187,90,0.1)", color: "var(--green)" }
                  : { background: "rgba(255,255,255,0.05)", color: "var(--t3)" }}>
                {offer.is_active ? "Active" : "Paused"}
              </button>
              <button onClick={() => deleteOffer(offer.id)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold"
                style={{ background: "rgba(239,68,68,0.08)", color: "#f87171" }}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
