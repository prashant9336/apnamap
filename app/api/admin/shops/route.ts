import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role =
    profile?.role ||
    user.user_metadata?.role ||
    user.app_metadata?.role ||
    "customer";

  return role === "admin" ? user : null;
}

export async function GET() {
  const supabase = createClient();
  const admin = await requireAdmin(supabase);

  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: shops, error } = await supabase
    .from("shops")
    .select(`
      id,
      name,
      slug,
      vendor_id,
      is_approved,
      is_active,
      created_at,
      phone,
      address,
      category:categories(name, icon),
      locality:localities(name)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const safeShops = shops ?? [];

  const stats = {
    total: safeShops.length,
    approved: safeShops.filter((s: any) => s.is_approved).length,
    pending: safeShops.filter((s: any) => !s.is_approved).length,
    active: safeShops.filter((s: any) => s.is_active).length,
  };

  return NextResponse.json({ shops: safeShops, stats });
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const admin = await requireAdmin(supabase);

  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as {
    shop_id: string;
    action: string;
    fields?: Record<string, unknown>;
  };
  const { shop_id, action, fields } = body;

  if (!shop_id || !action) {
    return NextResponse.json({ error: "Missing shop_id or action" }, { status: 400 });
  }

  // Use admin client for editing so RLS doesn't block cross-vendor edits
  const { createAdminClient } = await import("@/lib/supabase/server");
  const adminClient = createAdminClient();

  let updates: Record<string, unknown> = {};

  if (action === "approve") {
    updates = { is_approved: true, is_active: true };
  } else if (action === "reject") {
    updates = { is_approved: false, is_active: false };
  } else if (action === "toggle_active") {
    const { data: current } = await supabase
      .from("shops")
      .select("is_active")
      .eq("id", shop_id)
      .single();

    updates = { is_active: !current?.is_active };
  } else if (action === "edit" && fields) {
    // Full shop field edit by admin
    const allowed = [
      "name","description","phone","whatsapp","address",
      "category_id","locality_id","lat","lng",
      "open_time","close_time","open_days",
      "is_active","is_featured","logo_url","cover_url",
      // badge/boost controls
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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ shop: data });
}