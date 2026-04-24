-- Migration 026: Admin Panel Upgrade
-- Adds soft-delete, profile status, category management, audit logs,
-- anonymous visitor tracking, and updates RLS to respect deleted_at.
-- All DDL is idempotent (IF NOT EXISTS / DO $$ blocks).

BEGIN;

-- ── 1. shops: soft-delete columns ───────────────────────────────────────
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS deleted_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delete_reason TEXT;

-- ── 2. profiles: account status ─────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE profiles
      ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_status_check
      CHECK (status IN ('active', 'suspended', 'deleted'));
  END IF;
END $$;

-- ── 3. categories: active flag + merge pointer ──────────────────────────
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS merged_into_id UUID    REFERENCES categories(id) ON DELETE SET NULL;

-- ── 4. analytics_events: visitor_id + expanded event types ─────────────
ALTER TABLE analytics_events
  ADD COLUMN IF NOT EXISTS visitor_id TEXT;

-- Drop existing event_type constraint (name follows Postgres convention)
ALTER TABLE analytics_events
  DROP CONSTRAINT IF EXISTS analytics_events_event_type_check;

ALTER TABLE analytics_events
  ADD CONSTRAINT analytics_events_event_type_check
  CHECK (event_type IN (
    'view', 'click', 'call', 'whatsapp', 'direction', 'save', 'offer_view',
    'app_open', 'locality_view', 'shop_view', 'search', 'share'
  ));

-- ── 5. audit_logs table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  action      TEXT        NOT NULL,
  entity_type TEXT        NOT NULL,
  entity_id   UUID,
  before_val  JSONB       NOT NULL DEFAULT '{}',
  after_val   JSONB       NOT NULL DEFAULT '{}',
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 6. Indexes ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_shops_deleted_at    ON shops          (deleted_at)          WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_status     ON profiles       (status)              WHERE status != 'active';
CREATE INDEX IF NOT EXISTS idx_analytics_visitor   ON analytics_events (visitor_id)        WHERE visitor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin    ON audit_logs     (admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity   ON audit_logs     (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created  ON audit_logs     (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_categories_inactive ON categories     (is_active)           WHERE is_active = FALSE;

-- ── 7. Update public shop RLS: exclude soft-deleted shops ────────────────
-- Recreate the SELECT policy to also exclude deleted_at IS NOT NULL shops.
-- The admin ALL policy already bypasses this via service role key.
DROP POLICY IF EXISTS shops_select_public ON shops;
CREATE POLICY shops_select_public ON shops
  FOR SELECT USING (
    is_approved = TRUE
    AND is_active = TRUE
    AND deleted_at IS NULL
  );

-- ── 8. RLS for audit_logs (admin-only read/write) ───────────────────────
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_admin_all ON audit_logs;
CREATE POLICY audit_logs_admin_all ON audit_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id  = auth.uid()
        AND profiles.role = 'admin'
    )
  );

COMMIT;
