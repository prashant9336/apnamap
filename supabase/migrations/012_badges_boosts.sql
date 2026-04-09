-- =====================================================
-- 012_badges_boosts.sql
-- Admin badge controls + shop/offer boosting
-- Safe to re-run
-- =====================================================

-- ── SHOPS ────────────────────────────────────────────────────────────

-- Admin-controlled badge overrides
ALTER TABLE shops ADD COLUMN IF NOT EXISTS is_boosted          BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS is_recommended      BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS is_hidden_gem       BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS is_trending         BOOLEAN NOT NULL DEFAULT FALSE;
-- Boost rank: higher value = appears first within locality (default 0 = no boost)
ALTER TABLE shops ADD COLUMN IF NOT EXISTS manual_priority     INTEGER NOT NULL DEFAULT 0;
-- Admin-controlled rating display (null = use computed avg_rating / review_count)
ALTER TABLE shops ADD COLUMN IF NOT EXISTS display_rating      DECIMAL(3,2);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS display_rating_count INTEGER;

-- ── OFFERS ───────────────────────────────────────────────────────────

-- Admin badge overrides for offers
ALTER TABLE offers ADD COLUMN IF NOT EXISTS is_flash           BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS is_big_deal        BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS is_recommended     BOOLEAN NOT NULL DEFAULT FALSE;
-- Boost rank within shop: higher = shown first (default 0)
ALTER TABLE offers ADD COLUMN IF NOT EXISTS manual_priority    INTEGER NOT NULL DEFAULT 0;
-- Free-form badge text override (e.g. "Staff Pick", "Today Only")
ALTER TABLE offers ADD COLUMN IF NOT EXISTS badge_override     TEXT;
-- Override trending classification
ALTER TABLE offers ADD COLUMN IF NOT EXISTS trending_override  BOOLEAN NOT NULL DEFAULT FALSE;

-- ── INDEXES ──────────────────────────────────────────────────────────

-- For boosted/featured shop queries
CREATE INDEX IF NOT EXISTS idx_shops_boosted       ON shops(is_boosted)     WHERE is_boosted = TRUE;
CREATE INDEX IF NOT EXISTS idx_shops_priority      ON shops(manual_priority) WHERE manual_priority > 0;
CREATE INDEX IF NOT EXISTS idx_shops_trending      ON shops(is_trending)    WHERE is_trending = TRUE;
CREATE INDEX IF NOT EXISTS idx_shops_recommended   ON shops(is_recommended) WHERE is_recommended = TRUE;

-- For offer priority queries
CREATE INDEX IF NOT EXISTS idx_offers_flash        ON offers(is_flash)       WHERE is_flash = TRUE;
CREATE INDEX IF NOT EXISTS idx_offers_big_deal     ON offers(is_big_deal)    WHERE is_big_deal = TRUE;
CREATE INDEX IF NOT EXISTS idx_offers_priority     ON offers(manual_priority) WHERE manual_priority > 0;
