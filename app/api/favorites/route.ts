import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

async function getUser(req: NextRequest) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();

  const adminSb = createAdminClient();
  if (token) {
    const { data } = await adminSb.auth.getUser(token);
    if (data.user) return data.user;
  }
  // fallback: cookie session
  const { data } = await createClient().auth.getUser();
  return data.user ?? null;
}

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminDb = createAdminClient();
  const { searchParams } = new URL(req.url);
  const shopId     = searchParams.get("shop_id");
  const offerId    = searchParams.get("offer_id");
  const localityId = searchParams.get("locality_id");

  // Single-item check: ?shop_id=X or ?offer_id=X or ?locality_id=X
  if (shopId || offerId || localityId) {
    let q = adminDb.from("favorites").select("id").eq("user_id", user.id);
    if (shopId)     q = q.eq("shop_id", shopId);
    if (offerId)    q = q.eq("offer_id", offerId);
    if (localityId) q = q.eq("locality_id", localityId);
    const { data } = await q.maybeSingle();
    return NextResponse.json({ saved: !!data });
  }

  // Full list
  const { data, error } = await adminDb
    .from("favorites")
    .select(`
      id, created_at,
      shop:shops(id, name, slug, logo_url, avg_rating,
        category:categories(name, icon),
        locality:localities(name)
      ),
      offer:offers(id, title, shop:shops(name, slug)),
      locality:localities(id, name, slug)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ favorites: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminDb = createAdminClient();
  const body = await req.json() as { shop_id?: string; offer_id?: string; locality_id?: string };
  const { shop_id, offer_id, locality_id } = body;

  if (!shop_id && !offer_id && !locality_id) {
    return NextResponse.json({ error: "Provide shop_id, offer_id, or locality_id" }, { status: 400 });
  }

  // Build targeted query to find existing favorite
  let q = adminDb.from("favorites").select("id").eq("user_id", user.id);
  if (shop_id)          q = q.eq("shop_id", shop_id).is("offer_id", null).is("locality_id", null);
  else if (offer_id)    q = q.eq("offer_id", offer_id).is("shop_id", null).is("locality_id", null);
  else if (locality_id) q = q.eq("locality_id", locality_id).is("shop_id", null).is("offer_id", null);

  const { data: existing } = await q.maybeSingle();

  if (existing) {
    await adminDb.from("favorites").delete().eq("id", existing.id);
    return NextResponse.json({ saved: false });
  }

  const row: Record<string, string> = { user_id: user.id };
  if (shop_id)     row.shop_id     = shop_id;
  if (offer_id)    row.offer_id    = offer_id;
  if (locality_id) row.locality_id = locality_id;

  const { error } = await adminDb.from("favorites").insert(row);
  if (error) {
    // Unique constraint violation = already saved (race condition)
    if (error.code === "23505") return NextResponse.json({ saved: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: true }, { status: 201 });
}
