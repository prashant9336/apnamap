import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function requireAdmin(req: NextRequest) {
  const adminSb = createAdminClient();
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();

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
  // ONLY trust the server-managed profiles.role column.
  // user_metadata is user-settable via supabase.auth.updateUser() — never use it for privilege checks.
  // app_metadata is service-role-only but profiles.role is the canonical source here.
  const role = profile?.role ?? "customer";
  return role === "admin" ? user : null;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminSb = createAdminClient();
  const { data: shops, error } = await adminSb
    .from("shops")
    .select(`
      id, name, slug, description, phone, whatsapp, address,
      vendor_id, is_approved, is_active, is_featured, is_boosted,
      view_count, avg_rating, review_count,
      updated_at, created_at,
      category:categories(id, name, icon),
      subcategory:subcategories(id, name, icon),
      locality:localities(id, name),
      offers(id, is_active, ends_at)
    `)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const safeShops = shops ?? [];
  const stats = {
    total:    safeShops.length,
    approved: safeShops.filter((s: any) => s.is_approved).length,
    pending:  safeShops.filter((s: any) => !s.is_approved).length,
    active:   safeShops.filter((s: any) => s.is_active).length,
  };
  return NextResponse.json({
    shops: safeShops,
    stats,
    auto_approval_enabled: process.env.AUTO_APPROVAL_ENABLED !== "false",
  });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    shop_id: string;
    action: string;
    fields?: Record<string, unknown>;
  };
  const { shop_id, action, fields } = body;
  if (!shop_id || !action) return NextResponse.json({ error: "Missing shop_id or action" }, { status: 400 });

  const adminClient = createAdminClient();
  let updates: Record<string, unknown> = {};

  if (action === "approve") {
    updates = { is_approved: true, is_active: true };
  } else if (action === "reject") {
    updates = { is_approved: false, is_active: false };
  } else if (action === "toggle_active") {
    const { data: current } = await adminClient
      .from("shops").select("is_active").eq("id", shop_id).single();
    updates = { is_active: !current?.is_active };
  } else if (action === "edit" && fields) {
    const allowed = [
      "name","description","phone","whatsapp","address",
      "category_id","locality_id","lat","lng",
      "open_time","close_time","open_days",
      "is_active","is_featured","logo_url","cover_url",
      "is_boosted","is_recommended","is_hidden_gem","is_trending",
      "manual_priority","display_rating","display_rating_count",
    ] as const;
    for (const key of allowed) {
      if (key in fields) updates[key] = fields[key];
    }
    if ((updates.name as string)?.trim() === "") {
      return NextResponse.json({ error: "Shop name cannot be empty" }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { data, error } = await adminClient
    .from("shops")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", shop_id)
    .select(`
      id, name, slug, vendor_id, description, phone, whatsapp, address,
      lat, lng, open_time, close_time, open_days,
      is_approved, is_active, is_featured, is_claimed, created_at,
      category_id, locality_id,
      category:categories(name, icon),
      locality:localities(name)
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ shop: data });
}

/* ── DELETE — permanent shop removal (admin only) ──────────────── */
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const shopId = new URL(req.url).searchParams.get("shop_id");
  if (!shopId) return NextResponse.json({ error: "shop_id required" }, { status: 400 });

  const adminClient = createAdminClient();

  // Remove child records before deleting the shop to avoid FK constraint errors
  // (cascade may not be configured on all deployments)
  await adminClient.from("offers").delete().eq("shop_id", shopId);

  const { error } = await adminClient.from("shops").delete().eq("id", shopId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: true });
}
