import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function requireAdmin(req: NextRequest) {
  const adminSb = createAdminClient();
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  let user = null;
  if (token) {
    const { data } = await adminSb.auth.getUser(token);
    user = data.user;
  } else {
    const { data } = await createClient().auth.getUser();
    user = data.user;
  }
  if (!user) return null;
  const { data: profile } = await adminSb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return (profile?.role ?? "customer") === "admin" ? user : null;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminClient = createAdminClient();
  const url = new URL(req.url);
  const days = Math.min(parseInt(url.searchParams.get("days") ?? "1"), 30);
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  // Fetch recent events (capped at 20 000 rows — enough for daily/weekly stats)
  const { data: events } = await adminClient
    .from("analytics_events")
    .select("event_type, shop_id, visitor_id, user_id, meta, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20000);

  const rows = events ?? [];

  // Unique visitors — prefer visitor_id; fall back to user_id for signed-in users
  const visitors = new Set<string>();
  rows.forEach((e: any) => {
    if (e.visitor_id)  visitors.add(e.visitor_id);
    else if (e.user_id) visitors.add(`u:${e.user_id}`);
  });

  // Per-event type counts
  const eventCounts: Record<string, number> = {};
  rows.forEach((e: any) => {
    eventCounts[e.event_type] = (eventCounts[e.event_type] ?? 0) + 1;
  });

  // Top shops by view / shop_view events
  const shopViews: Record<string, number> = {};
  rows
    .filter((e: any) => e.event_type === "view" || e.event_type === "shop_view")
    .forEach((e: any) => {
      if (e.shop_id) shopViews[e.shop_id] = (shopViews[e.shop_id] ?? 0) + 1;
    });

  const topShopIds = Object.entries(shopViews)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);

  const { data: topShopsRaw } = topShopIds.length
    ? await adminClient.from("shops").select("id, name, slug").in("id", topShopIds)
    : { data: [] };

  const topShops = (topShopsRaw ?? [])
    .map((s: any) => ({ ...s, views: shopViews[s.id] ?? 0 }))
    .sort((a: any, b: any) => b.views - a.views);

  // Top localities from locality_view events carrying meta.locality_id
  const localityViews: Record<string, number> = {};
  rows
    .filter((e: any) => e.event_type === "locality_view")
    .forEach((e: any) => {
      const lid = (e.meta as any)?.locality_id;
      if (lid) localityViews[lid] = (localityViews[lid] ?? 0) + 1;
    });

  const topLocalityIds = Object.entries(localityViews)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);

  const { data: topLocalitiesRaw } = topLocalityIds.length
    ? await adminClient.from("localities").select("id, name").in("id", topLocalityIds)
    : { data: [] };

  const topLocalities = (topLocalitiesRaw ?? [])
    .map((l: any) => ({ ...l, views: localityViews[l.id] ?? 0 }))
    .sort((a: any, b: any) => b.views - a.views);

  return NextResponse.json({
    period_days:       days,
    unique_visitors:   visitors.size,
    total_events:      rows.length,
    event_counts:      eventCounts,
    top_shops:         topShops,
    top_localities:    topLocalities,
  });
}
