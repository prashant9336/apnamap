"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface LocalityRow {
  id: string;
  name: string;
  slug: string;
  lat: number;
  lng: number;
  priority: number;
  radius_m: number;
  zone: string | null;
}

interface CityRow {
  id: string;
  name: string;
  slug: string;
  state: string;
  is_active: boolean;
  localities: LocalityRow[];
}

export default function AdminCitiesPage() {
  const [cities,    setCities]    = useState<CityRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState<LocalityRow | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("cities")
      .select("*, localities(id, name, slug, lat, lng, priority, radius_m, zone)")
      .order("name")
      .then(({ data }) => {
        setCities((data ?? []) as CityRow[]);
        setLoading(false);
      });
  }, []);

  async function toggleCity(id: string, isActive: boolean) {
    await supabase.from("cities").update({ is_active: !isActive }).eq("id", id);
    setCities(p => p.map(c => c.id === id ? { ...c, is_active: !isActive } : c));
  }

  async function saveLocality() {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from("localities")
      .update({
        lat:      parseFloat(String(editing.lat)),
        lng:      parseFloat(String(editing.lng)),
        radius_m: Number(editing.radius_m),
        priority: Number(editing.priority),
      })
      .eq("id", editing.id);
    if (!error) {
      setCities(prev => prev.map(city => ({
        ...city,
        localities: city.localities.map(l =>
          l.id === editing.id ? { ...l, ...editing } : l
        ),
      })));
      setEditing(null);
    }
    setSaving(false);
  }

  function field(label: string, value: string | number, onChange: (v: string) => void) {
    return (
      <div>
        <div className="text-[10px] mb-0.5" style={{ color: "var(--t3)" }}>{label}</div>
        <input
          type="number"
          step="any"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--t1)" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: "var(--bg)" }}>
      <div className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(5,7,12,0.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/admin/dashboard" className="text-xl">←</Link>
        <p className="font-syne font-black text-base flex-1">Cities & Localities</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {loading && [1, 2].map(i => <div key={i} className="h-40 rounded-2xl shimmer" />)}

        {!loading && cities.map(city => (
          <div key={city.id} className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.034)", border: "1px solid rgba(255,255,255,0.07)" }}>

            {/* City header */}
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-syne font-black text-base">{city.name}</p>
                <p className="text-xs" style={{ color: "var(--t3)" }}>
                  {city.state} · {city.localities?.length ?? 0} localities
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setExpanded(expanded === city.id ? null : city.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ background: "rgba(255,255,255,0.06)", color: "var(--t2)", border: "1px solid rgba(255,255,255,0.10)" }}>
                  {expanded === city.id ? "Collapse" : "Localities"}
                </button>
                <button onClick={() => toggleCity(city.id, city.is_active)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold"
                  style={city.is_active
                    ? { background: "rgba(31,187,90,0.12)", color: "var(--green)" }
                    : { background: "rgba(255,255,255,0.05)", color: "var(--t3)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {city.is_active ? "✓ Active" : "○ Inactive"}
                </button>
              </div>
            </div>

            {/* Locality list */}
            {expanded === city.id && (
              <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {(city.localities ?? [])
                  .slice()
                  .sort((a, b) => a.priority - b.priority)
                  .map(loc => (
                    <div key={loc.id} className="flex items-center gap-3 px-4 py-2.5"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold" style={{ color: "var(--t1)" }}>{loc.name}</span>
                          {loc.zone && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                              style={{ background: "rgba(255,255,255,0.05)", color: "var(--t3)" }}>
                              {loc.zone}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] mt-0.5 font-mono" style={{ color: "var(--t3)" }}>
                          {parseFloat(String(loc.lat)).toFixed(4)}, {parseFloat(String(loc.lng)).toFixed(4)}
                          {" · "}r={loc.radius_m ?? 1500}m
                          {" · "}p={loc.priority}
                        </div>
                      </div>
                      <button
                        onClick={() => setEditing({ ...loc })}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-semibold flex-shrink-0"
                        style={{ background: "rgba(255,94,26,0.10)", color: "var(--accent)", border: "1px solid rgba(255,94,26,0.20)" }}>
                        Edit
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit locality drawer */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}>
          <div className="w-full rounded-t-2xl p-5 space-y-4"
            style={{ background: "#0D0F18", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="flex items-center justify-between">
              <h2 className="font-syne font-black text-base">{editing.name}</h2>
              <button onClick={() => setEditing(null)} className="text-xl leading-none" style={{ color: "var(--t3)" }}>✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {field("Latitude", editing.lat, v => setEditing(e => e && ({ ...e, lat: parseFloat(v) || 0 })))}
              {field("Longitude", editing.lng, v => setEditing(e => e && ({ ...e, lng: parseFloat(v) || 0 })))}
              {field("Radius (metres)", editing.radius_m ?? 1500, v => setEditing(e => e && ({ ...e, radius_m: parseInt(v) || 1500 })))}
              {field("Priority", editing.priority, v => setEditing(e => e && ({ ...e, priority: parseInt(v) || 0 })))}
            </div>

            <p className="text-[10px]" style={{ color: "var(--t3)" }}>
              Radius = how large this locality is. User within radius = "inside" (high confidence). Outside = "Near [name]" (medium).
            </p>

            <div className="flex gap-3">
              <button onClick={() => setEditing(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(255,255,255,0.06)", color: "var(--t2)" }}>
                Cancel
              </button>
              <button onClick={saveLocality} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: saving ? "rgba(255,94,26,0.4)" : "var(--accent)", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
