import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generatePostDraft } from "@/lib/post-generation";

async function getUser(req: NextRequest) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  const adminSb = createAdminClient();
  if (token) {
    const { data } = await adminSb.auth.getUser(token);
    return data.user;
  }
  const { data } = await createClient().auth.getUser();
  return data.user;
}

// ─── POST /api/vendor/voice-post ─────────────────────────────────
// Accepts: { transcript: string; shop_id: string }
// Returns: { draft: VoicePostDraft }
export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { transcript?: string; shop_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { transcript, shop_id } = body;

  if (!transcript?.trim())
    return NextResponse.json({ error: "transcript is required" }, { status: 400 });
  if (!shop_id)
    return NextResponse.json({ error: "shop_id is required" }, { status: 400 });
  if (transcript.length > 2000)
    return NextResponse.json({ error: "Transcript too long (max 2000 chars)" }, { status: 400 });

  // Verify vendor owns this shop — admin client bypasses RLS
  const adminDb = createAdminClient();
  const { data: shop } = await adminDb
    .from("shops")
    .select("id")
    .eq("id", shop_id)
    .eq("vendor_id", user.id)
    .maybeSingle();

  if (!shop)
    return NextResponse.json({ error: "Shop not found or not authorized" }, { status: 403 });

  // Generate structured draft
  const draftPayload = generatePostDraft(transcript, shop_id);

  // Persist as draft — use supabase client so RLS vendor_id check applies
  const supabase = createClient();
  const { data: saved, error: insertErr } = await supabase
    .from("voice_post_drafts")
    .insert({ ...draftPayload, vendor_id: user.id })
    .select()
    .single();

  if (insertErr || !saved)
    return NextResponse.json({ error: insertErr?.message ?? "Failed to save draft" }, { status: 500 });

  return NextResponse.json({ draft: saved });
}

// ─── PATCH /api/vendor/voice-post ────────────────────────────────
// Accepts: { id: string; title?; description?; deal_type?; offer_value_text?;
//            validity_text?; locality_text?; is_published?: boolean }
// Returns: { draft: VoicePostDraft }
export async function PATCH(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, ...fields } = body;
  if (!id || typeof id !== "string")
    return NextResponse.json({ error: "id is required" }, { status: 400 });

  // Verify ownership — admin client bypasses RLS
  const adminDb = createAdminClient();
  const { data: existing } = await adminDb
    .from("voice_post_drafts")
    .select("id")
    .eq("id", id)
    .eq("vendor_id", user.id)
    .maybeSingle();

  if (!existing)
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const allowed = [
    "title", "description", "deal_type", "offer_value_text",
    "validity_text", "valid_until", "locality_text", "is_published",
  ] as const;
  for (const key of allowed) {
    if (key in fields) update[key] = fields[key];
  }

  const supabase = createClient();
  const { data: updated, error: updateErr } = await supabase
    .from("voice_post_drafts")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (updateErr || !updated)
    return NextResponse.json({ error: updateErr?.message ?? "Update failed" }, { status: 500 });

  return NextResponse.json({ draft: updated });
}
