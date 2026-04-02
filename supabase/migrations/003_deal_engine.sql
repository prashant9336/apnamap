-- ============================================================
-- Migration 003 — Deal Engine
-- Adds: is_mystery column on offers, increment_offer_counter RPC
-- Safe to run multiple times (idempotent).
-- ============================================================

-- ── is_mystery flag ───────────────────────────────────────────────
-- Vendors / admin can mark a deal as hidden ("Mystery Deal").
-- The engine surfaces it as a locked teaser; full details unlock
-- after the user interacts or walks past a distance threshold.

ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS is_mystery BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS offers_is_mystery_idx
  ON offers (is_mystery)
  WHERE is_mystery = true;

-- ── increment_offer_counter RPC ───────────────────────────────────
-- Called by /api/deals/track — uses a single SQL UPDATE to avoid
-- read-modify-write races under concurrent requests.

CREATE OR REPLACE FUNCTION increment_offer_counter(
  p_offer_id UUID,
  p_event    TEXT    -- 'view' | 'click'
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE offers
  SET
    view_count  = CASE WHEN p_event = 'view'  THEN view_count  + 1 ELSE view_count  END,
    click_count = CASE WHEN p_event = 'click' THEN click_count + 1 ELSE click_count END,
    updated_at  = now()
  WHERE id = p_offer_id
    AND is_active = true;
$$;

-- Grant execute to the anon + authenticated roles used by Supabase clients
GRANT EXECUTE ON FUNCTION increment_offer_counter(UUID, TEXT)
  TO anon, authenticated;
