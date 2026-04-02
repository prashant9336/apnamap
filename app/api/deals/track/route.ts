import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/deals/track
 * Body: { offerId: string; event: "view" | "click" }
 *
 * Atomically increments view_count or click_count on the offers row
 * via a Postgres function that avoids read-modify-write races.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { offerId?: string; event?: string };
    const { offerId, event } = body;

    if (!offerId || (event !== "view" && event !== "click")) {
      return NextResponse.json({ error: "offerId and event (view|click) required" }, { status: 400 });
    }

    const supabase = createClient();
    await supabase
      .rpc("increment_offer_counter", { p_offer_id: offerId, p_event: event })
      .then(() => {}); // fire-and-forget — don't surface DB errors to client

    return NextResponse.json({ ok: true });
  } catch {
    // Non-critical — tracking must never break the app
    return NextResponse.json({ ok: false });
  }
}
