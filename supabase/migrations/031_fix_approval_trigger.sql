-- Migration 031: Fix prevent_vendor_approval_tampering trigger
--
-- ROOT CAUSE (migration 030 bug):
--   The trigger checked `IF auth.role() = 'service_role' THEN allow`.
--   But auth.role() returns NULL when SQL is run directly in the Supabase
--   Dashboard SQL Editor, in migrations, or in any non-PostgREST context
--   (pg_cron, direct psql, etc.) because there is no JWT in those sessions.
--   NULL = 'service_role' evaluates to NULL (falsy), so the trigger fell
--   through to the "restore old values" block, silently reverting every
--   manual approval/rejection made from the Dashboard.
--
-- FIX:
--   Allow the update (RETURN NEW unchanged) when:
--     1. auth.role() = 'service_role'   → admin API (createAdminClient)
--     2. auth.role() IS NULL            → direct SQL (Dashboard / migrations / cron)
--     3. current_user IS a trusted PG role (belt-and-suspenders for edge cases)
--   Block (restore old values) only when:
--     auth.role() = 'authenticated' OR auth.role() = 'anon'
--     → vendor browser calls via createClient()

BEGIN;

CREATE OR REPLACE FUNCTION prevent_vendor_approval_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := auth.role();

  -- ── ALLOW: no JWT context (Dashboard SQL, migrations, pg_cron, direct psql)
  IF v_role IS NULL THEN
    RETURN NEW;
  END IF;

  -- ── ALLOW: service role (createAdminClient in API routes)
  IF v_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- ── ALLOW: superuser PostgreSQL roles (belt-and-suspenders)
  IF current_user IN ('postgres', 'supabase_admin', 'supabase_replication_admin') THEN
    RETURN NEW;
  END IF;

  -- ── BLOCK: authenticated user (vendor browser client) or anon
  -- Silently restore all approval/audit fields to their pre-update values.
  -- The vendor may still update safe fields (name, description, phone, etc.) —
  -- only the locked fields are reverted.
  NEW.approval_status   := OLD.approval_status;
  NEW.is_approved       := OLD.is_approved;
  NEW.is_active         := OLD.is_active;
  NEW.rejected_at       := OLD.rejected_at;
  NEW.rejected_by       := OLD.rejected_by;
  NEW.rejection_reason  := OLD.rejection_reason;
  NEW.approved_at       := OLD.approved_at;
  NEW.approved_by       := OLD.approved_by;
  NEW.deleted_at        := OLD.deleted_at;
  NEW.deleted_by        := OLD.deleted_by;
  NEW.delete_reason     := OLD.delete_reason;
  NEW.vendor_id         := OLD.vendor_id;

  RETURN NEW;
END;
$$;

-- Trigger already exists from migration 030; DROP+CREATE replaces the function body.
-- The trigger binding on the shops table is unchanged.
DROP TRIGGER IF EXISTS shops_lock_approval_fields ON shops;
CREATE TRIGGER shops_lock_approval_fields
  BEFORE UPDATE ON shops
  FOR EACH ROW
  EXECUTE FUNCTION prevent_vendor_approval_tampering();

-- ── Verification: confirm the fix works ──────────────────────────────────────
-- Run these in order in the SQL Editor after applying this migration:
--
-- 1. Set a shop to approved manually:
--    UPDATE shops SET is_approved=true, is_active=true, approval_status='approved'
--    WHERE id = '<any-shop-id>';
--
-- 2. Immediately read it back — should stay approved:
--    SELECT id, is_approved, is_active, approval_status FROM shops WHERE id = '<same-id>';
--
-- 3. Confirm vendor browser calls still can't change it (test only, don't run in prod):
--    -- auth.role() = 'authenticated' path is blocked by the trigger

COMMIT;
