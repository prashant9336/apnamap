-- ============================================================
-- 005_real_estate.sql
-- Adds price_label to shops for real estate listings.
-- Categories + subcategories for Real Estate & Property were
-- already seeded in 004_category_system.sql.
-- Safe to re-run.
-- ============================================================

-- Single new column — free-text price string so vendors can write
-- "₹10,800 / sq yd", "₹12,000 / month", "₹45 L", etc.
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS price_label TEXT;
