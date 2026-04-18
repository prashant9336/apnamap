-- =====================================================
-- 025_permanent_locality_model.sql
-- Permanent locality data model foundation.
--
-- Phase 1 (this migration): center-point + radius + neighbors + clean coords
-- Phase 2 (future):         PostGIS GEOGRAPHY polygon column populated
-- Phase 3 (future):         ST_Within queries replace center-point matching
--
-- Design principles:
--   1. Localities own their geography (center + radius + eventual polygon)
--   2. Shops own their exact location (lat/lng) — locality_id is display grouping
--   3. Neighbors enable cross-boundary discovery without polygon dependency
--   4. Server-side resolve_locality() is the canonical locality resolver
-- =====================================================

-- ── 1. Add permanent columns to localities ─────────────────────────

-- neighbors: adjacent localities by slug. Used for cross-boundary shop discovery.
-- When user is between Jhalwa and Mahewa, both localities' shops are surfaced.
ALTER TABLE localities ADD COLUMN IF NOT EXISTS neighbors TEXT[] NOT NULL DEFAULT '{}';

-- polygon_wkt: WKT representation of locality boundary (nullable until populated).
-- Phase 3: convert this to PostGIS GEOGRAPHY and enable ST_Within queries.
ALTER TABLE localities ADD COLUMN IF NOT EXISTS polygon_wkt TEXT;

-- is_active: soft-disable localities with no shops / unmapped areas.
ALTER TABLE localities ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- ── 2. Ensure shops table has correct columns ──────────────────────

-- lat/lng as DECIMAL (already exists) — canonical shop location.
-- locality_id is display grouping only, not a discovery gate.
-- Adding a comment to document this contract permanently.
COMMENT ON COLUMN shops.locality_id IS
  'Display grouping only. Shop visibility is determined by lat/lng distance, not this column.';

COMMENT ON COLUMN shops.lat IS 'Canonical shop latitude. Set during onboarding. Never derived from user GPS.';
COMMENT ON COLUMN shops.lng IS 'Canonical shop longitude. Set during onboarding. Never derived from user GPS.';

-- ── 3. Set neighbors for all Prayagraj localities ─────────────────
-- Neighbors are localities that share a practical boundary.
-- Used by the app to surface cross-boundary shops when user is at an edge.
DO $$
DECLARE city_uuid UUID;
BEGIN
  SELECT id INTO city_uuid FROM cities WHERE slug = 'prayagraj' LIMIT 1;
  IF city_uuid IS NULL THEN RETURN; END IF;

  UPDATE localities SET neighbors = ARRAY['allahpur','tagore-town','lohiya-nagar','ashok-nagar']
    WHERE city_id = city_uuid AND slug = 'civil-lines';

  UPDATE localities SET neighbors = ARRAY['civil-lines','katra','colonelganj','muthiganj','george-town']
    WHERE city_id = city_uuid AND slug = 'chowk';

  UPDATE localities SET neighbors = ARRAY['chowk','colonelganj','mumfordganj','khuldabad']
    WHERE city_id = city_uuid AND slug = 'katra';

  UPDATE localities SET neighbors = ARRAY['katra','chowk','muthiganj','mumfordganj','khuldabad']
    WHERE city_id = city_uuid AND slug = 'colonelganj';

  UPDATE localities SET neighbors = ARRAY['chowk','civil-lines','colonelganj','allahpur','lohiya-nagar']
    WHERE city_id = city_uuid AND slug = 'muthiganj';

  UPDATE localities SET neighbors = ARRAY['katra','colonelganj','rajapur','khuldabad']
    WHERE city_id = city_uuid AND slug = 'mumfordganj';

  UPDATE localities SET neighbors = ARRAY['civil-lines','muthiganj','allahpur','rajapur','teliyarganj']
    WHERE city_id = city_uuid AND slug = 'allahpur';

  UPDATE localities SET neighbors = ARRAY['allahpur','mumfordganj','teliyarganj','salori']
    WHERE city_id = city_uuid AND slug = 'rajapur';

  UPDATE localities SET neighbors = ARRAY['allahpur','rajapur','salori','rajrooppur']
    WHERE city_id = city_uuid AND slug = 'teliyarganj';

  UPDATE localities SET neighbors = ARRAY['teliyarganj','rajapur','rajrooppur']
    WHERE city_id = city_uuid AND slug = 'salori';

  UPDATE localities SET neighbors = ARRAY['salori','teliyarganj','mahewa']
    WHERE city_id = city_uuid AND slug = 'rajrooppur';

  UPDATE localities SET neighbors = ARRAY['rajrooppur','salori','jhalwa','naini']
    WHERE city_id = city_uuid AND slug = 'mahewa';

  UPDATE localities SET neighbors = ARRAY['mahewa','naini','rajrooppur']
    WHERE city_id = city_uuid AND slug = 'jhalwa';

  UPDATE localities SET neighbors = ARRAY['jhalwa','mahewa']
    WHERE city_id = city_uuid AND slug = 'naini';

  UPDATE localities SET neighbors = ARRAY['civil-lines','chowk','muthiganj','hastings-road','gauhar-bagh']
    WHERE city_id = city_uuid AND slug = 'george-town';

  UPDATE localities SET neighbors = ARRAY['civil-lines','allahpur','kidwai-nagar','shyam-nagar']
    WHERE city_id = city_uuid AND slug = 'tagore-town';

  UPDATE localities SET neighbors = ARRAY['civil-lines','chowk','muthiganj']
    WHERE city_id = city_uuid AND slug = 'lohiya-nagar';

  UPDATE localities SET neighbors = ARRAY['civil-lines','tagore-town','lohiya-nagar']
    WHERE city_id = city_uuid AND slug = 'ashok-nagar';

  UPDATE localities SET neighbors = ARRAY['rambagh','allahpur','rajapur','mumfordganj']
    WHERE city_id = city_uuid AND slug = 'lukerganj';

  UPDATE localities SET neighbors = ARRAY['allahpur','lukerganj','rajapur']
    WHERE city_id = city_uuid AND slug = 'rambagh';

  UPDATE localities SET neighbors = ARRAY['tagore-town','allahpur','lohiya-nagar']
    WHERE city_id = city_uuid AND slug = 'kidwai-nagar';

  UPDATE localities SET neighbors = ARRAY['tagore-town','kidwai-nagar']
    WHERE city_id = city_uuid AND slug = 'shyam-nagar';

END;
$$;

-- ── 4. Server-side locality resolver ──────────────────────────────
-- resolve_locality(lat, lng): canonical server-side locality detection.
-- Phase 1: center-point + radius + separation ratio (same logic as client).
-- Phase 2: replace with ST_Within(user_point, polygon) when polygons are populated.
--
-- Returns top 3 candidates with confidence so client can decide display label.
DROP FUNCTION IF EXISTS resolve_locality(FLOAT, FLOAT);
CREATE OR REPLACE FUNCTION resolve_locality(
  user_lat  FLOAT,
  user_lng  FLOAT
)
RETURNS TABLE (
  id          UUID,
  name        TEXT,
  slug        TEXT,
  lat         DECIMAL,
  lng         DECIMAL,
  radius_m    INT,
  neighbors   TEXT[],
  distance_m  FLOAT,
  confidence  TEXT   -- 'high' | 'medium' | 'low'
)
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  WITH ranked AS (
    SELECT
      l.id, l.name, l.slug, l.lat, l.lng,
      COALESCE(l.radius_m, 1500)  AS radius_m,
      COALESCE(l.neighbors, '{}') AS neighbors,
      calculate_distance_m(user_lat, user_lng, l.lat::FLOAT, l.lng::FLOAT) AS distance_m,
      ROW_NUMBER() OVER (
        ORDER BY calculate_distance_m(user_lat, user_lng, l.lat::FLOAT, l.lng::FLOAT)
      ) AS rn
    FROM localities l
    WHERE l.is_active = TRUE
  ),
  top2 AS (
    SELECT * FROM ranked WHERE rn <= 2
  )
  SELECT
    t1.id, t1.name, t1.slug, t1.lat, t1.lng, t1.radius_m, t1.neighbors,
    t1.distance_m,
    CASE
      WHEN t1.distance_m > 8000
        THEN 'low'
      WHEN t1.distance_m < t1.radius_m
        AND (t2.distance_m IS NULL OR t1.distance_m / t2.distance_m < 0.65)
        THEN 'high'
      ELSE 'medium'
    END AS confidence
  FROM top2 t1
  LEFT JOIN top2 t2 ON t2.rn = 2
  WHERE t1.rn = 1;
$$;

-- ── 5. Verify locality center coordinates ─────────────────────────
-- Final coordinate corrections based on ground truth.
DO $$
DECLARE city_uuid UUID;
BEGIN
  SELECT id INTO city_uuid FROM cities WHERE slug = 'prayagraj' LIMIT 1;
  IF city_uuid IS NULL THEN RETURN; END IF;

  -- Civil Lines: Collector Ganj / High Court area center
  UPDATE localities SET lat = 25.4484, lng = 81.8428, radius_m = 2500
    WHERE city_id = city_uuid AND slug = 'civil-lines';

  -- George Town: between Chowk and Phaphamau
  UPDATE localities SET lat = 25.4630, lng = 81.8410, radius_m = 1800
    WHERE city_id = city_uuid AND slug = 'george-town';

  -- Allahpur: south of Civil Lines, main market area
  UPDATE localities SET lat = 25.4390, lng = 81.8570, radius_m = 2000
    WHERE city_id = city_uuid AND slug = 'allahpur';

  -- Teliyarganj: true market center (corrected from near-default in 022)
  UPDATE localities SET lat = 25.4220, lng = 81.8494, radius_m = 1500
    WHERE city_id = city_uuid AND slug = 'teliyarganj';

  -- Jhalwa: main residential cluster, south Prayagraj
  UPDATE localities SET lat = 25.3968, lng = 81.8702, radius_m = 2500
    WHERE city_id = city_uuid AND slug = 'jhalwa';

  -- Naini: across Yamuna, main market
  UPDATE localities SET lat = 25.3930, lng = 81.9000, radius_m = 2500
    WHERE city_id = city_uuid AND slug = 'naini';

  -- Bamrauli: airport zone (wide, sparse)
  UPDATE localities SET lat = 25.4481, lng = 81.7327, radius_m = 3000
    WHERE city_id = city_uuid AND slug = 'bamrauli';

  -- Rambagh: correct center
  UPDATE localities SET lat = 25.4335, lng = 81.8590, radius_m = 1500
    WHERE city_id = city_uuid AND slug = 'rambagh';

  -- Priorities: ensure southern localities are findable in no-GPS fallback
  UPDATE localities SET priority = 10 WHERE city_id = city_uuid AND slug = 'jhalwa';
  UPDATE localities SET priority = 13 WHERE city_id = city_uuid AND slug = 'allahpur';
  UPDATE localities SET priority = 15 WHERE city_id = city_uuid AND slug = 'teliyarganj';
  UPDATE localities SET priority = 17 WHERE city_id = city_uuid AND slug = 'naini';
  UPDATE localities SET priority = 19 WHERE city_id = city_uuid AND slug = 'mahewa';

END;
$$;

-- ── 6. Index for fast distance queries ────────────────────────────
-- Phase 3 prep: when we add PostGIS GEOGRAPHY column, add GIST index here.
-- For now, index on lat/lng for bounding-box pre-filter in shops API.
CREATE INDEX IF NOT EXISTS idx_shops_lat_lng ON shops (lat, lng)
  WHERE is_active = TRUE AND is_approved = TRUE;

CREATE INDEX IF NOT EXISTS idx_localities_active ON localities (priority)
  WHERE is_active = TRUE;
