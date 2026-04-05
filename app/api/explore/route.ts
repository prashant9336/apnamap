// app/api/explore/route.ts
/**
 * Explore Feed API — returns active deals ranked by score.
 *
 * GET /api/explore?lat=25.4&lng=81.8&limit=15&offset=0
 *
 * Scoring: tier 1 (big deal) > tier 2 (flash) > tier 3 (basic),
 * then by distance. Uses the same offer data structure as the shops API.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const lat    = Number(searchParams.get("lat") ?? "25.4358");
    const lng    = Number(searchParams.get("lng") ?? "81.8463");
    const limit  = Math.min(30, Math.max(1, Number(searchParams.get("limit") ?? "15")));
    const offset = Math.max(0, Number(searchParams.get("offset") ?? "0"));

    const supabase = createClient();

    /* Fetch active offers with nested shop + category + locality */
    const { data, error } = await supabase
      .from("offers")
      .select(`
        id, title, description, discount_type, discount_value,
        original_price, offer_price, coupon_code, image_url,
        starts_at, ends_at, is_active, is_featured, is_mystery,
        view_count, click_count, tier, created_at,
        shop:shops(
          id, name, slug, lat, lng, is_open, logo_url, cover_url,
          category:categories(id, name, slug, icon, color),
          locality:localities(id, name, slug)
        )
      `)
      .eq("is_active", true)
      .not("shop", "is", null)
      .order("tier", { ascending: true })
      .order("is_featured", { ascending: false })
      .range(offset, offset + limit * 3 - 1); // over-fetch so we can sort by distance

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const now = Date.now();

    /* Flatten + enrich */
    const items = (data ?? [])
      .filter((o: any) => {
        const s = o.shop;
        return s && s.lat != null && s.lng != null;
      })
      .map((o: any) => {
        const s = o.shop;
        const distance_m = haversine(lat, lng, s.lat, s.lng);
        const distanceKm = distance_m / 1000;

        /* Score: tier weight + freshness + distance */
        const tierWeight  = o.tier === 1 ? 100 : o.tier === 2 ? 60 : 20;
        const ageHours    = (now - new Date(o.created_at).getTime()) / 3_600_000;
        const freshness   = Math.max(0, 20 * Math.exp(-ageHours / 18));
        const distScore   = Math.max(0, 15 - distanceKm * 2);
        const featBonus   = o.is_featured ? 10 : 0;
        const score       = tierWeight + freshness + distScore + featBonus;

        /* Discount label for the hero */
        let discountLabel = "";
        if (o.discount_type === "percent" && o.discount_value)
          discountLabel = `${o.discount_value}% OFF`;
        else if (o.discount_type === "flat" && o.discount_value)
          discountLabel = `₹${o.discount_value} OFF`;
        else if (o.discount_type === "bogo")
          discountLabel = "Buy 1 Get 1";
        else if (o.discount_type === "free")
          discountLabel = "FREE";
        else
          discountLabel = o.title;

        /* Time left label */
        let timeLeft: string | null = null;
        if (o.ends_at) {
          const ms = new Date(o.ends_at).getTime() - now;
          if (ms > 0 && ms < 24 * 60 * 60_000) {
            const h = Math.floor(ms / 3_600_000);
            const m = Math.floor((ms % 3_600_000) / 60_000);
            timeLeft = h > 0 ? `${h}h ${m}m left` : `${m}m left`;
          }
        }

        return {
          offerId:       o.id,
          offerTitle:    o.title,
          offerTier:     o.tier as 1 | 2 | 3,
          discountType:  o.discount_type,
          discountLabel,
          discountValue: o.discount_value,
          endsAt:        o.ends_at,
          timeLeft,
          isMystery:     o.is_mystery,
          isFeatured:    o.is_featured,
          shopId:        s.id,
          shopName:      s.name,
          shopSlug:      s.slug,
          shopLat:       s.lat,
          shopLng:       s.lng,
          isOpen:        s.is_open ?? false,
          logoUrl:       s.logo_url ?? null,
          categoryName:  s.category?.name  ?? "",
          categoryIcon:  s.category?.icon  ?? "🏪",
          categorySlug:  s.category?.slug  ?? "",
          localityName:  s.locality?.name  ?? "",
          distance_m,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return NextResponse.json({ items, total: items.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
