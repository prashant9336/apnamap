-- Migration 029: Analytics vendor-read RLS + tighten offer/shop public policies
-- All statements are idempotent.

BEGIN;

-- ── 1. analytics_events: allow vendors to read events for their own shops ──
-- Previously the only policy was INSERT (anyone), so vendor dashboards
-- always returned 0 stats even when using a user-session Supabase client.
-- The API route (/api/vendor GET) now uses createAdminClient for analytics
-- (bypasses RLS), but VendorHome's browser-side direct query still needs this.
DROP POLICY IF EXISTS analytics_select_vendor ON analytics_events;
CREATE POLICY analytics_select_vendor ON analytics_events
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM shops
      WHERE  shops.id        = analytics_events.shop_id
        AND  shops.vendor_id = auth.uid()
    )
  );

-- Admins can read everything
DROP POLICY IF EXISTS analytics_admin_select ON analytics_events;
CREATE POLICY analytics_admin_select ON analytics_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 2. offers_select_public: add approval_status guard ──────────────────────
-- is_approved and approval_status are kept in sync, but belt-and-suspenders.
DROP POLICY IF EXISTS offers_select_public ON offers;
CREATE POLICY offers_select_public ON offers
  FOR SELECT USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM shops
      WHERE  shops.id              = offers.shop_id
        AND  shops.is_approved     = TRUE
        AND  shops.approval_status = 'approved'
        AND  shops.is_active       = TRUE
        AND  shops.deleted_at      IS NULL
    )
  );

COMMIT;
