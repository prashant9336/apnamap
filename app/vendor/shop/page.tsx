"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EditShopPage() {
  const params   = useSearchParams();
  const shopId   = params.get("id");
  const router   = useRouter();
  const supabase = createClient();
  const [shop,    setShop]    = useState<any>(null);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [form,    setForm]    = useState({ name: "", description: "", phone: "", whatsapp: "", address: "", open_time: "", close_time: "" });

  useEffect(() => {
    if (!shopId) return;
    supabase.from("shops").select("*").eq("id", shopId).single().then(({ data }) => {
      if (data) { setShop(data); setForm({ name: data.name ?? "", description: data.description ?? "", phone: data.phone ?? "", whatsapp: data.whatsapp ?? "", address: data.address ?? "", open_time: data.open_time ?? "", close_time: data.close_time ?? "" }); }
    });
  }, [shopId]);

  async function save() {
    setSaving(true);
    await fetch("/api/vendor", { method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_id: shopId, ...form }) });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>, field: "logo_url" | "cover_url") {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file); fd.append("bucket", "shop-images");
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    const { url } = await r.json();
    if (url) {
      await supabase.from("shops").update({ [field]: url }).eq("id", shopId!);
      setShop((s: any) => ({ ...s, [field]: url }));
    }
  }

  if (!shop) return <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}><div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent)" }} /></div>;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="sticky top-0 z-50 flex items-center gap-3 px-4 py-3"
        style={{ background: "rgba(5,7,12,0.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => router.back()} className="text-xl">←</button>
        <p className="font-syne font-black text-base flex-1">Edit Shop</p>
        <button onClick={save} disabled={saving}
          className="px-4 py-1.5 rounded-full text-sm font-bold text-white"
          style={{ background: saved ? "var(--green)" : "var(--accent)" }}>
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save"}
        </button>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Logo upload */}
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--t2)" }}>Shop Logo</p>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
              {shop.logo_url ? <img src={shop.logo_url} alt="" className="w-full h-full object-cover" /> : "🏪"}
            </div>
            <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>Upload logo</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e, "logo_url")} />
          </label>
        </div>

        {/* Cover upload */}
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--t2)" }}>Cover Image</p>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="w-24 h-14 rounded-xl overflow-hidden flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
              {shop.cover_url ? <img src={shop.cover_url} alt="" className="w-full h-full object-cover" /> : <span className="text-2xl">🖼</span>}
            </div>
            <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>Upload cover</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e, "cover_url")} />
          </label>
        </div>

        {/* Fields */}
        {[
          { k: "name",        label: "Shop Name",    type: "text"  },
          { k: "phone",       label: "Phone",        type: "tel"   },
          { k: "whatsapp",    label: "WhatsApp",     type: "tel"   },
          { k: "address",     label: "Address",      type: "text"  },
          { k: "open_time",   label: "Opens at",     type: "time"  },
          { k: "close_time",  label: "Closes at",    type: "time"  },
        ].map((f) => (
          <div key={f.k}>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>{f.label}</label>
            <input type={f.type} value={(form as any)[f.k]} onChange={(e) => setForm((p) => ({ ...p, [f.k]: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--t1)" }} />
          </div>
        ))}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>Description</label>
          <textarea rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--t1)" }} />
        </div>
      </div>
    </div>
  );
}
