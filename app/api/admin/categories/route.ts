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
  const { data: profile } = await adminSb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return (profile?.role ?? "customer") === "admin" ? user : null;
}

/* ── GET — list all categories with shop counts ────────────────────────── */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminClient = createAdminClient();

  const [{ data: cats, error }, { data: shopRows }] = await Promise.all([
    adminClient
      .from("categories")
      .select("id, name, slug, icon, color, is_active, merged_into_id, parent_id, created_at")
      .order("name"),
    adminClient
      .from("shops")
      .select("category_id")
      .is("deleted_at", null),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Count shops per category (non-deleted)
  const countMap: Record<string, number> = {};
  (shopRows ?? []).forEach((s: any) => {
    if (s.category_id) countMap[s.category_id] = (countMap[s.category_id] ?? 0) + 1;
  });

  const withCounts = (cats ?? []).map((c: any) => ({
    ...c,
    shop_count: countMap[c.id] ?? 0,
  }));

  return NextResponse.json({ categories: withCounts });
}

/* ── POST — create category ────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    name: string; slug: string; icon?: string; color?: string; parent_id?: string;
  };
  const { name, slug, icon, color, parent_id } = body;

  if (!name?.trim() || !slug?.trim()) {
    return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("categories")
    .insert({
      name:      name.trim(),
      slug:      slug.trim(),
      icon:      icon?.trim()  ?? "🏪",
      color:     color?.trim() ?? "#FF5E1A",
      parent_id: parent_id    ?? null,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAdminAction(adminClient, admin.id, "category_create", "category", data.id, {}, data);
  return NextResponse.json({ category: data }, { status: 201 });
}

/* ── PATCH — edit / disable / enable / merge category ─────────────────── */
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    category_id:   string;
    action:        "edit" | "disable" | "enable" | "merge";
    fields?:       { name?: string; icon?: string; color?: string };
    merge_into_id?: string;
    reason?:       string;
  };
  const { category_id, action, fields, merge_into_id, reason } = body;
  if (!category_id || !action) {
    return NextResponse.json({ error: "Missing category_id or action" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Before state for audit
  const { data: before } = await adminClient
    .from("categories").select("*").eq("id", category_id).single();

  let updates: Record<string, unknown> = {};

  if (action === "edit" && fields) {
    if (fields.name  !== undefined) updates.name  = fields.name.trim();
    if (fields.icon  !== undefined) updates.icon  = fields.icon.trim();
    if (fields.color !== undefined) updates.color = fields.color.trim();
    if ((updates.name as string)?.length < 2) {
      return NextResponse.json({ error: "Category name must be at least 2 characters" }, { status: 400 });
    }
  } else if (action === "disable") {
    // Guard: ensure no active shops still use this category
    const { count } = await adminClient
      .from("shops")
      .select("*", { count: "exact", head: true })
      .eq("category_id", category_id)
      .eq("is_active", true)
      .is("deleted_at", null);

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: `Cannot disable: ${count} active shop(s) use this category. Reassign them first.` },
        { status: 409 },
      );
    }
    updates = { is_active: false };
  } else if (action === "enable") {
    updates = { is_active: true, merged_into_id: null };
  } else if (action === "merge" && merge_into_id) {
    if (merge_into_id === category_id) {
      return NextResponse.json({ error: "Cannot merge a category into itself" }, { status: 400 });
    }
    // Verify target category exists and is active
    const { data: target } = await adminClient
      .from("categories").select("id, is_active").eq("id", merge_into_id).single();
    if (!target) return NextResponse.json({ error: "Target category not found" }, { status: 404 });
    if (!target.is_active) return NextResponse.json({ error: "Target category is disabled" }, { status: 409 });

    // Reassign all shops from this category to the target
    await adminClient
      .from("shops")
      .update({ category_id: merge_into_id, updated_at: new Date().toISOString() })
      .eq("category_id", category_id);

    updates = { is_active: false, merged_into_id: merge_into_id };
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { data, error } = await adminClient
    .from("categories")
    .update(updates)
    .eq("id", category_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAdminAction(adminClient, admin.id, `category_${action}`, "category", category_id, before ?? {}, updates, reason);

  return NextResponse.json({ category: data });
}
