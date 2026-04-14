"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type FilterKey = "all" | "auto" | "active";

export default function AdminOffersPage() {
  const [offers,  setOffers]  = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<FilterKey>("all");
  const supabase = createClient();

  const filtered = useMemo(() => {
    if (filter === "auto")   return offers.filter(o => o.source_type === "auto_generated");
    if (filter === "active") return offers.filter(o => o.is_active);
    return offers;
  }, [offers, filter]);

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

      {/* Filter pills */}
      <div className="px-4 pt-3 flex gap-2">
        {[
          { label: `All (${offers.length})`,                               key: "all"           },
          { label: `Auto (${offers.filter(o => o.source_type === "auto_generated").length})`, key: "auto" },
          { label: `Active (${offers.filter(o => o.is_active).length})`,   key: "active"        },
        ].map(f => (
          <button key={f.key}
            onClick={() => setFilter(f.key as any)}
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={filter === f.key
              ? { background: "var(--accent)", color: "#fff" }
              : { background: "rgba(255,255,255,0.05)", color: "var(--t2)", border: "1px solid rgba(255,255,255,0.09)" }}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-3 space-y-2.5">
        {loading && [1,2,3,4].map((i) => <div key={i} className="h-20 rounded-xl shimmer" />)}

        {!loading && filtered.map((offer) => {
          const isAuto = offer.source_type === "auto_generated";
          return (
            <div key={offer.id} className="p-3.5 rounded-2xl"
              style={{
                background: isAuto ? "rgba(167,139,250,0.05)" : "rgba(255,255,255,0.034)",
                border: `1px solid ${isAuto ? "rgba(167,139,250,0.20)" : offer.is_active ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)"}`,
                opacity: offer.is_active ? 1 : 0.5,
              }}>
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">{offer.shop?.category?.icon ?? "🎯"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    {isAuto && (
                      <span className="text-[8px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>
                        Starter offer
                      </span>
                    )}
                    {offer.source_type === "admin_manual" && (
                      <span className="text-[8px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(232,168,0,0.12)", color: "#E8A800" }}>
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-sm line-clamp-1">{offer.title}</p>
                  {isAuto && offer.raw_input_text && (
                    <p className="text-[10px] mt-0.5 italic" style={{ color: "var(--t3)" }}>
                      Raw: "{offer.raw_input_text}"
                    </p>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>
                    {offer.shop?.name} · {offer.shop?.locality?.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
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
            </div>
          );
        })}

        {!loading && filtered.length === 0 && (
          <p className="text-center py-12 text-sm" style={{ color: "var(--t3)" }}>No offers match this filter</p>
        )}
      </div>
    </div>
  );
}
