import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function requireAdmin(req: NextRequest) {
  const adminSb = createAdminClient();
  const token   = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();

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
  const role = (profile as any)?.role ?? "customer";
  return role === "admin" ? user : null;
}

/**
 * GET /api/admin/rewards
 * Returns all streak rewards that have been unlocked, with offer + user info.
 * Supports ?status=all|unlocked|redeemed|expired
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status = req.nextUrl.searchParams.get("status") ?? "all";
  const adminDb = createAdminClient();

  let query = adminDb
    .from("user_locality_streaks")
    .select(`
      id, user_id, streak_count,
      reward_unlocked, reward_offer_id,
      reward_unlocked_at, reward_expires_at, reward_redeemed_at,
      locality:localities(id, name),
      profile:profiles(id, full_name, email:auth_email)
    `)
    .eq("reward_unlocked", true)
    .not("reward_offer_id", "is", null)
    .order("reward_unlocked_at", { ascending: false })
    .limit(200);

  if (status === "redeemed") {
    query = query.not("reward_redeemed_at", "is", null);
  } else if (status === "unlocked") {
    query = query.is("reward_redeemed_at", null);
  }

  const { data: rows, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch offer + shop details for all unique offer IDs
  const offerIds = [...new Set((rows ?? []).map((r: any) => r.reward_offer_id).filter(Boolean))];
  const offerMap = new Map<string, { title: string; shop_name: string }>();

  if (offerIds.length > 0) {
    const { data: offers } = await adminDb
      .from("offers")
      .select("id, title, shop:shops(name)")
      .in("id", offerIds);

    (offers ?? []).forEach((o: any) => {
      offerMap.set(o.id, { title: o.title, shop_name: o.shop?.name ?? "Unknown Shop" });
    });
  }

  // Also fetch user emails via admin auth (profiles may not store email)
  const userIds = [...new Set((rows ?? []).map((r: any) => r.user_id).filter(Boolean))];
  const emailMap = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: { users } } = await adminDb.auth.admin.listUsers({ perPage: 1000 });
    (users ?? []).forEach((u: any) => {
      if (userIds.includes(u.id)) emailMap.set(u.id, u.email ?? "");
    });
  }

  const now = new Date();
  const rewards = (rows ?? []).map((r: any) => {
    const offer = offerMap.get(r.reward_offer_id);
    const isExpired = r.reward_expires_at && new Date(r.reward_expires_at) < now;
    return {
      id:                r.id,
      user_id:           r.user_id,
      user_email:        emailMap.get(r.user_id) ?? "",
      locality_name:     r.locality?.name ?? "",
      streak_count:      r.streak_count,
      offer_id:          r.reward_offer_id,
      offer_title:       offer?.title ?? "—",
      shop_name:         offer?.shop_name ?? "—",
      unlocked_at:       r.reward_unlocked_at,
      expires_at:        r.reward_expires_at,
      redeemed_at:       r.reward_redeemed_at ?? null,
      is_expired:        !!isExpired,
      state:             r.reward_redeemed_at ? "redeemed" : isExpired ? "expired" : "active",
    };
  });

  const stats = {
    total:    rewards.length,
    active:   rewards.filter((r: any) => r.state === "active").length,
    redeemed: rewards.filter((r: any) => r.state === "redeemed").length,
    expired:  rewards.filter((r: any) => r.state === "expired").length,
  };

  return NextResponse.json({ rewards, stats });
}
