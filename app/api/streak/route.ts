import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function getUser(req: NextRequest) {
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  const adminSb = createAdminClient();
  if (token) {
    const { data } = await adminSb.auth.getUser(token);
    if (data.user) return data.user;
  }
  const { data } = await createClient().auth.getUser();
  return data.user ?? null;
}

function ymdInIndia(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) { if (p.type !== "literal") map[p.type] = p.value; }
  return `${map.year}-${map.month}-${map.day}`;
}

function previousYmd(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

type AdminDb = ReturnType<typeof createAdminClient>;

/* ── Select best qualifying offer for a locality ─────────────────── */
async function selectRewardOffer(
  adminDb: AdminDb,
  locality_id: string
): Promise<{ id: string; title: string; shop_name: string } | null> {
  const { data: shops } = await adminDb
    .from("shops")
    .select("id, name")
    .eq("locality_id", locality_id)
    .eq("is_approved", true)
    .eq("is_active", true);

  const shopIds = (shops ?? []).map((s: any) => s.id as string);
  if (shopIds.length === 0) return null;

  const shopNameMap = new Map<string, string>(
    (shops ?? []).map((s: any) => [s.id as string, s.name as string])
  );

  const now = new Date().toISOString();
  const { data: offers } = await adminDb
    .from("offers")
    .select("id, title, shop_id, is_featured, is_boosted")
    .in("shop_id", shopIds)
    .eq("is_active", true)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .limit(30);

  if (!offers || offers.length === 0) return null;

  const sorted = [...offers].sort((a: any, b: any) => {
    if (b.is_boosted && !a.is_boosted) return 1;
    if (a.is_boosted && !b.is_boosted) return -1;
    if (b.is_featured && !a.is_featured) return 1;
    if (a.is_featured && !b.is_featured) return -1;
    return 0;
  });

  const pick = sorted[0] as any;
  return {
    id:        pick.id,
    title:     pick.title,
    shop_name: shopNameMap.get(pick.shop_id) ?? "Local Shop",
  };
}

/* ── Fetch stored offer details (for already-unlocked rewards) ────── */
async function fetchRewardOffer(
  adminDb: AdminDb,
  offerId: string,
  expiresAt: string | null
): Promise<{ id: string; title: string; shop_name: string; expires_at: string | null } | null> {
  const { data } = await adminDb
    .from("offers")
    .select("id, title, shop:shops(name)")
    .eq("id", offerId)
    .maybeSingle();

  if (!data) return null;
  return {
    id:        (data as any).id,
    title:     (data as any).title,
    shop_name: (data as any).shop?.name ?? "Local Shop",
    expires_at: expiresAt,
  };
}

/* ── POST /api/streak ─────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const locality_id = body?.locality_id as string | undefined;
    if (!locality_id) return NextResponse.json({ error: "Missing locality_id" }, { status: 400 });

    const adminDb   = createAdminClient();
    const today     = ymdInIndia();
    const yesterday = previousYmd(today);

    // Fetch locality streak goal (default 3)
    const { data: locality } = await adminDb
      .from("localities")
      .select("streak_goal")
      .eq("id", locality_id)
      .maybeSingle();
    const streakGoal: number = (locality as any)?.streak_goal ?? 3;

    const { data: existing, error: fetchErr } = await adminDb
      .from("user_locality_streaks")
      .select("*")
      .eq("user_id", user.id)
      .eq("locality_id", locality_id)
      .maybeSingle();

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

    /* ── New streak ── */
    if (!existing) {
      const { data: inserted, error: insertErr } = await adminDb
        .from("user_locality_streaks")
        .insert({
          user_id: user.id, locality_id,
          streak_count: 1, last_visit_date: today,
          reward_unlocked: false, reward_code: null,
        })
        .select().single();
      if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
      return NextResponse.json({ streak: inserted, reward_offer: null, status: "started" });
    }

    /* ── Already counted today — return with offer details if unlocked ── */
    if (existing.last_visit_date === today) {
      let rewardOffer = null;
      if ((existing as any).reward_offer_id) {
        rewardOffer = await fetchRewardOffer(
          adminDb,
          (existing as any).reward_offer_id,
          (existing as any).reward_expires_at
        );
      }
      return NextResponse.json({ streak: existing, reward_offer: rewardOffer, status: "already_counted_today" });
    }

    /* ── Increment streak ── */
    const nextCount    = existing.last_visit_date === yesterday ? existing.streak_count + 1 : 1;
    const shouldUnlock = !existing.reward_unlocked && nextCount >= streakGoal;

    let rewardOfferPick: { id: string; title: string; shop_name: string } | null = null;
    const rewardUpdates: Record<string, unknown> = {};

    if (shouldUnlock) {
      rewardOfferPick = await selectRewardOffer(adminDb, locality_id);
      const now      = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      rewardUpdates.reward_unlocked    = true;
      rewardUpdates.reward_offer_id    = rewardOfferPick?.id ?? null;
      rewardUpdates.reward_unlocked_at = now.toISOString();
      rewardUpdates.reward_expires_at  = expiresAt;
    }

    const { data: updated, error: updateErr } = await adminDb
      .from("user_locality_streaks")
      .update({
        streak_count:    nextCount,
        last_visit_date: today,
        updated_at:      new Date().toISOString(),
        ...rewardUpdates,
      })
      .eq("id", existing.id)
      .select().single();

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    // Build reward_offer for response
    let rewardOfferForResponse: { id: string; title: string; shop_name: string; expires_at: string | null } | null = null;
    if (shouldUnlock && rewardOfferPick) {
      rewardOfferForResponse = {
        ...rewardOfferPick,
        expires_at: (updated as any).reward_expires_at ?? null,
      };
    } else if ((updated as any).reward_offer_id) {
      rewardOfferForResponse = await fetchRewardOffer(
        adminDb,
        (updated as any).reward_offer_id,
        (updated as any).reward_expires_at
      );
    }

    const status = shouldUnlock ? "reward_unlocked" : "updated";
    return NextResponse.json({ streak: updated, reward_offer: rewardOfferForResponse, status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown server error" }, { status: 500 });
  }
}
