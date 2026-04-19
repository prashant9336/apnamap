import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function requireAdmin(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return data?.role === "admin" ? user : null;
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const admin    = await requireAdmin(supabase);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminClient = createAdminClient();

  const [shops, offers, users, pending] = await Promise.all([
    adminClient.from("shops").select("id", { count: "exact", head: true }),
    adminClient.from("offers").select("id", { count: "exact", head: true }).eq("is_active", true),
    adminClient.from("profiles").select("id", { count: "exact", head: true }),
    adminClient.from("shops").select("id", { count: "exact", head: true }).eq("is_approved", false),
  ]);

  return NextResponse.json({
    total_shops:   shops.count   ?? 0,
    total_offers:  offers.count  ?? 0,
    total_users:   users.count   ?? 0,
    pending_shops: pending.count ?? 0,
  });
}

// Approve / reject shop
export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const admin    = await requireAdmin(supabase);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { shop_id, action } = await req.json();
  const adminClient = createAdminClient();

  if (action === "approve") {
    await adminClient.from("shops").update({ is_approved: true, is_active: true }).eq("id", shop_id);
  } else if (action === "reject") {
    await adminClient.from("shops").update({ is_approved: false, is_active: false }).eq("id", shop_id);
  }

  return NextResponse.json({ ok: true });
}
