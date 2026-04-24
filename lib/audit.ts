import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fire-and-forget admin audit logger.
 * Never throws — audit failure must not block the primary action.
 */
export function logAdminAction(
  adminClient: SupabaseClient,
  adminId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  beforeVal: Record<string, unknown> = {},
  afterVal: Record<string, unknown> = {},
  note?: string,
): void {
  adminClient
    .from("audit_logs")
    .insert({
      admin_id:    adminId,
      action,
      entity_type: entityType,
      entity_id:   entityId ?? null,
      before_val:  beforeVal,
      after_val:   afterVal,
      note:        note ?? null,
    })
    .then(({ error }) => {
      if (error) console.error("[audit] log failed:", error.message);
    });
}
