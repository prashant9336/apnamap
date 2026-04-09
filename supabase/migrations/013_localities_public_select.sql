-- Migration 013: Add public SELECT policies for localities + cities
-- Without these, anon/authenticated reads return empty (RLS enabled but no policy)
-- which breaks WalkView (LocalityIndicator never shows, no shop sections render)

-- ── localities: public read ────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'localities' AND policyname = 'localities_select_public'
  ) THEN
    CREATE POLICY "localities_select_public"
      ON localities FOR SELECT
      USING (TRUE);
  END IF;
END;
$$;

-- ── cities: public read (used in locality → city join) ────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'cities' AND policyname = 'cities_select_public'
  ) THEN
    CREATE POLICY "cities_select_public"
      ON cities FOR SELECT
      USING (TRUE);
  END IF;
END;
$$;

-- ── categories: public read (used in shop card icons) ────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'categories' AND policyname = 'categories_select_public'
  ) THEN
    CREATE POLICY "categories_select_public"
      ON categories FOR SELECT
      USING (TRUE);
  END IF;
END;
$$;
