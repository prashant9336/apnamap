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
  const { data: profile } = await adminSb
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  return (profile?.role ?? "customer") === "admin" ? user : null;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminClient = createAdminClient();
  const url   = new URL(req.url);
  const days  = Math.min(parseInt(url.searchParams.get("days") ?? "7"), 30);
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const day1  = new Date(Date.now() - 86_400_000).toISOString();

  // ── All queries run in parallel ──────────────────────────────────────────
  const [shopCountsRaw, eventsRes, noOfferRaw, longPendingRes, auditRes] =
    await Promise.all([

      // 1. Shop state counts — 4 parallel count queries
      Promise.all([
        adminClient.from("shops").select("id", { count: "exact", head: true }).is("deleted_at", null),
        adminClient.from("shops").select("id", { count: "exact", head: true }).eq("approval_status", "pending").is("deleted_at", null),
        adminClient.from("shops").select("id", { count: "exact", head: true }).eq("approval_status", "approved").is("deleted_at", null),
        adminClient.from("shops").select("id", { count: "exact", head: true }).eq("approval_status", "rejected").is("deleted_at", null),
      ]),

      // 2. Analytics events for the period (capped at 20 000 rows)
      adminClient
        .from("analytics_events")
        .select("event_type, shop_id, visitor_id, user_id, meta, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20000),

      // 3. No-offer detection: two cheap queries instead of N+1
      Promise.all([
        adminClient
          .from("offers")
          .select("shop_id")
          .eq("is_active", true)
          .or("ends_at.is.null,ends_at.gt.now()"),
        adminClient
          .from("shops")
          .select("id, name, slug, view_count, created_at, category:categories(name,icon), locality:localities(name)")
          .eq("approval_status", "approved")
          .eq("is_active", true)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(300),
      ]),

      // 4. Long-pending shops (>24 h without a decision)
      adminClient
        .from("shops")
        .select("id, name, created_at, category:categories(name,icon), locality:localities(name)")
        .eq("approval_status", "pending")
        .is("deleted_at", null)
        .lt("created_at", day1)
        .order("created_at", { ascending: true })
        .limit(10),

      // 5. Recent admin audit actions
      adminClient
        .from("audit_logs")
        .select("action, entity_type, entity_id, admin_id, note, created_at, after")
        .order("created_at", { ascending: false })
        .limit(25),
    ]);

  // ── Process shop counts ──────────────────────────────────────────────────
  const [totalRes, pendingRes, approvedRes, rejectedRes] = shopCountsRaw;

  // ── Process no-offer shops ───────────────────────────────────────────────
  const [activeOffersRes, approvedShopsRes] = noOfferRaw;
  const shopIdsWithOffers = new Set(
    (activeOffersRes.data ?? []).map((o: any) => o.shop_id),
  );
  const noOfferShops = (approvedShopsRes.data ?? [])
    .filter((s: any) => !shopIdsWithOffers.has(s.id))
    .slice(0, 20);

  // ── Process analytics events ─────────────────────────────────────────────
  const rows = eventsRes.data ?? [];

  const visitors = new Set<string>();
  const eventCounts: Record<string, number> = {};
  const shopViews:   Record<string, number> = {};
  const localityViews: Record<string, number> = {};
  const dailyMap: Record<string, number> = {};

  rows.forEach((e: any) => {
    if (e.visitor_id)  visitors.add(e.visitor_id);
    else if (e.user_id) visitors.add(`u:${e.user_id}`);

    eventCounts[e.event_type] = (eventCounts[e.event_type] ?? 0) + 1;

    if (e.event_type === "view" || e.event_type === "shop_view") {
      if (e.shop_id) shopViews[e.shop_id] = (shopViews[e.shop_id] ?? 0) + 1;
    }
    if (e.event_type === "locality_view") {
      const lid = (e.meta as any)?.locality_id;
      if (lid) localityViews[lid] = (localityViews[lid] ?? 0) + 1;
    }

    const day = (e.created_at as string).slice(0, 10);
    dailyMap[day] = (dailyMap[day] ?? 0) + 1;
  });

  const topShopIds = Object.entries(shopViews)
    .sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => id);
  const topLocalityIds = Object.entries(localityViews)
    .sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => id);

  const [topShopsRaw, topLocRaw] = await Promise.all([
    topShopIds.length
      ? adminClient.from("shops").select("id, name, slug").in("id", topShopIds)
      : { data: [] },
    topLocalityIds.length
      ? adminClient.from("localities").select("id, name").in("id", topLocalityIds)
      : { data: [] },
  ]);

  const topShops = ((topShopsRaw as any).data ?? [])
    .map((s: any) => ({ ...s, views: shopViews[s.id] ?? 0 }))
    .sort((a: any, b: any) => b.views - a.views);

  const topLocalities = ((topLocRaw as any).data ?? [])
    .map((l: any) => ({ ...l, views: localityViews[l.id] ?? 0 }))
    .sort((a: any, b: any) => b.views - a.views);

  const dailyEvents = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return NextResponse.json(
    {
      period_days:    days,
      shop_counts: {
        total:    totalRes.count    ?? 0,
        pending:  pendingRes.count  ?? 0,
        approved: approvedRes.count ?? 0,
        rejected: rejectedRes.count ?? 0,
        no_offer: noOfferShops.length,
      },
      insights: {
        no_offer_shops: noOfferShops,
        long_pending:   longPendingRes.data ?? [],
      },
      unique_visitors: visitors.size,
      total_events:    rows.length,
      event_counts:    eventCounts,
      daily_events:    dailyEvents,
      top_shops:       topShops,
      top_localities:  topLocalities,
      recent_actions:  auditRes.data ?? [],
    },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
