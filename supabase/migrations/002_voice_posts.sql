-- ============================================================
-- Migration 002 — quick_posts + voice_post_drafts
-- Run this once against your Supabase project SQL editor.
-- Safe to run: uses IF NOT EXISTS on all CREATE statements.
-- ============================================================

-- ── quick_posts ───────────────────────────────────────────────────
-- Stores real-time vendor broadcast messages (flash deals, stock updates, etc.)
-- Referenced in code since v1 but table was never formally migrated.

CREATE TABLE IF NOT EXISTS quick_posts (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id     UUID        NOT NULL REFERENCES shops(id)    ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_type   TEXT        NOT NULL DEFAULT 'custom_note',
  message     TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quick_posts_shop_id_idx
  ON quick_posts (shop_id, created_at DESC);

ALTER TABLE quick_posts ENABLE ROW LEVEL SECURITY;

-- Vendor can do anything with their own shop's quick posts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quick_posts' AND policyname = 'Vendors manage own quick_posts'
  ) THEN
    CREATE POLICY "Vendors manage own quick_posts"
      ON quick_posts FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM shops s
          WHERE s.id = quick_posts.shop_id
            AND s.vendor_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Customers can read active, non-expired posts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quick_posts' AND policyname = 'Customers view active quick_posts'
  ) THEN
    CREATE POLICY "Customers view active quick_posts"
      ON quick_posts FOR SELECT
      USING (
        is_active = true
        AND (expires_at IS NULL OR expires_at > now())
      );
  END IF;
END $$;


-- ── voice_post_drafts ─────────────────────────────────────────────
-- Stores AI-structured post drafts generated from vendor voice recordings.

CREATE TABLE IF NOT EXISTS voice_post_drafts (
  id                  UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id             UUID        NOT NULL REFERENCES shops(id)    ON DELETE CASCADE,
  vendor_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_type         TEXT        NOT NULL DEFAULT 'voice'
                        CHECK (source_type IN ('voice', 'manual')),
  raw_transcript      TEXT,
  cleaned_transcript  TEXT,
  title               TEXT        NOT NULL DEFAULT '',
  description         TEXT        NOT NULL DEFAULT '',
  deal_type           TEXT        NOT NULL DEFAULT 'regular_offer'
                        CHECK (deal_type IN (
                          'flash_deal', 'big_deal', 'combo_offer', 'new_arrival',
                          'festive_offer', 'limited_stock', 'clearance', 'regular_offer'
                        )),
  offer_value_text    TEXT,
  validity_text       TEXT,
  valid_until         TIMESTAMPTZ,
  locality_text       TEXT,
  is_published        BOOLEAN     NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS voice_post_drafts_vendor_idx
  ON voice_post_drafts (vendor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS voice_post_drafts_shop_idx
  ON voice_post_drafts (shop_id, is_published, created_at DESC);

ALTER TABLE voice_post_drafts ENABLE ROW LEVEL SECURITY;

-- Vendors manage their own drafts only
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'voice_post_drafts' AND policyname = 'Vendors manage own voice_post_drafts'
  ) THEN
    CREATE POLICY "Vendors manage own voice_post_drafts"
      ON voice_post_drafts FOR ALL
      USING (vendor_id = auth.uid());
  END IF;
END $$;

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_voice_post_draft_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_voice_post_drafts_updated_at ON voice_post_drafts;
CREATE TRIGGER trg_voice_post_drafts_updated_at
  BEFORE UPDATE ON voice_post_drafts
  FOR EACH ROW EXECUTE FUNCTION update_voice_post_draft_updated_at();
