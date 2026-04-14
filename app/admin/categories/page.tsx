"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AdminCategoriesPage() {
  const [cats,    setCats]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState({ name: "", slug: "", icon: "🏪", color: "#FF5E1A" });
  const [adding,  setAdding]  = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("categories").select("*").order("name")
      .then(({ data }) => { setCats(data ?? []); setLoading(false); });
  }, []);

  async function addCategory() {
    const { data } = await supabase.from("categories").insert(form).select().single();
    if (data) { setCats((p) => [...p, data]); setAdding(false); setForm({ name: "", slug: "", icon: "🏪", color: "#FF5E1A" }); }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(5,7,12,0.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingTop: "calc(12px + env(safe-area-inset-top, 0px))" }}>
        <Link href="/admin/dashboard" className="text-xl">←</Link>
        <p className="font-syne font-black text-base flex-1">Categories</p>
        <button onClick={() => setAdding(!adding)}
          className="px-3 py-1.5 rounded-full text-xs font-bold text-white"
          style={{ background: "var(--accent)" }}>+ Add</button>
      </div>

      {adding && (
        <div className="px-4 py-3 space-y-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <div className="grid grid-cols-2 gap-3">
            {[{ k: "name", ph: "Category Name" }, { k: "slug", ph: "slug-like-this" }, { k: "icon", ph: "🏪" }, { k: "color", ph: "#FF5E1A" }].map((f) => (
              <div key={f.k}>
                <label className="block text-[10px] font-semibold mb-1 uppercase tracking-wider" style={{ color: "var(--t3)" }}>{f.k}</label>
                <input value={(form as any)[f.k]} onChange={(e) => setForm((p) => ({ ...p, [f.k]: e.target.value }))}
                  placeholder={f.ph} className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--t1)" }} />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAdding(false)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(255,255,255,0.05)", color: "var(--t2)" }}>Cancel</button>
            <button onClick={addCategory}
              className="flex-1 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: "var(--accent)" }}>Save Category</button>
          </div>
        </div>
      )}

      <div className="px-4 py-3">
        {loading && [1,2,3,4].map((i) => <div key={i} className="h-12 rounded-xl shimmer mb-2" />)}
        <div className="grid grid-cols-3 gap-2.5">
          {!loading && cats.map((cat) => (
            <div key={cat.id} className="p-3 rounded-xl text-center"
              style={{ background: "rgba(255,255,255,0.034)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-2xl mb-1">{cat.icon}</div>
              <div className="text-xs font-semibold leading-tight">{cat.name}</div>
              <div className="text-[9px] mt-0.5 font-mono" style={{ color: "var(--t3)" }}>{cat.slug}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
