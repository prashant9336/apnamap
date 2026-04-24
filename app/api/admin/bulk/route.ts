import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/audit";

async function requireAdmin(req: NextRequest) {
  const adminSb = createAdminClient();
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
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
  return (profile?.role ?? "customer") === "admin" ? user : null;
}

const MAX_BATCH = 100;

const TAG_COLUMN: Record<string, string> = {
  recommended: "is_recommended",
  hidden_gem:  "is_hidden_gem",
  trending:    "is_trending",
  featured:    "is_featured",
  boosted:     "is_boosted",
};

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    action:      string;
    shop_ids:    string[];
    reason?:     string;
    category_id?: string;
    tags?:       string[];
  };
  const { action, shop_ids, reason, category_id, tags } = body;

  if (!Array.isArray(shop_ids) || shop_ids.length === 0)
    return NextResponse.json({ error: "shop_ids required" }, { status: 400 });
  if (shop_ids.length > MAX_BATCH)
    return NextResponse.json({ error: `Max ${MAX_BATCH} shops per batch` }, { status: 400 });
  if (!shop_ids.every(id => typeof id === "string" && id.length > 0))
    return NextResponse.json({ error: "Invalid shop_ids" }, { status: 400 });

  const adminClient = createAdminClient();
  const now = new Date().toISOString();
  let updates: Record<string, unknown> = {};

  if (action === "approve") {
    updates = {
      approval_status:  "approved",
      is_approved:      true,
      is_active:        true,
      approved_at:      now,
      approved_by:      admin.id,
      rejected_at:      null,
      rejected_by:      null,
      rejection_reason: null,
    };
  } else if (action === "reject") {
    updates = {
      approval_status:  "rejected",
      is_approved:      false,
      is_active:        false,
      rejected_at:      now,
      rejected_by:      admin.id,
      rejection_reason: reason ?? null,
      approved_at:      null,
      approved_by:      null,
    };
  } else if (action === "assign_category") {
    if (!category_id)
      return NextResponse.json({ error: "category_id required" }, { status: 400 });
    const { data: cat } = await adminClient
      .from("categories").select("id").eq("id", category_id).maybeSingle();
    if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    updates = { category_id };
  } else if (action === "add_tags" || action === "remove_tags") {
    const val = action === "add_tags";
    if (!Array.isArray(tags) || tags.length === 0)
      return NextResponse.json({ error: "tags required" }, { status: 400 });
    for (const t of tags) {
      const col = TAG_COLUMN[t];
      if (col) updates[col] = val;
    }
    if (Object.keys(updates).length === 0)
      return NextResponse.json({
        error: `Valid tags: ${Object.keys(TAG_COLUMN).join(", ")}`,
      }, { status: 400 });
  } else {
    return NextResponse.json(
      { error: "Invalid action. Valid: approve, reject, assign_category, add_tags, remove_tags" },
      { status: 400 },
    );
  }

  const { error } = await adminClient
    .from("shops")
    .update({ ...updates, updated_at: now })
    .in("id", shop_ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAdminAction(
    adminClient, admin.id, `bulk_${action}`, "shop", null,
    { count: shop_ids.length },
    { ...updates, shop_ids },
    reason,
  );

  return NextResponse.json({ updated: shop_ids.length, action });
}
