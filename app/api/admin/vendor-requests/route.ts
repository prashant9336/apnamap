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

  const { data: profile } = await adminSb
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = profile?.role ?? "customer";
  return role === "admin" ? user : null;
}

/* ── GET /api/admin/vendor-requests ──────────────────────────────── */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminSb = createAdminClient();
  const { data: requests, error } = await adminSb
    .from("vendor_requests")
    .select(`
      id, mobile, shop_name, request_type, status, note,
      created_at, reviewed_at, review_note,
      locality:localities(name),
      category:categories(name, icon)
    `)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: requests ?? [] });
}

/* ── PATCH /api/admin/vendor-requests ────────────────────────────── */
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    request_id: string;
    action: "approve" | "reject";
    note?: string;
  };
  const { request_id, action, note } = body;

  if (!request_id) return NextResponse.json({ error: "Missing request_id" }, { status: 400 });
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const adminSb = createAdminClient();
  const { data, error } = await adminSb
    .from("vendor_requests")
    .update({
      status:      action === "approve" ? "approved" : "rejected",
      reviewed_at: new Date().toISOString(),
      review_note: note?.trim() || null,
    })
    .eq("id", request_id)
    .select("id, status, reviewed_at, review_note")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ request: data });
}
