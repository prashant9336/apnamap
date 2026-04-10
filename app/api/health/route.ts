import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    // Lightweight DB ping — count 1 row from a small table
    const { error } = await createAdminClient()
      .from("cities")
      .select("id", { count: "exact", head: true })
      .limit(1);

    if (error) {
      return NextResponse.json({ status: "degraded", db: error.message }, { status: 503 });
    }

    return NextResponse.json({ status: "ok", ts: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ status: "down", error: e?.message }, { status: 503 });
  }
}
