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

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const locality_id = body?.locality_id as string | undefined;
    if (!locality_id) return NextResponse.json({ error: "Missing locality_id" }, { status: 400 });

    const adminDb = createAdminClient();
    const today     = ymdInIndia();
    const yesterday = previousYmd(today);

    const { data: existing, error: fetchErr } = await adminDb
      .from("user_locality_streaks")
      .select("*")
      .eq("user_id", user.id)
      .eq("locality_id", locality_id)
      .maybeSingle();

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

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
      return NextResponse.json({ streak: inserted, status: "started" });
    }

    if (existing.last_visit_date === today) {
      return NextResponse.json({ streak: existing, status: "already_counted_today" });
    }

    const nextCount     = existing.last_visit_date === yesterday ? existing.streak_count + 1 : 1;
    const rewardUnlocked = !existing.reward_unlocked && nextCount >= 3 ? true : existing.reward_unlocked;
    const rewardCode     = rewardUnlocked && !existing.reward_code
      ? `SILVER-${String(user.id).slice(0, 6).toUpperCase()}`
      : existing.reward_code;

    const { data: updated, error: updateErr } = await adminDb
      .from("user_locality_streaks")
      .update({ streak_count: nextCount, last_visit_date: today, reward_unlocked: rewardUnlocked, reward_code: rewardCode })
      .eq("id", existing.id)
      .select().single();

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    return NextResponse.json({
      streak: updated,
      status: rewardUnlocked && nextCount >= 3 ? "reward_unlocked" : "updated",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown server error" }, { status: 500 });
  }
}
