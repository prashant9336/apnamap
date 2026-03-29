import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireVendor(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) return { user: null, role: null };

  // ✅ Profiles table first
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

  if (role === "vendor" || role === "admin") {
    return { user, role };
  }

  return { user: null, role };
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { user, role } = await requireVendor(supabase);

  if (!user) {
    return NextResponse.json(
      { error: "Forbidden", debug_role: role },
      { status: 403 }
    );
  }

  const { data: shops, error: shopErr } = await supabase
    .from("shops")
    .select(`
      *,
      offers(*),
      category:categories(name,slug,icon,color),
      locality:localities(name,slug)
    `)
    .eq("vendor_id", user.id)
    .order("created_at", { ascending: false });

  if (shopErr) {
    return NextResponse.json({ error: shopErr.message }, { status: 500 });
  }

  const shopIds = (shops ?? []).map((s: any) => s.id);
  let analytics: any[] = [];

  if (shopIds.length > 0) {
    const { data } = await supabase
      .from("analytics_events")
      .select("event_type, shop_id")
      .in("shop_id", shopIds);

    analytics = data ?? [];
  }

  const stats = {
    total_views: analytics.filter((e) => e.event_type === "view").length,
    total_calls: analytics.filter((e) => e.event_type === "call").length,
    total_whatsapp: analytics.filter((e) => e.event_type === "whatsapp").length,
    total_saves: analytics.filter((e) => e.event_type === "save").length,
  };

  return NextResponse.json({ shops: shops ?? [], stats, user_id: user.id, role });
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const { user } = await requireVendor(supabase);

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { shop_id, ...updates } = await req.json();

  const { data: shop } = await supabase
    .from("shops")
    .select("vendor_id")
    .eq("id", shop_id)
    .single();

  if (!shop || shop.vendor_id !== user.id) {
    return NextResponse.json({ error: "Not your shop" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("shops")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", shop_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ shop: data });
}