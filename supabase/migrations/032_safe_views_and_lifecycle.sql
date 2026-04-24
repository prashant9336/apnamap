-- Migration 032: Safe views + shop lifecycle consistency
--
-- PROBLEMS FIXED:
--   1. Deleted shops retained approval_status='approved' — they could still
--      satisfy the offers_select_public RLS check on approval_status alone.
--      Backfill: every shop with deleted_at IS NOT NULL → approval_status='rejected'.
--
--   2. No single source-of-truth for "is this shop publicly visible?"
--      Two views codify the definition so API code, sitemap, and future
--      queries can't accidentally omit a condition.
--
-- VIEWS CREATED:
--   public_active_shops  — shops visible to the public (approved + active + not deleted)
--   public_active_offers — offers whose shop is publicly visible + offer itself is live
--
-- USAGE:
--   SELECT * FROM public_active_shops WHERE locality_id = '...';
--   SELECT * FROM public_active_offers WHERE shop_id = '...';
--
--   Service-role (admin) code can query these views to get the same guarantee
--   without repeating the filter conditions.

BEGIN;

-- ── 1. Backfill: deleted shops must have approval_status='rejected' ────────
-- Root cause: the soft-delete UPDATE in the API never set approval_status.
-- Shops that were approved before deletion kept approval_status='approved',
-- meaning a hypothetical direct-query could have returned their offers.
-- The RLS on offers already guards against this (checks deleted_at IS NULL),
-- but the data model is now inconsistent.  Fix it once, keep it consistent.

UPDATE shops
SET    approval_status = 'rejected',
       updated_at      = NOW()
WHERE  deleted_at IS NOT NULL
  AND  approval_status != 'rejected';

-- ── 2. public_active_shops view ──────────────────────────────────────────
-- Single source of truth: a shop is "public" iff ALL three conditions hold.
-- Never query the raw shops table for public data — use this view instead.

DROP VIEW IF EXISTS public_active_shops;
CREATE VIEW public_active_shops AS
SELECT
  id, name, slug, description,
  phone, whatsapp, address,
  lat, lng, logo_url, cover_url,
  is_featured, is_boosted, is_recommended, is_hidden_gem, is_trending,
  manual_priority,
  avg_rating, review_count, view_count,
  open_time, close_time, open_days,
  approval_status,
  vendor_id, category_id, subcategory_id, locality_id,
  updated_at, created_at
FROM shops
WHERE approval_status = 'approved'
  AND is_approved     = true
  AND is_active       = true
  AND deleted_at      IS NULL;

-- ── 3. public_active_offers view ─────────────────────────────────────────
-- Offers are only public if the parent shop is public AND the offer is live.

DROP VIEW IF EXISTS public_active_offers;
CREATE VIEW public_active_offers AS
SELECT
  o.id, o.shop_id, o.title, o.description,
  o.discount_type, o.discount_value, o.coupon_code,
  o.tier, o.is_active, o.is_featured, o.is_flash,
  o.starts_at, o.ends_at,
  o.view_count, o.click_count,
  o.source_type,
  o.created_at, o.updated_at
FROM offers o
INNER JOIN shops s ON s.id = o.shop_id
WHERE o.is_active   = true
  AND (o.ends_at IS NULL OR o.ends_at > NOW())
  AND s.approval_status = 'approved'
  AND s.is_approved     = true
  AND s.is_active       = true
  AND s.deleted_at      IS NULL;

-- ── 4. Grant SELECT on views to API roles ────────────────────────────────
-- anon       = unauthenticated public users (via createClient() / PostgREST)
-- authenticated = logged-in users (vendors, etc.)
-- service_role already has full access so no grant needed.

GRANT SELECT ON public_active_shops  TO anon, authenticated;
GRANT SELECT ON public_active_offers TO anon, authenticated;

-- ── 5. Verification queries (run after applying) ─────────────────────────
-- Expected: 0 rows (no deleted shop should have approval_status != 'rejected')
-- SELECT COUNT(*) FROM shops WHERE deleted_at IS NOT NULL AND approval_status != 'rejected';
--
-- Expected: all rows have approval_status='approved', is_active=true, deleted_at IS NULL
-- SELECT approval_status, is_active, deleted_at IS NULL AS not_deleted
-- FROM public_active_shops LIMIT 5;
--
-- Expected: all offer rows have shops that are approved, active, not deleted
-- SELECT o.id, s.approval_status, s.is_active, s.deleted_at
-- FROM public_active_offers o
-- JOIN shops s ON s.id = o.shop_id LIMIT 5;

COMMIT;
