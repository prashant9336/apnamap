-- Migration 019: Sales / Onboarding Agent role
-- Run in Supabase SQL Editor BEFORE deploying the sales dashboard.

-- 1. Extend profiles.role CHECK to include 'sales'
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('customer', 'vendor', 'admin', 'sales'));

-- 2. Add created_by and created_by_role to shops
--    Tracks which salesman (or admin) onboarded this shop.
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS created_by      UUID    DEFAULT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_role TEXT    DEFAULT NULL;

-- 3. Index so salesmen can quickly query their own onboarded shops
CREATE INDEX IF NOT EXISTS idx_shops_created_by
  ON shops(created_by)
  WHERE created_by IS NOT NULL;

-- 4. Salesmen create unclaimed shops (vendor_id = null).
--    Make vendor_id nullable if not already (it should be, but be safe).
ALTER TABLE shops
  ALTER COLUMN vendor_id DROP NOT NULL;
