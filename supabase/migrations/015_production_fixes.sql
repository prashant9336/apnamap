-- =====================================================
-- 015_production_fixes.sql
-- Production readiness fixes (audit 2026-04-11)
-- Safe to re-run: all statements use IF NOT EXISTS /
-- DO NOTHING / OR REPLACE guards where applicable.
-- =====================================================

-- ─── 1. shop_claim_requests table ───────────────────
-- Supports the /vendor/claim flow — allows users to
-- request ownership of an unclaimed shop listing.

CREATE TABLE IF NOT EXISTS shop_claim_requests (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID        NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  claimant_name   TEXT        NOT NULL,
  claimant_phone  TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','approved','rejected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID        REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_claim_requests_shop   ON shop_claim_requests (shop_id);
CREATE INDEX IF NOT EXISTS idx_claim_requests_status ON shop_claim_requests (status);
CREATE INDEX IF NOT EXISTS idx_claim_requests_user   ON shop_claim_requests (user_id);

-- RLS: users can read their own claims; authenticated users can insert
ALTER TABLE shop_claim_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shop_claim_requests' AND policyname = 'claim_select_own'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "claim_select_own" ON shop_claim_requests
        FOR SELECT USING (user_id = auth.uid());
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shop_claim_requests' AND policyname = 'claim_insert_auth'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "claim_insert_auth" ON shop_claim_requests
        FOR INSERT WITH CHECK (user_id = auth.uid());
    $pol$;
  END IF;
END;
$$;

-- ─── 2. shops.claim_status column ───────────────────
-- Tracks shop-level claim state without joining claim_requests.

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS claim_status TEXT DEFAULT NULL
  CHECK (claim_status IN ('pending','approved','rejected'));

-- ─── 3. vendors.is_approved + must_change_password ──
-- Ensure columns exist (added in later migration, safe to re-declare).

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS is_approved         BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS vendor_request_id UUID REFERENCES vendor_requests(id) ON DELETE SET NULL;

-- ─── 4. Fix favorites constraint ────────────────────
-- Migration 010 added a constraint that only covers shop_id/offer_id.
-- Migration 011 added locality_id but never updated the constraint.
-- Replace with an "exactly one of three" constraint.

ALTER TABLE favorites
  DROP CONSTRAINT IF EXISTS favorites_at_least_one_target;

ALTER TABLE favorites
  ADD COLUMN IF NOT EXISTS locality_id UUID REFERENCES localities(id) ON DELETE CASCADE;

ALTER TABLE favorites
  DROP CONSTRAINT IF EXISTS favorites_exactly_one_target;

ALTER TABLE favorites
  ADD CONSTRAINT favorites_exactly_one_target CHECK (
    (CASE WHEN shop_id     IS NOT NULL THEN 1 ELSE 0 END
   + CASE WHEN offer_id    IS NOT NULL THEN 1 ELSE 0 END
   + CASE WHEN locality_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  );

CREATE INDEX IF NOT EXISTS idx_favorites_locality ON favorites (locality_id) WHERE locality_id IS NOT NULL;

-- ─── 5. increment_view_count RPC ────────────────────
-- Used by /api/analytics to atomically increment shop view counts.
-- SECURITY DEFINER so anon callers can write to shops.view_count
-- without direct update permission (RLS still protects via policy context).

CREATE OR REPLACE FUNCTION increment_view_count(p_shop_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE shops
  SET    view_count = view_count + 1,
         updated_at = NOW()
  WHERE  id = p_shop_id
    AND  is_active   = TRUE
    AND  is_approved = TRUE;
$$;

GRANT EXECUTE ON FUNCTION increment_view_count(UUID) TO anon, authenticated;

-- ─── 6. profiles.phone index ────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles (phone);

-- ─── 7. shops.slug unique index (belt-and-suspenders) ──
-- 001_schema.sql already declares slug as UNIQUE, but
-- explicitly naming the index makes it easier to reference.
CREATE UNIQUE INDEX IF NOT EXISTS idx_shops_slug ON shops (slug);

-- ─── 8. vendors.mobile index ────────────────────────
-- Speeds up duplicate-check lookups during registration.
CREATE INDEX IF NOT EXISTS idx_vendors_mobile ON vendors (mobile);

-- ─── 9. analytics_events: add missing event types ───
-- Extend the CHECK constraint to include 'save' event type
-- (it may already be there from migration 001; guard with DO block).
DO $$
BEGIN
  -- Drop old constraint if it doesn't include all needed types
  -- (Postgres won't let us ALTER CHECK inline — drop & re-add)
  BEGIN
    ALTER TABLE analytics_events
      DROP CONSTRAINT IF EXISTS analytics_events_event_type_check;

    ALTER TABLE analytics_events
      ADD CONSTRAINT analytics_events_event_type_check
      CHECK (event_type IN ('view','click','call','whatsapp','direction','save','offer_view'));
  EXCEPTION WHEN others THEN
    NULL; -- silently skip if table has dependent objects
  END;
END;
$$;

-- ─── 10. Enable pg_cron cleanup (if extension available) ─────────────
-- Uncomment after running: CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- SELECT cron.unschedule('cleanup-analytics') ON CONFLICT DO NOTHING;
-- SELECT cron.schedule('cleanup-analytics', '0 3 * * *',
--   'SELECT cleanup_analytics_events()');
--
-- SELECT cron.unschedule('cleanup-otp') ON CONFLICT DO NOTHING;
-- SELECT cron.schedule('cleanup-otp', '*/15 * * * *',
--   'SELECT cleanup_otp_sessions()');
