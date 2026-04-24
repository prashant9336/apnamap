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

/* ── GET ──────────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminSb = createAdminClient();
  const url = new URL(req.url);
  const showDeleted = url.searchParams.get("include_deleted") === "true";

  let query = adminSb
    .from("shops")
    .select(`
      id, name, slug, description, phone, whatsapp, address,
      lat, lng, vendor_id, is_approved, is_active, is_featured, is_boosted,
      is_recommended, is_hidden_gem, is_trending, manual_priority,
      view_count, avg_rating, review_count,
      open_time, close_time, open_days,
      approval_status, rejection_reason, rejected_at, rejected_by,
      approved_at, approved_by,
      deleted_at, deleted_by, delete_reason,
      updated_at, created_at,
      category:categories(id, name, icon),
      subcategory:subcategories(id, name, icon),
      locality:localities(id, name),
      offers(id, is_active, ends_at),
      vendor:vendors(
        id, mobile, is_approved,
        owner:profiles(name, phone, status)
      )
    `)
    .order("created_at", { ascending: false });

  if (!showDeleted) query = query.is("deleted_at", null);

  const { data: shops, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const s = shops ?? [];
  return NextResponse.json({
    shops: s,
    stats: {
      total:    s.filter((x: any) => !x.deleted_at).length,
      pending:  s.filter((x: any) => x.approval_status === "pending"  && !x.deleted_at).length,
      approved: s.filter((x: any) => x.approval_status === "approved" && !x.deleted_at).length,
      rejected: s.filter((x: any) => x.approval_status === "rejected" && !x.deleted_at).length,
      active:   s.filter((x: any) => x.is_active && !x.deleted_at).length,
      deleted:  s.filter((x: any) => !!x.deleted_at).length,
    },
    auto_approval_enabled: process.env.AUTO_APPROVAL_ENABLED !== "false",
  });
}

/* ── PATCH ────────────────────────────────────────────────────────────── */
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    shop_id: string;
    action: string;
    fields?: Record<string, unknown>;
    reason?: string;
    reactivate_vendor?: boolean;
  };
  const { shop_id, action, fields, reason, reactivate_vendor } = body;
  if (!shop_id || !action) {
    return NextResponse.json({ error: "Missing shop_id or action" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const now = new Date().toISOString();

  const { data: before } = await adminClient
    .from("shops")
    .select("approval_status, is_approved, is_active, is_featured, is_boosted, deleted_at, vendor_id")
    .eq("id", shop_id)
    .maybeSingle();

  if (!before) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  let updates: Record<string, unknown> = {};

  if (action === "approve") {
    updates = {
      approval_status: "approved",
      is_approved:     true,
      is_active:       true,
      approved_at:     now,
      approved_by:     admin.id,
      rejected_at:     null,
      rejected_by:     null,
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
  } else if (action === "toggle_active") {
    updates = { is_active: !before.is_active };
  } else if (action === "restore") {
    updates = {
      approval_status:  "pending",
      is_approved:      false,
      is_active:        false,
      deleted_at:       null,
      deleted_by:       null,
      delete_reason:    null,
      rejected_at:      null,
      rejected_by:      null,
      rejection_reason: null,
      approved_at:      null,
      approved_by:      null,
    };
    if (reactivate_vendor && before.vendor_id) {
      await adminClient
        .from("profiles")
        .update({ status: "active", updated_at: now })
        .eq("id", before.vendor_id);
      logAdminAction(adminClient, admin.id, "vendor_reactivate", "profile", before.vendor_id,
        {}, { status: "active" }, `Reactivated via shop restore: ${shop_id}`);
    }
  } else if (action === "edit" && fields) {
    const allowed = [
      "name", "description", "phone", "whatsapp", "address",
      "category_id", "locality_id", "lat", "lng",
      "open_time", "close_time", "open_days",
      "is_active", "is_featured", "logo_url", "cover_url",
      "is_boosted", "is_recommended", "is_hidden_gem", "is_trending",
      "manual_priority", "display_rating", "display_rating_count",
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

  const { error } = await adminClient
    .from("shops")
    .update({ ...updates, updated_at: now })
    .eq("id", shop_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAdminAction(adminClient, admin.id, `shop_${action}`, "shop", shop_id,
    { approval_status: before.approval_status, is_approved: before.is_approved },
    updates, reason);

  return NextResponse.json({ shop: { id: shop_id, ...before, ...updates } });
}

/* ── DELETE (soft) ────────────────────────────────────────────────────── */
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const shopId        = url.searchParams.get("shop_id");
  const reason        = url.searchParams.get("reason") ?? undefined;
  const suspendVendor = url.searchParams.get("suspend_vendor") === "true";

  if (!shopId) return NextResponse.json({ error: "shop_id required" }, { status: 400 });

  const adminClient = createAdminClient();
  const { data: shopBefore } = await adminClient
    .from("shops")
    .select("id, name, vendor_id, approval_status, is_approved, is_active, deleted_at")
    .eq("id", shopId)
    .maybeSingle();

  if (!shopBefore)          return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  if (shopBefore.deleted_at) return NextResponse.json({ error: "Shop already deleted" }, { status: 409 });

  const now = new Date().toISOString();

  const { error: deleteErr } = await adminClient
    .from("shops")
    .update({
      deleted_at:    now,
      deleted_by:    admin.id,
      delete_reason: reason ?? null,
      is_active:     false,
      is_approved:   false,
      updated_at:    now,
    })
    .eq("id", shopId);

  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });

  if (suspendVendor && shopBefore.vendor_id) {
    await adminClient
      .from("profiles")
      .update({ status: "suspended", updated_at: now })
      .eq("id", shopBefore.vendor_id);
    logAdminAction(adminClient, admin.id, "vendor_suspend", "profile",
      shopBefore.vendor_id, {}, { status: "suspended" },
      `Auto-suspended: shop ${shopId} deleted`);
  }

  logAdminAction(adminClient, admin.id, "shop_delete", "shop", shopId,
    { approval_status: shopBefore.approval_status, is_active: shopBefore.is_active },
    { deleted_at: now, delete_reason: reason ?? null, suspend_vendor: suspendVendor }, reason);

  return NextResponse.json({ deleted: true, soft: true });
}
