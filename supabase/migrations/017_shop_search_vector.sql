-- Migration 017: Full-text search vector for shops
-- Run this in Supabase SQL Editor when ready to upgrade from ilike to tsvector.
-- ilike in /api/search/route.ts already works without this — this just adds speed
-- and relevance ranking for larger datasets (500+ shops).

-- 1. Add a generated tsvector column (maintained automatically by Postgres)
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')),        'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(address, '')),     'C')
  ) STORED;

-- 2. GIN index — fast for tsvector @@ to_tsquery lookups
CREATE INDEX IF NOT EXISTS idx_shops_search_vector
  ON shops USING gin(search_vector);

-- 3. Similar index for offers (title + description)
ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')),       'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_offers_search_vector
  ON offers USING gin(search_vector);

-- After running this migration, update /api/search/route.ts to use:
--   .textSearch('search_vector', query, { type: 'websearch', config: 'english' })
-- instead of .or(`name.ilike...`) for better relevance and performance.
