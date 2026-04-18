-- Migration 021: Real streak rewards
-- Adds streak_goal to localities and real reward fields to user_locality_streaks.
-- Safe to run multiple times (IF NOT EXISTS / IF EXISTS guards throughout).

-- 1. Per-locality streak goal (default 3 days)
ALTER TABLE localities
  ADD COLUMN IF NOT EXISTS streak_goal INTEGER NOT NULL DEFAULT 3;

-- 2. Real reward fields on streaks
ALTER TABLE user_locality_streaks
  ADD COLUMN IF NOT EXISTS reward_offer_id    UUID REFERENCES offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reward_unlocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reward_expires_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reward_redeemed_at TIMESTAMPTZ;

-- 3. Index for admin reward queries (unlocked, unredeemed)
CREATE INDEX IF NOT EXISTS idx_streaks_reward
  ON user_locality_streaks(reward_offer_id)
  WHERE reward_offer_id IS NOT NULL;

-- 4. Admin can read all streaks (service role bypasses RLS, but add explicit policy
--    so the admin client's anon key + role claim also works if needed in future)
--    Existing policy: "streaks_user_all" FOR ALL USING (auth.uid() = user_id)
--    We rely on service-role (createAdminClient) which bypasses RLS entirely.
--    No extra policy needed.

-- 5. Deprecate reward_code: keep column for backward compat, stop writing to it.
--    (Column remains nullable TEXT — no DROP to avoid breaking old clients.)
