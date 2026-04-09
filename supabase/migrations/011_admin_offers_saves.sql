-- =====================================================
-- 011_admin_offers_saves.sql
-- Admin offer control + improved favorites/saves
-- Safe to re-run
-- =====================================================

-- 1. Extend favorites with locality_id
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS locality_id UUID REFERENCES localities(id) ON DELETE CASCADE;

-- 2. Unique constraints on favorites (prevent duplicate saves)
ALTER TABLE favorites
  DROP CONSTRAINT IF EXISTS favorites_unique_shop,
  DROP CONSTRAINT IF EXISTS favorites_unique_offer,
  DROP CONSTRAINT IF EXISTS favorites_unique_locality;

CREATE UNIQUE INDEX IF NOT EXISTS favorites_unique_shop
  ON favorites (user_id, shop_id) WHERE shop_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS favorites_unique_offer
  ON favorites (user_id, offer_id) WHERE offer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS favorites_unique_locality
  ON favorites (user_id, locality_id) WHERE locality_id IS NOT NULL;

-- 3. Extend offers with source tracking
ALTER TABLE offers ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'vendor'
  CHECK (source_type IN ('vendor','admin_manual','whatsapp_manual'));
ALTER TABLE offers ADD COLUMN IF NOT EXISTS created_by_admin UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 4. RLS: admin full access to offers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'offers' AND policyname = 'offers_admin'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "offers_admin" ON offers
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    $pol$;
  END IF;
END;
$$;

-- 5. Index for favorites locality lookup
CREATE INDEX IF NOT EXISTS idx_favorites_locality ON favorites(user_id, locality_id) WHERE locality_id IS NOT NULL;

-- 6. Index for offer admin queries (source_type)
CREATE INDEX IF NOT EXISTS idx_offers_source ON offers(source_type);
CREATE INDEX IF NOT EXISTS idx_offers_shop_active ON offers(shop_id, is_active, ends_at);
