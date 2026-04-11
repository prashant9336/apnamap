import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("shops")
    .select(`
      *,
      locality:localities(*, city:cities(name, slug)),
      category:categories(id, name, slug, icon, color),
      offers(id, title, description, discount_type, discount_value, coupon_code, ends_at, tier, is_active, click_count)
    `)
    .eq("slug", params.id)
    .eq("is_approved", true)
    .single();

  if (error || !data) return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  return NextResponse.json({ shop: data }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}

// Same allowlist as /api/vendor PATCH — vendor may only edit operational fields.
// Admin-only fields (is_approved, is_active, is_featured, vendor_id, etc.) are excluded.
const VENDOR_EDITABLE_SHOP_FIELDS = [
  "name", "description", "phone", "whatsapp", "address",
  "lat", "lng", "logo_url", "cover_url",
  "open_time", "close_time", "open_days",
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;

  const updates: Record<string, unknown> = {};
  for (const field of VENDOR_EDITABLE_SHOP_FIELDS) {
    if (field in body) updates[field] = body[field];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("shops")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("vendor_id", user.id) // ownership enforcement
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ shop: data });
}
