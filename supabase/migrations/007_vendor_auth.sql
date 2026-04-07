-- =====================================================
-- 007_vendor_auth.sql
-- Vendor request + approval + password-based login
-- Run in Supabase SQL Editor
-- =====================================================

-- 1. vendor_requests: stores pre-auth vendor onboarding requests
CREATE TABLE IF NOT EXISTS vendor_requests (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  mobile           TEXT        NOT NULL,
  shop_name        TEXT        NOT NULL,
  locality_id      UUID        REFERENCES localities(id),
  locality_raw     TEXT,
  category_id      UUID        REFERENCES categories(id),
  request_type     TEXT        NOT NULL DEFAULT 'new_shop'
                               CHECK (request_type IN ('new_shop','claim_existing')),
  shop_id          UUID        REFERENCES shops(id),
  note             TEXT,
  proof_image_url  TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','approved','rejected','activated')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      UUID        REFERENCES profiles(id),
  review_note      TEXT
);

CREATE INDEX IF NOT EXISTS idx_vendor_requests_mobile ON vendor_requests(mobile);
CREATE INDEX IF NOT EXISTS idx_vendor_requests_status ON vendor_requests(status);

-- RLS
ALTER TABLE vendor_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit (no auth required for vendor join form)
CREATE POLICY "vr_public_insert" ON vendor_requests
  FOR INSERT WITH CHECK (TRUE);

-- Only admins can read requests via client
CREATE POLICY "vr_admin_select" ON vendor_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Only admins can update (approve/reject)
CREATE POLICY "vr_admin_update" ON vendor_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. Extend vendors table with approval + mobile tracking
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS mobile               TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_approved          BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS vendor_request_id    UUID    REFERENCES vendor_requests(id);

-- 3. Add is_claimed to shops (track shop claim status separately from vendor_id)
ALTER TABLE shops ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN NOT NULL DEFAULT FALSE;
