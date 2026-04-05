// app/api/explore/route.ts
/**
 * Explore Feed API — always returns a full feed, never empty.
 *
 * Priority order:
 *   1. Active deals (ranked by tier + freshness + distance)
 *   2. Nearby shops with no active deal → synthetic "shop" cards
 *   3. Recently added shops → isNew:true for "New on ApnaMap" badge
 *   4. Invite CTA card appended at end
 *
 * GET /api/explore?lat=25.4&lng=81.8&limit=15&offset=0
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
    const now    = Date.now();

    const supabase = createClient();

    /* ── Step 1: real active deals ─────────────────────────────── */
    const { data: offerData, error: offerError } = await supabase
      .from("offers")
      .select(`
        id, title, description, discount_type, discount_value,
        original_price, offer_price, coupon_code, image_url,
        starts_at, ends_at, is_active, is_featured, is_mystery,
        view_count, click_count, tier, created_at,
        shop:shops(
          id, name, slug, lat, lng, is_open, logo_url,
          category:categories(id, name, slug, icon, color),
          locality:localities(id, name, slug)
        )
      `)
      .eq("is_active", true)
      .not("shop", "is", null)
      .order("tier", { ascending: true })
      .order("is_featured", { ascending: false })
      .range(offset, offset + limit * 3 - 1);

    if (offerError) return NextResponse.json({ error: offerError.message }, { status: 500 });

    const dealItems = (offerData ?? [])
      .filter((o: any) => o.shop?.lat != null && o.shop?.lng != null)
      .map((o: any) => {
        const s          = o.shop;
        const distance_m = haversine(lat, lng, s.lat, s.lng);
        const distanceKm = distance_m / 1000;
        const ageHours   = (now - new Date(o.created_at).getTime()) / 3_600_000;
        const tierWeight = o.tier === 1 ? 100 : o.tier === 2 ? 60 : 20;
        const score      = tierWeight
          + Math.max(0, 20 * Math.exp(-ageHours / 18))
          + Math.max(0, 15 - distanceKm * 2)
          + (o.is_featured ? 10 : 0);

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
          isOpen:        s.is_open ?? false,
          logoUrl:       s.logo_url ?? null,
          categoryName:  s.category?.name  ?? "",
          categoryIcon:  s.category?.icon  ?? "🏪",
          categorySlug:  s.category?.slug  ?? "",
          localityName:  s.locality?.name  ?? "",
          distance_m,
          score,
          itemType:      "deal" as const,
          isNew:         false,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    /* ── Step 2: fill remaining slots with nearby shops ────────── */
    const dealsShopIds = new Set(dealItems.map(i => i.shopId));
    // Reserve one slot at end for the invite CTA
    const slotsLeft = (limit - 1) - dealItems.length;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let shopItems: any[] = [];
    if (slotsLeft > 0) {
      const { data: shopData } = await supabase
        .from("shops")
        .select(`
          id, name, slug, lat, lng, is_open, logo_url, created_at,
          category:categories(id, name, slug, icon, color),
          locality:localities(id, name, slug)
        `)
        .eq("is_active", true)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(slotsLeft * 4);

      const sevenDaysAgo = now - 7 * 24 * 60 * 60_000;

      shopItems = (shopData ?? [])
        .filter((s: any) => !dealsShopIds.has(s.id) && s.lat != null && s.lng != null)
        .map((s: any) => {
          const distance_m = haversine(lat, lng, s.lat, s.lng);
          const isNew      = new Date(s.created_at).getTime() > sevenDaysAgo;
          return {
            offerId:       `shop_${s.id}`,
            offerTitle:    isNew ? "Newly joined ApnaMap" : "Special offer available in store",
            offerTier:     3 as const,
            discountType:  "other",
            discountLabel: isNew ? "New Shop" : "Special offer available",
            discountValue: null,
            endsAt:        null,
            timeLeft:      null,
            isMystery:     false,
            isFeatured:    false,
            shopId:        s.id,
            shopName:      s.name,
            shopSlug:      s.slug,
            isOpen:        s.is_open ?? false,
            logoUrl:       s.logo_url ?? null,
            categoryName:  s.category?.name  ?? "",
            categoryIcon:  s.category?.icon  ?? "🏪",
            categorySlug:  s.category?.slug  ?? "",
            localityName:  s.locality?.name  ?? "",
            distance_m,
            score:         isNew ? 15 : Math.max(1, 10 - distance_m / 1000),
            itemType:      "shop" as const,
            isNew,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, slotsLeft);
    }

    /* ── Step 3: always append invite CTA ──────────────────────── */
    const inviteCta = {
      offerId:       "invite_cta",
      offerTitle:    "",
      offerTier:     3 as const,
      discountType:  "other",
      discountLabel: "",
      discountValue: null,
      endsAt:        null,
      timeLeft:      null,
      isMystery:     false,
      isFeatured:    false,
      shopId:        "",
      shopName:      "",
      shopSlug:      "",
      isOpen:        false,
      logoUrl:       null,
      categoryName:  "",
      categoryIcon:  "",
      categorySlug:  "",
      localityName:  "",
      distance_m:    null,
      score:         0,
      itemType:      "invite_cta" as const,
      isNew:         false,
    };

    const items = [...dealItems, ...shopItems, inviteCta];

    return NextResponse.json({ items, total: items.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
