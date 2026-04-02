"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { QuickPostPanel } from "@/components/vendor/QuickPostPanel";
import type { QuickPost } from "@/components/vendor/QuickPostHistory";
import type { ChipType } from "@/components/vendor/QuickPostChip";

export default function VendorDashboard() {
  const [shops, setShops] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total_views: 0,
    total_calls: 0,
    total_whatsapp: 0,
    total_saves: 0,
  });
  const [quickPosts, setQuickPosts] = useState<QuickPost[]>([]);
  const [activeShopId, setActiveShopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        router.push("/auth/login");
        return;
      }

      const { data: shopData, error: shopErr } = await supabase
        .from("shops")
        .select(`
          *,
          offers(*),
          category:categories(name,slug,icon,color),
          locality:localities(name,slug)
        `)
        .eq("vendor_id", user.id)
        .order("created_at", { ascending: false });

      if (shopErr) {
        setError(shopErr.message);
        setLoading(false);
        return;
      }

      const safeShops = shopData ?? [];
      setShops(safeShops);

      if (safeShops.length > 0) {
        setActiveShopId((prev) => prev ?? safeShops[0].id);
      }

      const shopIds = safeShops.map((s: any) => s.id);

      if (shopIds.length > 0) {
        const [{ data: analytics }, { data: postsData }] = await Promise.all([
          supabase
            .from("analytics_events")
            .select("event_type, shop_id")
            .in("shop_id", shopIds),
          supabase
            .from("quick_posts")
            .select("*")
            .in("shop_id", shopIds)
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

        const events = analytics ?? [];
        setStats({
          total_views: events.filter((e: any) => e.event_type === "view").length,
          total_calls: events.filter((e: any) => e.event_type === "call").length,
          total_whatsapp: events.filter((e: any) => e.event_type === "whatsapp").length,
          total_saves: events.filter((e: any) => e.event_type === "save").length,
        });

        setQuickPosts((postsData as QuickPost[]) ?? []);
      } else {
        setQuickPosts([]);
      }

      setLoading(false);
    }

    loadDashboard();
  }, [router, supabase]);

  useEffect(() => {
    if (!activeShopId) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("quick_posts")
        .select("*")
        .eq("shop_id", activeShopId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) {
        setQuickPosts(data as QuickPost[]);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [activeShopId, supabase]);

  const handlePost = async (payload: {
    shopId: string;
    type: ChipType;
    note: string;
    expiresAt: string;
  }): Promise<QuickPost> => {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      throw new Error("You must be logged in");
    }

    const { data, error } = await supabase
      .from("quick_posts")
      .insert({
        shop_id: payload.shopId,
        user_id: user.id,
        post_type: payload.type,
        message: payload.note,
        is_active: true,
        expires_at: payload.expiresAt,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create post");
    }

    setQuickPosts((prev) => [data as QuickPost, ...prev]);

    if (payload.type === "flash_deal") {
      console.log("🔥 Flash deal activated");
    }

    return data as QuickPost;
  };

  const handleToggle = async (postId: string, nextActive: boolean): Promise<void> => {
    const { error } = await supabase
      .from("quick_posts")
      .update({ is_active: nextActive })
      .eq("id", postId);

    if (error) {
      throw new Error(error.message);
    }

    setQuickPosts((prev) =>
      prev.map((post: any) =>
        post.id === postId ? { ...post, is_active: nextActive } : post
      )
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 space-y-3" style={{ background: "var(--bg)" }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl shimmer" />
        ))}
      </div>
    );
  }

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

      <div className="px-4 py-4 space-y-6">
        {error && (
          <div
            className="p-3 rounded-xl text-sm"
            style={{
              background: "rgba(239,68,68,0.1)",
              color: "#f87171",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Views", value: stats.total_views, icon: "👁" },
            { label: "Calls", value: stats.total_calls, icon: "📞" },
            { label: "WhatsApp", value: stats.total_whatsapp, icon: "💬" },
            { label: "Saves", value: stats.total_saves, icon: "❤️" },
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

        {activeShopId && (
          <QuickPostPanel
            shopId={activeShopId}
            initialPosts={quickPosts}
            onPost={handlePost}
            onToggle={handleToggle}
          />
        )}

        <div>
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
                  background:
                    activeShopId === shop.id
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(255,255,255,0.034)",
                  border:
                    activeShopId === shop.id
                      ? "1px solid rgba(255,255,255,0.14)"
                      : "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <button
                    type="button"
                    className="flex items-center gap-2 text-left min-w-0 flex-1"
                    onClick={() => setActiveShopId(shop.id)}
                    aria-pressed={activeShopId === shop.id}
                    aria-label={`Select ${shop.name} for quick post`}
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                  >
                    <span className="text-xl flex-shrink-0">{shop.category?.icon ?? "🏪"}</span>
                    <div className="min-w-0">
                      <p className="font-syne font-bold text-sm truncate">{shop.name}</p>
                      <p className="text-xs truncate" style={{ color: "var(--t3)" }}>
                        {shop.locality?.name ?? "Unknown locality"}
                      </p>
                    </div>
                  </button>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap ${
                      shop.is_approved ? "" : "opacity-75"
                    }`}
                    style={
                      shop.is_approved
                        ? { background: "rgba(31,187,90,0.13)", color: "var(--green)" }
                        : { background: "rgba(232,168,0,0.12)", color: "var(--gold)" }
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
    </div>
  );
}