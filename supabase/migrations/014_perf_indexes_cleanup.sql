-- Migration 014: Performance indexes + auto-cleanup jobs
-- Run in Supabase SQL editor

-- ─── Composite indexes for shops (bounding-box + filter queries) ───────────
-- Used by /api/shops: WHERE is_active=TRUE AND is_approved=TRUE AND lat BETWEEN ... AND lng BETWEEN ...
CREATE INDEX IF NOT EXISTS idx_shops_active_approved_latng
  ON shops (is_active, is_approved, lat, lng)
  WHERE is_active = TRUE AND is_approved = TRUE;

-- Used by locality-scoped vendor queries
CREATE INDEX IF NOT EXISTS idx_shops_active_approved_locality
  ON shops (is_active, is_approved, locality_id);

-- ─── Offers: filter by active + expiry ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_offers_active_ends
  ON offers (is_active, ends_at, shop_id)
  WHERE is_active = TRUE;

-- ─── Analytics: basic lookup indexes (table was append-only with no indexes) ─
CREATE INDEX IF NOT EXISTS idx_analytics_shop_type
  ON analytics_events (shop_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_user
  ON analytics_events (user_id, created_at DESC);

-- ─── OTP sessions: cleanup expired + verified rows ─────────────────────────
-- Remove rows older than 1 hour (they're either expired or verified — no use keeping them)
CREATE OR REPLACE FUNCTION cleanup_otp_sessions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM otp_sessions
  WHERE expires_at < NOW() - INTERVAL '1 hour'
     OR (verified = TRUE AND created_at < NOW() - INTERVAL '10 minutes');
$$;

-- ─── Analytics retention: archive rows older than 90 days ──────────────────
CREATE OR REPLACE FUNCTION cleanup_analytics_events()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM analytics_events
  WHERE created_at < NOW() - INTERVAL '90 days';
$$;

-- ─── Scheduled cleanup via pg_cron (enable pg_cron extension first if not on) ─
-- Uncomment after running: CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- SELECT cron.schedule('cleanup-otp',       '*/15 * * * *', 'SELECT cleanup_otp_sessions()');
-- SELECT cron.schedule('cleanup-analytics', '0 3 * * *',    'SELECT cleanup_analytics_events()');
--
-- To verify schedules: SELECT * FROM cron.job;
-- To remove:           SELECT cron.unschedule('cleanup-otp');
