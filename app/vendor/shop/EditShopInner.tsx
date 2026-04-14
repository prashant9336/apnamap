"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EditShopInner() {
  const params = useSearchParams();
  const shopId = params.get("id");

  const router = useRouter();
  const supabase = createClient();

  const [shop, setShop] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsLabel, setGpsLabel] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    phone: "",
    whatsapp: "",
    address: "",
    open_time: "",
    close_time: "",
  });

  useEffect(() => {
    if (!shopId) return;

    supabase
      .from("shops")
      .select("*")
      .eq("id", shopId)
      .single()
      .then(({ data }) => {
        if (data) {
          setShop(data);
          setForm({
            name: data.name ?? "",
            description: data.description ?? "",
            phone: data.phone ?? "",
            whatsapp: data.whatsapp ?? "",
            address: data.address ?? "",
            open_time: data.open_time ?? "",
            close_time: data.close_time ?? "",
          });
        }
      });
  }, [shopId]);

  async function updateLocation() {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        await supabase.from("shops").update({ lat, lng }).eq("id", shopId!);
        setShop((s: any) => ({ ...s, lat, lng }));
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { "User-Agent": "ApnaMap/1.0" } }
          );
          const data = await res.json();
          setGpsLabel(
            data.address?.suburb ||
            data.address?.neighbourhood ||
            data.address?.road ||
            `${lat.toFixed(5)}, ${lng.toFixed(5)}`
          );
        } catch {
          setGpsLabel(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function save() {
    setSaving(true);

    await fetch("/api/vendor", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_id: shopId, ...form }),
    });

    setSaving(false);
    setSaved(true);

    setTimeout(() => setSaved(false), 2500);
  }

  async function uploadImage(
    e: React.ChangeEvent<HTMLInputElement>,
    field: "logo_url" | "cover_url"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);
    fd.append("bucket", "shop-images");

    const r = await fetch("/api/upload", { method: "POST", body: fd });
    const { url } = await r.json();

    if (url) {
      await supabase.from("shops").update({ [field]: url }).eq("id", shopId!);
      setShop((s: any) => ({ ...s, [field]: url }));
    }
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 flex items-center gap-3 p-4" style={{ paddingTop: "calc(16px + env(safe-area-inset-top, 0px))" }}>
        <button onClick={() => router.back()}>←</button>
        <p>Edit Shop</p>
        <button onClick={save} disabled={saving}>
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save"}
        </button>
      </div>

      <div className="p-4 space-y-4">
        <input
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="Shop Name"
        />

        <input
          value={form.phone}
          onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          placeholder="Phone"
        />

        <input
          value={form.whatsapp}
          onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))}
          placeholder="WhatsApp"
        />

        <textarea
          value={form.description}
          onChange={(e) =>
            setForm((p) => ({ ...p, description: e.target.value }))
          }
        />

        {/* Location update */}
        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--t2)" }}>
            Shop Location on Map
          </p>
          {shop.lat && shop.lng && !gpsLabel && (
            <p className="text-xs mb-2" style={{ color: "var(--t3)" }}>
              Current pin: {Number(shop.lat).toFixed(5)}, {Number(shop.lng).toFixed(5)}
            </p>
          )}
          {gpsLabel && (
            <p className="text-xs mb-2" style={{ color: "#1FBB5A" }}>
              ✓ Updated to: {gpsLabel}
            </p>
          )}
          <button
            type="button"
            onClick={updateLocation}
            disabled={gpsLoading}
            className="w-full py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "rgba(255,94,26,0.08)", border: "1px dashed rgba(255,94,26,0.35)", color: "var(--accent)" }}
          >
            {gpsLoading ? "Detecting…" : "📍 Update to My Current Location"}
          </button>
          <p className="text-[10px] mt-1" style={{ color: "var(--t3)" }}>
            Stand at your shop entrance, then tap to pin the exact location.
          </p>
        </div>
      </div>
    </div>
  );
}