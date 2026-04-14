import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Offer } from "@/types";
import { ShopHeader, ShopActionButtons } from "./ShopInteractions";
import ReviewSection from "./ReviewSection";

/* ── Deduplicated fetch — React cache dedupes across generateMetadata + page ── */
const getShop = cache(async (slug: string) => {
  const sb = createClient();
  const { data } = await sb
    .from("shops")
    .select(`
      *,
      locality:localities(name, city:cities(name)),
      category:categories(name, icon, color),
      offers(*)
    `)
    .eq("slug", slug)
    .eq("is_approved", true)
    .single();
  return data ?? null;
});

/* ── Metadata ────────────────────────────────────────────────────── */
export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const shop = await getShop(params.slug);
  if (!shop) return { title: "Shop not found | ApnaMap" };

  const cat  = (shop as any).category;
  const loc  = (shop as any).locality;
  const city = (loc as any)?.city?.name ?? "Prayagraj";
  const area = loc?.name ?? city;

  const title = `${shop.name} — ${cat?.name ?? "Shop"} in ${area}, ${city} | ApnaMap`;
  const description = shop.description
    ? shop.description.slice(0, 155)
    : `Find ${shop.name} in ${area}, ${city}. View live offers, contact info, and directions on ApnaMap.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter:   { card: "summary", title, description },
  };
}

/* ── Page ────────────────────────────────────────────────────────── */
export default async function ShopPage({ params }: { params: { slug: string } }) {
  const shop = await getShop(params.slug);
  if (!shop) notFound();

  const cat    = (shop as any).category;
  const loc    = (shop as any).locality;
  const offers = ((shop as any).offers ?? [] as Offer[]).filter(
    (o: Offer) => o.is_active && (!o.ends_at || new Date(o.ends_at) > new Date())
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Sticky header — client (back navigation + save toggle + view tracking) */}
      <ShopHeader shopId={shop.id} slug={params.slug} shopName={shop.name} />

      {/* Cover */}
      <div className="relative" style={{ height: 200, background: `linear-gradient(135deg,${cat?.color ?? "#FF5E1A"}22, rgba(5,7,12,0.9) 80%)` }}>
        <div className="absolute inset-0 flex items-center justify-center text-8xl opacity-20">
          {cat?.icon ?? "🏪"}
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: `${cat?.color ?? "var(--accent)"}22`, border: `1px solid ${cat?.color ?? "var(--accent)"}44` }}>
            {cat?.icon ?? "🏪"}
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={shop.is_active
              ? { background: "rgba(31,187,90,0.18)", color: "var(--green)", border: "1px solid rgba(31,187,90,0.3)" }
              : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}>
            {shop.is_active ? "● OPEN" : "○ CLOSED"}
          </span>
        </div>
      </div>

      <div className="px-4 py-4">
        {/* Name + meta — in static HTML for Google */}
        <h1 className="font-syne font-black text-2xl leading-tight mb-1" style={{ letterSpacing: "-0.5px" }}>
          {shop.name}
        </h1>
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="text-sm" style={{ color: cat?.color ?? "var(--accent)" }}>{cat?.name}</span>
          {loc?.name && (
            <>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
              <span className="text-sm" style={{ color: "var(--t2)" }}>{loc.name}</span>
            </>
          )}
          {shop.avg_rating > 0 && (
            <>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
              <span className="text-sm font-semibold" style={{ color: "var(--gold)" }}>
                ★ {shop.avg_rating.toFixed(1)} ({shop.review_count})
              </span>
            </>
          )}
          {(shop.view_count ?? 0) > 0 && (
            <>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>👀 {shop.view_count} views</span>
            </>
          )}
        </div>

        {/* Description — in static HTML for Google */}
        {shop.description && (
          <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--t2)" }}>{shop.description}</p>
        )}

        {/* Action buttons — client (analytics + native intents) */}
        <ShopActionButtons
          shopId={shop.id}
          phone={shop.phone ?? null}
          whatsapp={shop.whatsapp ?? null}
          lat={shop.lat}
          lng={shop.lng}
        />

        {/* Offers — in static HTML for Google */}
        {offers.length > 0 && (
          <div className="mb-6">
            <h2 className="font-syne font-bold text-base mb-3">🎯 Active Offers</h2>
            <div className="space-y-2.5">
              {offers.map((offer: Offer) => (
                <div key={offer.id} className="p-3.5 rounded-2xl"
                  style={{
                    background: offer.tier === 1
                      ? "linear-gradient(135deg,rgba(255,60,0,0.16),rgba(255,140,0,0.08))"
                      : "rgba(255,255,255,0.034)",
                    border: `1px solid ${offer.tier === 1 ? "rgba(255,80,0,0.28)" : "rgba(255,255,255,0.07)"}`,
                  }}>
                  {offer.tier === 1 && (
                    <p className="text-[9px] font-black uppercase tracking-wide mb-1" style={{ color: "#FF6830" }}>⭐ Big Deal</p>
                  )}
                  <p className="font-bold text-sm mb-1">{offer.title}</p>
                  {offer.description && (
                    <p className="text-xs mb-2" style={{ color: "var(--t2)" }}>{offer.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: offer.ends_at ? "var(--gold)" : "var(--t3)" }}>
                      {offer.ends_at
                        ? `⏰ Ends ${new Date(offer.ends_at).toLocaleDateString("en-IN")}`
                        : "Ongoing"}
                    </span>
                    {offer.coupon_code && (
                      <span className="font-mono text-xs px-2.5 py-1 rounded-lg select-all"
                        style={{ background: "rgba(255,94,26,0.12)", color: "var(--accent)", border: "1px dashed rgba(255,94,26,0.3)" }}>
                        {offer.coupon_code}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Claim */}
        {!(shop as any).vendor_id ? (
          <div className="mb-6 p-4 rounded-2xl" style={{ background: "rgba(255,94,26,0.06)", border: "1px solid rgba(255,94,26,0.18)" }}>
            <p className="font-syne font-bold text-sm mb-1" style={{ color: "#F2F5FF" }}>🏪 Is this your shop?</p>
            <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.40)", lineHeight: 1.6 }}>
              Claim this listing to manage offers, update details, and connect directly with customers.
            </p>
            <a href={`/vendor/claim?shop_id=${shop.id}`}
              className="inline-block px-5 py-2.5 rounded-full text-sm font-bold text-white"
              style={{ background: "#FF5E1A", textDecoration: "none", boxShadow: "0 0 18px rgba(255,94,26,0.35)" }}>
              Claim This Shop →
            </a>
          </div>
        ) : (
          <div className="mb-4 px-3 py-2 rounded-xl text-xs"
            style={{ background: "rgba(31,187,90,0.08)", border: "1px solid rgba(31,187,90,0.22)", color: "#1FBB5A" }}>
            ✓ This shop is claimed and managed by the owner
          </div>
        )}

        {/* Info — in static HTML for Google */}
        <div className="space-y-3 mb-6">
          <h2 className="font-syne font-bold text-base">ℹ️ Info</h2>
          {[
            { icon: "📍", label: shop.address },
            { icon: "🕐", label: shop.open_time ? `${shop.open_time} – ${shop.close_time}` : null },
            { icon: "📞", label: shop.phone },
            { icon: "💬", label: shop.whatsapp ? `+91 ${shop.whatsapp}` : null },
          ].filter(r => r.label).map(r => (
            <div key={r.icon} className="flex items-start gap-3 text-sm">
              <span className="text-base flex-shrink-0">{r.icon}</span>
              <span style={{ color: "var(--t2)" }}>{r.label}</span>
            </div>
          ))}
        </div>

        {/* Reviews — client island */}
        <ReviewSection shopId={shop.id} shopSlug={params.slug} />
      </div>
    </div>
  );
}
