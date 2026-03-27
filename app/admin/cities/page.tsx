"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AdminCitiesPage() {
  const [cities,  setCities]  = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("cities").select("*, localities(id, name, slug, priority)")
      .order("name").then(({ data }) => { setCities(data ?? []); setLoading(false); });
  }, []);

  async function toggleCity(id: string, isActive: boolean) {
    await supabase.from("cities").update({ is_active: !isActive }).eq("id", id);
    setCities((p) => p.map((c) => c.id === id ? { ...c, is_active: !isActive } : c));
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(5,7,12,0.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/admin/dashboard" className="text-xl">←</Link>
        <p className="font-syne font-black text-base flex-1">Cities & Localities</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {loading && [1,2].map((i) => <div key={i} className="h-40 rounded-2xl shimmer" />)}

        {!loading && cities.map((city) => (
          <div key={city.id} className="p-4 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.034)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-syne font-black text-base">{city.name}</p>
                <p className="text-xs" style={{ color: "var(--t3)" }}>{city.state} · {city.localities?.length ?? 0} localities</p>
              </div>
              <button onClick={() => toggleCity(city.id, city.is_active)}
                className="px-3 py-1.5 rounded-full text-xs font-bold"
                style={city.is_active
                  ? { background: "rgba(31,187,90,0.12)", color: "var(--green)" }
                  : { background: "rgba(255,255,255,0.05)", color: "var(--t3)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {city.is_active ? "✓ Active" : "○ Inactive"}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(city.localities ?? []).map((loc: any) => (
                <span key={loc.id} className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ background: "rgba(255,255,255,0.05)", color: "var(--t2)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {loc.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
