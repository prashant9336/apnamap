-- Migration 030: Fix shops orphaned in 'pending' by migration 028's backfill gap.
--
-- Root cause: migration 028 backfilled approval_status='rejected' only when
-- rejected_at IS NOT NULL. But the pre-028 "best-effort" two-step rejection
-- sometimes left rejected_at=null (second UPDATE failed silently). Those shops
-- defaulted to approval_status='pending' and kept appearing in the pending queue.
--
-- This migration re-runs the backfill with additional markers:
--   • rejected_at  IS NOT NULL  — was caught by 028; safe to run again
--   • rejected_by  IS NOT NULL  — admin explicitly rejected via new code (028+)
--
-- Shops with is_approved=false, is_active=false, rejected_at=null, rejected_by=null
-- are AMBIGUOUS — they could be legitimately pending OR old pre-027 rejections.
-- Those are left as 'pending' and must be reviewed manually by the admin.
-- (There is no safe way to automatically distinguish them without audit history.)

BEGIN;

-- ── 1. Backfill shops that have rejection markers but wrong approval_status ────
UPDATE shops
SET    approval_status = 'rejected',
       updated_at      = NOW()
WHERE  approval_status  = 'pending'
  AND  is_approved      = false
  AND  is_active        = false
  AND  deleted_at       IS NULL
  AND  (
    rejected_at IS NOT NULL    -- was set by 027-era code but 028 backfill missed it
    OR
    rejected_by IS NOT NULL    -- set by 028+ code but somehow approval_status is still 'pending'
  );

-- ── 2. Close the RLS gap: prevent vendors from directly overwriting approval fields
-- The 001_schema.sql "shops_vendor_all" policy is FOR ALL — meaning a vendor's
-- browser Supabase client could theoretically PATCH approval_status directly.
-- Replace with split policies: SELECT/INSERT are unchanged; UPDATE restricts
-- what columns the vendor can affect by locking approval fields via a trigger.

-- 2a. Replace FOR ALL with separate policies
DROP POLICY IF EXISTS "shops_vendor_all" ON shops;

-- Vendor can see their own shops (all approval states — they need to see pending/rejected)
DROP POLICY IF EXISTS "shops_vendor_select" ON shops;
CREATE POLICY "shops_vendor_select" ON shops
  FOR SELECT USING (auth.uid() = vendor_id);

-- Vendor can insert new shops (they must always start as pending/unapproved)
DROP POLICY IF EXISTS "shops_vendor_insert" ON shops;
CREATE POLICY "shops_vendor_insert" ON shops
  FOR INSERT WITH CHECK (
    auth.uid()       = vendor_id
    AND is_approved  = false
    AND is_active    = false
    AND approval_status = 'pending'
  );

-- Vendor can delete their own shop (soft-delete is done via API but allow hard-delete of their own data)
DROP POLICY IF EXISTS "shops_vendor_delete" ON shops;
CREATE POLICY "shops_vendor_delete" ON shops
  FOR DELETE USING (auth.uid() = vendor_id);

-- Vendor can UPDATE their own shop — but the trigger below prevents approval field tampering
DROP POLICY IF EXISTS "shops_vendor_update" ON shops;
CREATE POLICY "shops_vendor_update" ON shops
  FOR UPDATE USING  (auth.uid() = vendor_id)
  WITH CHECK (auth.uid() = vendor_id);

-- 2b. Trigger to lock approval fields against direct vendor writes
--     Runs as SECURITY DEFINER so it can see auth.role().
--     Service-role calls (admin API) bypass this — they set jwt to service_role.
CREATE OR REPLACE FUNCTION prevent_vendor_approval_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Service role (createAdminClient) may change anything — skip check.
  -- auth.role() reads the JWT claim set by Supabase for each request:
  --   'service_role' → admin API (createAdminClient)
  --   'authenticated' → vendor/user session (createClient)
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- For authenticated (user-session) callers, silently restore approval fields
  -- to their existing DB values — vendors cannot change these via direct SQL.
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
  NEW.vendor_id         := OLD.vendor_id;  -- vendor cannot re-assign shop to another vendor

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shops_lock_approval_fields ON shops;
CREATE TRIGGER shops_lock_approval_fields
  BEFORE UPDATE ON shops
  FOR EACH ROW
  EXECUTE FUNCTION prevent_vendor_approval_tampering();

-- ── 3. Verification query — run after migration to confirm ────────────────────
-- Expected: no rows with approval_status='pending' AND (rejected_at IS NOT NULL OR rejected_by IS NOT NULL)
-- SELECT COUNT(*) FROM shops
-- WHERE  approval_status = 'pending'
--   AND  deleted_at IS NULL
--   AND  (rejected_at IS NOT NULL OR rejected_by IS NOT NULL);

COMMIT;
