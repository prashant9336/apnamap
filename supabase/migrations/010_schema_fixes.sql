-- =====================================================
-- 010_schema_fixes.sql
-- Production-readiness fixes
-- Safe to re-run (IF NOT EXISTS / DO NOTHING guards)
-- =====================================================

-- 1. FK: profiles.city_id → cities(id)
--    profiles was created in 001 without this constraint
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_city_id_fkey;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_city_id_fkey
  FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE SET NULL;

-- 2. favorites: ensure at least one of shop_id/offer_id is not NULL
ALTER TABLE favorites
  DROP CONSTRAINT IF EXISTS favorites_at_least_one_target;
ALTER TABLE favorites
  ADD CONSTRAINT favorites_at_least_one_target
  CHECK (shop_id IS NOT NULL OR offer_id IS NOT NULL);

-- 3. vendors: unique mobile to prevent duplicate accounts
--    Normalize existing data first (strip +91 prefix if present)
UPDATE vendors SET mobile = REGEXP_REPLACE(mobile, '^\+91', '') WHERE mobile LIKE '+91%';

-- Remove duplicate vendor rows, keeping the newest one per mobile
DELETE FROM vendors
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY mobile ORDER BY created_at DESC) AS rn
    FROM vendors
    WHERE mobile IS NOT NULL
  ) ranked
  WHERE rn > 1
);

ALTER TABLE vendors
  DROP CONSTRAINT IF EXISTS vendors_mobile_unique;
ALTER TABLE vendors
  ADD CONSTRAINT vendors_mobile_unique UNIQUE (mobile);

-- 4. Grant execute on nearby_localities to anon + authenticated roles
--    (Migration 009 creates the function but may not grant access)
GRANT EXECUTE ON FUNCTION nearby_localities(FLOAT, FLOAT, INT) TO anon, authenticated;

-- 5. RLS: allow vendors to read their own vendor_request
--    (API routes use admin client and bypass RLS, but this makes
--     the table introspectable from client-side for status checks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendor_requests' AND policyname = 'vr_vendor_select_own'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "vr_vendor_select_own" ON vendor_requests
        FOR SELECT USING (
          mobile = (
            SELECT REGEXP_REPLACE(phone, '^\+91', '')
            FROM profiles WHERE id = auth.uid()
          )
        )
    $pol$;
  END IF;
END;
$$;
