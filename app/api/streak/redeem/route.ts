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

/**
 * GET /api/streak/redeem?locality_id=xxx
 * Returns the unlocked reward for a user+locality, with full offer details.
 * Used by the "show vendor your screen" flow.
 */
export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const locality_id = req.nextUrl.searchParams.get("locality_id");
  if (!locality_id) return NextResponse.json({ error: "Missing locality_id" }, { status: 400 });

  const adminDb = createAdminClient();

  const { data: streak, error } = await adminDb
    .from("user_locality_streaks")
    .select("*")
    .eq("user_id", user.id)
    .eq("locality_id", locality_id)
    .maybeSingle();

  if (error)   return NextResponse.json({ error: error.message }, { status: 500 });
  if (!streak) return NextResponse.json({ reward: null });

  const s = streak as any;
  if (!s.reward_unlocked || !s.reward_offer_id) {
    return NextResponse.json({ reward: null, streak });
  }

  // Check if already redeemed
  if (s.reward_redeemed_at) {
    return NextResponse.json({ reward: null, redeemed: true, redeemed_at: s.reward_redeemed_at, streak });
  }

  // Check expiry
  if (s.reward_expires_at && new Date(s.reward_expires_at) < new Date()) {
    return NextResponse.json({ reward: null, expired: true, streak });
  }

  // Fetch offer details
  const { data: offer } = await adminDb
    .from("offers")
    .select("id, title, description, discount_type, discount_value, shop:shops(id, name, slug, phone, whatsapp)")
    .eq("id", s.reward_offer_id)
    .maybeSingle();

  if (!offer) return NextResponse.json({ reward: null, streak });

  return NextResponse.json({
    reward: {
      streak_id:       s.id,
      offer_id:        (offer as any).id,
      offer_title:     (offer as any).title,
      offer_description: (offer as any).description,
      discount_type:   (offer as any).discount_type,
      discount_value:  (offer as any).discount_value,
      shop_name:       (offer as any).shop?.name,
      shop_slug:       (offer as any).shop?.slug,
      shop_phone:      (offer as any).shop?.phone,
      unlocked_at:     s.reward_unlocked_at,
      expires_at:      s.reward_expires_at,
    },
    streak,
  });
}

/**
 * POST /api/streak/redeem
 * Body: { locality_id: string }
 * Marks the reward as redeemed (single-use). Sets reward_redeemed_at = now().
 * Only the reward owner can redeem their own reward.
 */
export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const locality_id = body?.locality_id as string | undefined;
  if (!locality_id) return NextResponse.json({ error: "Missing locality_id" }, { status: 400 });

  const adminDb = createAdminClient();

  const { data: streak, error: fetchErr } = await adminDb
    .from("user_locality_streaks")
    .select("id, reward_unlocked, reward_offer_id, reward_expires_at, reward_redeemed_at")
    .eq("user_id", user.id)
    .eq("locality_id", locality_id)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  const s = streak as any;
  if (!s)                    return NextResponse.json({ error: "No streak found" }, { status: 404 });
  if (!s.reward_unlocked)    return NextResponse.json({ error: "Reward not unlocked" }, { status: 400 });
  if (!s.reward_offer_id)    return NextResponse.json({ error: "No offer assigned to reward" }, { status: 400 });
  if (s.reward_redeemed_at)  return NextResponse.json({ error: "Already redeemed" }, { status: 409 });
  if (s.reward_expires_at && new Date(s.reward_expires_at) < new Date()) {
    return NextResponse.json({ error: "Reward has expired" }, { status: 410 });
  }

  const { data: updated, error: updateErr } = await adminDb
    .from("user_locality_streaks")
    .update({ reward_redeemed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", s.id)
    .select().single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ success: true, redeemed_at: (updated as any).reward_redeemed_at });
}
