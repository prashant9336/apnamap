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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { data, error } = await supabase
    .from("shops")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("vendor_id", user.id) // ensure vendor owns shop
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ shop: data });
}
