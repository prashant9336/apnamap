"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function VendorDashboard() {
  const [data, setData] = useState<{ shops: any[]; stats: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const res = await fetch("/api/vendor", { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) {
        setError(json?.error || "Failed to load dashboard");
        setLoading(false);
        return;
      }

      setData(json);
      setLoading(false);
    }

    load();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen p-4 space-y-3" style={{ background: "var(--bg)" }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl shimmer" />
        ))}
      </div>
    );
  }

  const shops = data?.shops ?? [];
  const stats = data?.stats ?? {};

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div
        className="sticky top-0 z-50 flex items-center gap-3 px-4 py-3"
        style={{
          background: "rgba(5,7,12,0.96)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Link href="/profile" className="text-xl">←</Link>
        <div className="flex-1">
          <p className="font-syne font-black text-base leading-tight">Vendor Dashboard</p>
          <p className="text-[10px]" style={{ color: "var(--t3)" }}>
            Manage your shops & offers
          </p>
        </div>
        <Link
          href="/vendor/onboarding"
          className="px-3 py-1.5 rounded-full text-xs font-bold text-white"
          style={{ background: "var(--accent)" }}
        >
          + Add Shop
        </Link>
      </div>

      <div className="px-4 py-4">
        {error && (
          <div
            className="mb-4 p-3 rounded-xl text-sm"
            style={{
              background: "rgba(239,68,68,0.1)",
              color: "#f87171",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { label: "Views", value: stats.total_views ?? 0, icon: "👁" },
            { label: "Calls", value: stats.total_calls ?? 0, icon: "📞" },
            { label: "WhatsApp", value: stats.total_whatsapp ?? 0, icon: "💬" },
            { label: "Saves", value: stats.total_saves ?? 0, icon: "❤️" },
          ].map((s) => (
            <div
              key={s.label}
              className="p-3 rounded-xl text-center"
              style={{
                background: "rgba(255,255,255,0.034)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="font-syne font-black text-lg">{s.value}</div>
              <div className="text-[9px]" style={{ color: "var(--t3)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <h2 className="font-syne font-bold text-base mb-3">My Shops</h2>

        {shops.length === 0 && !error && (
          <div
            className="text-center py-12 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px dashed rgba(255,255,255,0.1)",
            }}
          >
            <div className="text-4xl mb-3">🏪</div>
            <p className="font-semibold mb-2">No shops yet</p>
            <p className="text-sm mb-4" style={{ color: "var(--t2)" }}>
              Add your first shop to start getting customers
            </p>
            <Link
              href="/vendor/onboarding"
              className="px-6 py-2.5 rounded-full text-sm font-bold text-white"
              style={{ background: "var(--accent)" }}
            >
              Add My Shop
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {shops.map((shop: any) => (
            <div
              key={shop.id}
              className="p-4 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.034)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{shop.category?.icon ?? "🏪"}</span>
                  <div>
                    <p className="font-syne font-bold text-sm">{shop.name}</p>
                    <p className="text-xs" style={{ color: "var(--t3)" }}>
                      {shop.locality?.name ?? "Unknown locality"}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    shop.is_approved ? "" : "opacity-75"
                  }`}
                  style={
                    shop.is_approved
                      ? {
                          background: "rgba(31,187,90,0.13)",
                          color: "var(--green)",
                        }
                      : {
                          background: "rgba(232,168,0,0.12)",
                          color: "var(--gold)",
                        }
                  }
                >
                  {shop.is_approved ? "✓ Live" : "⏳ Pending"}
                </span>
              </div>

              <div
                className="flex items-center gap-4 mb-3 text-xs"
                style={{ color: "var(--t2)" }}
              >
                <span>
                  🎯 {shop.offers?.filter((o: any) => o.is_active).length ?? 0} active offers
                </span>
                <span>
                  ⭐ {(shop.avg_rating ?? 0).toFixed(1)} ({shop.review_count ?? 0} reviews)
                </span>
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/vendor/shop?id=${shop.id}`}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold text-center"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "var(--t1)",
                  }}
                >
                  Edit Shop
                </Link>

                <Link
                  href={`/vendor/offers?shop_id=${shop.id}`}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold text-center"
                  style={{
                    background: "rgba(255,94,26,0.1)",
                    border: "1px solid rgba(255,94,26,0.22)",
                    color: "var(--accent)",
                  }}
                >
                  Manage Offers
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}