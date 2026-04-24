-- Migration 033: Performance indexes for admin dashboard and bulk operations
--
-- QUERIES BEING OPTIMISED:
--   1. Approval queue  — WHERE approval_status='pending' AND deleted_at IS NULL ORDER BY created_at ASC
--   2. No-offer shops  — JOIN offers ON shop_id WHERE is_active=true AND ends_at IS NULL OR ends_at > now()
--   3. Bulk operations — UPDATE shops WHERE id = ANY($1)  (already fast via PK; no extra index needed)
--   4. Analytics events by time + type — WHERE created_at >= $since ORDER BY created_at DESC
--   5. Analytics events by shop     — WHERE shop_id = $id AND created_at >= $since
--   6. Audit log recency            — ORDER BY created_at DESC LIMIT 25
--
-- EXISTING INDEXES (do NOT duplicate):
--   idx_shops_approval_status  (approval_status) WHERE deleted_at IS NULL  ← migration 028
--   idx_shops_approved         (is_approved, is_active)                    ← migration 001
--   idx_shops_deleted_at       (deleted_at) WHERE deleted_at IS NOT NULL   ← migration 026
--   (shops PK on id already covers UPDATE ... WHERE id = ANY(...))

BEGIN;

-- ── 1. Compound index for approval queue fetch ────────────────────────────
-- Covers: WHERE approval_status='pending' AND deleted_at IS NULL ORDER BY created_at ASC/DESC
-- The partial predicate on deleted_at IS NULL keeps index small (only live shops).

CREATE INDEX IF NOT EXISTS idx_shops_pending_queue
  ON shops (approval_status, created_at ASC)
  WHERE deleted_at IS NULL;

-- ── 2. Offers lookup by shop (no-offer detection join) ────────────────────
-- Covers: SELECT shop_id FROM offers WHERE is_active=true AND (ends_at IS NULL OR ends_at > now())
-- Used by analytics API to find approved shops with no active offer in one pass.

CREATE INDEX IF NOT EXISTS idx_offers_active_shop
  ON offers (shop_id, is_active, ends_at)
  WHERE is_active = true;

-- ── 3. Analytics events — time-range scan (primary analytics query) ───────
-- Covers: WHERE created_at >= $since ORDER BY created_at DESC LIMIT 20000
-- Without this index the query seqscans a potentially large table.

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
  ON analytics_events (created_at DESC);

-- ── 4. Analytics events — per-shop time-range (vendor analytics) ──────────
-- Covers: WHERE shop_id = ANY($ids) AND created_at >= $since
-- Also benefits admin per-shop drill-down queries.

CREATE INDEX IF NOT EXISTS idx_analytics_events_shop_time
  ON analytics_events (shop_id, created_at DESC);

-- ── 5. Analytics events — event_type filter ──────────────────────────────
-- Covers: WHERE event_type = 'view' (or 'locality_view') AND created_at >= $since
-- Partial index on most common types to keep size manageable.

CREATE INDEX IF NOT EXISTS idx_analytics_events_type_time
  ON analytics_events (event_type, created_at DESC);

-- ── 6. Audit log recency ──────────────────────────────────────────────────
-- Covers: ORDER BY created_at DESC LIMIT 25  (recent admin actions feed)

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs (created_at DESC);

-- ── Verification ─────────────────────────────────────────────────────────
-- Run EXPLAIN ANALYZE to confirm index use after applying:
--
-- EXPLAIN ANALYZE
-- SELECT id, name, created_at FROM shops
-- WHERE approval_status='pending' AND deleted_at IS NULL
-- ORDER BY created_at ASC LIMIT 50;
--
-- EXPLAIN ANALYZE
-- SELECT shop_id FROM offers
-- WHERE is_active=true AND (ends_at IS NULL OR ends_at > now());

COMMIT;
