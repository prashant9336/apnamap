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

/* ── GET — list profiles with optional filters ────────────────────────── */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminClient = createAdminClient();
  const url = new URL(req.url);
  const role   = url.searchParams.get("role")   ?? "all";
  const search = url.searchParams.get("search") ?? "";

  let query = adminClient
    .from("profiles")
    .select(`
      id, name, phone, role, status, created_at, updated_at,
      vendor:vendors(id, mobile, is_approved, must_change_password)
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  if (role !== "all") query = query.eq("role", role);
  if (search.trim()) {
    query = query.or(`name.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ users: data ?? [] });
}

/* ── PATCH — change role / suspend / reactivate / soft-delete ────────── */
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    user_id: string;
    action:  "change_role" | "suspend" | "reactivate" | "delete";
    role?:   string;
    reason?: string;
  };
  const { user_id, action, role, reason } = body;
  if (!user_id || !action) {
    return NextResponse.json({ error: "Missing user_id or action" }, { status: 400 });
  }
  // Prevent admin from modifying their own account
  if (user_id === admin.id) {
    return NextResponse.json({ error: "Cannot modify your own account" }, { status: 403 });
  }

  const adminClient = createAdminClient();

  const { data: before } = await adminClient
    .from("profiles").select("role, status, name").eq("id", user_id).single();
  if (!before) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let updates: Record<string, unknown> = {};
  let auditAction = action;

  if (action === "change_role") {
    const VALID_ROLES = ["customer", "vendor", "admin"];
    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    updates = { role };
    // Ensure vendor row exists when promoting to vendor
    if (role === "vendor") {
      await adminClient.from("vendors").upsert({ id: user_id }, { onConflict: "id" });
    }
    auditAction = `role_to_${role}`;
  } else if (action === "suspend") {
    updates = { status: "suspended" };
  } else if (action === "reactivate") {
    updates = { status: "active" };
  } else if (action === "delete") {
    // Soft-delete: mark profile as deleted, deactivate their shops
    updates = { status: "deleted" };
    await adminClient
      .from("shops")
      .update({ is_active: false, is_approved: false, updated_at: new Date().toISOString() })
      .eq("vendor_id", user_id)
      .is("deleted_at", null);
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { data, error } = await adminClient
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", user_id)
    .select("id, name, phone, role, status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAdminAction(adminClient, admin.id, auditAction, "profile", user_id,
    { role: before.role, status: before.status },
    updates,
    reason,
  );

  return NextResponse.json({ user: data });
}
