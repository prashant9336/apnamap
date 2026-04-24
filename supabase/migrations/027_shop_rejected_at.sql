-- Track when a shop was explicitly rejected by admin (NULL = pending/approved, NOT NULL = rejected)
ALTER TABLE shops ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- Index for filtering pending vs rejected in admin queries
CREATE INDEX IF NOT EXISTS idx_shops_rejected_at ON shops (rejected_at) WHERE rejected_at IS NOT NULL;
