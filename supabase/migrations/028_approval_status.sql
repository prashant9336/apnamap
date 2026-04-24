-- Migration 028: Proper approval_status model for shops
-- Replaces the fragile boolean-only approach (is_approved/is_active cannot
-- distinguish "rejected" from "pending"). Adds a single authoritative enum
-- column plus audit fields for every state transition.

BEGIN;

-- ── 1. Add approval_status column ───────────────────────────────────────
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS approval_status   TEXT        NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejection_reason  TEXT,
  ADD COLUMN IF NOT EXISTS rejected_by       UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by       UUID        REFERENCES profiles(id) ON DELETE SET NULL;

-- Add CHECK constraint (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'shops' AND constraint_name = 'shops_approval_status_check'
  ) THEN
    ALTER TABLE shops
      ADD CONSTRAINT shops_approval_status_check
      CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- ── 2. Backfill existing rows ────────────────────────────────────────────
-- Approved shops (is_approved=true) → 'approved'
UPDATE shops SET approval_status = 'approved'
  WHERE is_approved = TRUE AND deleted_at IS NULL;

-- rejected_at was set by migration 027 (if it ran) → 'rejected'
-- If the column doesn't exist yet this block is safely skipped
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shops' AND column_name = 'rejected_at'
  ) THEN
    UPDATE shops SET approval_status = 'rejected'
      WHERE rejected_at IS NOT NULL AND is_approved = FALSE AND deleted_at IS NULL;
  END IF;
END $$;

-- Everything else (is_approved=false, no rejected_at, not deleted) stays 'pending'
-- This is correct — we cannot retroactively distinguish old pending vs old rejected
-- without audit history. They go into the pending queue for admin to review.

-- ── 3. Add/normalise rejected_at column (migration 027 may or may not exist) ──
ALTER TABLE shops ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- ── 4. Indexes ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_shops_approval_status ON shops (approval_status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_shops_rejected_at ON shops (rejected_at)
  WHERE rejected_at IS NOT NULL;

-- ── 5. Update public RLS to include approval_status guard ────────────────
DROP POLICY IF EXISTS shops_select_public ON shops;
CREATE POLICY shops_select_public ON shops
  FOR SELECT USING (
    approval_status = 'approved'
    AND is_approved  = TRUE
    AND is_active    = TRUE
    AND deleted_at   IS NULL
  );

COMMIT;
