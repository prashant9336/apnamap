import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { vendorAuthEmail, phoneDigits, VENDOR_LOGIN_URL } from "@/lib/config";
import { randomBytes } from "crypto";

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

  const { data: profile } = await adminSb
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  return profile?.role === "admin" ? user : null;
}

function generateTempPassword(): string {
  return randomBytes(9).toString("base64url") + "@1";
}

function whatsappText(shopName: string, mobile: string, password: string): string {
  return (
    `🔑 *ApnaMap Password Reset*\n\n` +
    `Your password for *${shopName}* has been reset by admin.\n\n` +
    `*New Login Details:*\n` +
    `📱 Mobile: ${mobile}\n` +
    `🔑 Temp Password: \`${password}\`\n\n` +
    `*Login here:*\n${VENDOR_LOGIN_URL}\n\n` +
    `⚠️ You will be asked to set a new permanent password after login.\n\n` +
    `_ApnaMap Team_`
  );
}

/* ── GET /api/admin/reset-vendor-password?q=<mobile|shop_name> ── */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return NextResponse.json({ vendors: [] });

  const adminSb = createAdminClient();
  const pureDigits = q.replace(/\D/g, "");
  const isPhoneSearch = pureDigits.length >= 6 && /^[\d\s+\-()]+$/.test(q);

  if (isPhoneSearch) {
    const { data, error } = await adminSb
      .from("vendors")
      .select("id, mobile, shops(id, name)")
      .ilike("mobile", `%${pureDigits.slice(-10)}%`)
      .limit(10);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ vendors: data ?? [] });
  }

  // Search by shop name
  const { data: shops, error: shopErr } = await adminSb
    .from("shops")
    .select("id, name, vendor_id")
    .ilike("name", `%${q}%`)
    .limit(10);
  if (shopErr) return NextResponse.json({ error: shopErr.message }, { status: 500 });
  if (!shops?.length) return NextResponse.json({ vendors: [] });

  const vendorIds = Array.from(new Set(shops.map(s => s.vendor_id)));
  const { data: vendorRows } = await adminSb
    .from("vendors")
    .select("id, mobile")
    .in("id", vendorIds);

  const results = shops.map(shop => {
    const v = vendorRows?.find(x => x.id === shop.vendor_id);
    return {
      id:     shop.vendor_id,
      mobile: v?.mobile ?? null,
      shops:  [{ id: shop.id, name: shop.name }],
    };
  });

  return NextResponse.json({ vendors: results });
}

/* ── POST /api/admin/reset-vendor-password ── */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { vendor_id } = await req.json() as { vendor_id: string };
  if (!vendor_id) return NextResponse.json({ error: "Missing vendor_id" }, { status: 400 });

  const adminSb = createAdminClient();

  const { data: vendor, error: vErr } = await adminSb
    .from("vendors")
    .select("id, mobile, shops(name)")
    .eq("id", vendor_id)
    .maybeSingle();

  if (vErr || !vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const tempPass = generateTempPassword();

  const { error: pwErr } = await adminSb.auth.admin.updateUserById(vendor_id, {
    password: tempPass,
  });
  if (pwErr) return NextResponse.json({ error: pwErr.message }, { status: 500 });

  await adminSb.from("vendors").update({ must_change_password: true }).eq("id", vendor_id);

  const shopArr = vendor.shops as unknown as Array<{ name: string }>;
  const shopName = shopArr?.[0]?.name ?? "your shop";
  const digits = phoneDigits(vendor.mobile ?? "");
  const mobileDisplay = digits ? `+91 ${digits}` : vendor.mobile ?? "";

  return NextResponse.json({
    success:       true,
    temp_password: tempPass,
    whatsapp_msg:  whatsappText(shopName, mobileDisplay, tempPass),
  });
}
