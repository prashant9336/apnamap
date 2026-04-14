-- Migration 018: Auto-offer tracking fields
-- Run this in Supabase SQL Editor BEFORE deploying the auto-offer feature.

-- 1. Extend source_type CHECK to include 'auto_generated'
--    (drops and recreates the constraint — safe on Postgres)
ALTER TABLE offers
  DROP CONSTRAINT IF EXISTS offers_source_type_check;

ALTER TABLE offers
  ADD CONSTRAINT offers_source_type_check
  CHECK (source_type IN ('vendor', 'admin_manual', 'whatsapp_manual', 'auto_generated'));

-- 2. Add raw_input_text — stores what the vendor/admin originally typed
--    before the system cleaned or replaced it. Null for clean manual inputs.
ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS raw_input_text TEXT DEFAULT NULL;

-- 3. Index to quickly find auto-generated offers that admins may want to replace
CREATE INDEX IF NOT EXISTS idx_offers_auto_generated
  ON offers(source_type)
  WHERE source_type = 'auto_generated';
