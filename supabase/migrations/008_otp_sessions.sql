-- =====================================================
-- 008_otp_sessions.sql
-- Custom OTP system (works with any SMS/WhatsApp provider)
-- =====================================================

CREATE TABLE IF NOT EXISTS otp_sessions (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  mobile      TEXT        NOT NULL,
  otp_hash    TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  verified    BOOLEAN     NOT NULL DEFAULT FALSE,
  attempts    INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_mobile ON otp_sessions(mobile, expires_at);

-- All operations go through service-role API routes — no public access needed
ALTER TABLE otp_sessions ENABLE ROW LEVEL SECURITY;
