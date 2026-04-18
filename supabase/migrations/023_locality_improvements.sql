-- =====================================================
-- 023_locality_improvements.sql
-- Product-level locality system improvements:
--   1. Add radius_m column — how large each locality is
--   2. Add missing Prayagraj localities
--   3. Correct remaining center-point issues
--   4. Set per-locality radii for confidence matching
-- =====================================================

-- 1. Add radius_m (how large the locality is in metres)
--    Used by client-side confidence engine:
--      distance < radius_m  → user is "inside" this locality
--      distance >= radius_m → user is "near" this locality
ALTER TABLE localities ADD COLUMN IF NOT EXISTS radius_m INTEGER NOT NULL DEFAULT 1500;

-- 2. Add missing Prayagraj localities
DO $$
DECLARE city_uuid UUID;
BEGIN
  SELECT id INTO city_uuid FROM cities WHERE slug = 'prayagraj' LIMIT 1;
  IF city_uuid IS NULL THEN RETURN; END IF;

  INSERT INTO localities (city_id, name, slug, lat, lng, type, zone, priority, radius_m)
  VALUES
    -- George Town: north of Chowk, major commercial & residential area
    (city_uuid, 'George Town',   'george-town',   25.4630, 81.8410, 'locality', 'north',    3, 1800),
    -- Jhalwa: newer south colony, large residential
    (city_uuid, 'Jhalwa',        'jhalwa',        25.3968, 81.8702, 'locality', 'south',   29, 2000),
    -- Kidwai Nagar: east residential
    (city_uuid, 'Kidwai Nagar',  'kidwai-nagar',  25.4462, 81.8625, 'locality', 'east',    33, 1200),
    -- Kakadev: north-east residential, fast growing
    (city_uuid, 'Kakadev',       'kakadev',       25.4540, 81.8688, 'locality', 'east',    34, 1400),
    -- Ashok Nagar: north residential
    (city_uuid, 'Ashok Nagar',   'ashok-nagar',   25.4614, 81.8462, 'locality', 'north',   21, 1200),
    -- Gauhar Bagh: between Dariyabad and Sohbatiyabagh
    (city_uuid, 'Gauhar Bagh',   'gauhar-bagh',   25.4551, 81.8445, 'locality', 'north',   15, 900),
    -- Khuldabad: west of Colonelganj, compact area
    (city_uuid, 'Khuldabad',     'khuldabad',     25.4408, 81.8295, 'locality', 'central', 11, 900),
    -- Lohiya Nagar: near Civil Lines, distinct residential pocket
    (city_uuid, 'Lohiya Nagar',  'lohiya-nagar',  25.4502, 81.8493, 'locality', 'central', 14, 1000),
    -- Hastings Road area: between Civil Lines and Tagore Town
    (city_uuid, 'Hastings Road', 'hastings-road', 25.4570, 81.8487, 'locality', 'north',   19, 900),
    -- Syam Nagar: south of Rambagh, near Yamuna
    (city_uuid, 'Shyam Nagar',   'shyam-nagar',   25.4282, 81.8612, 'locality', 'east',    35, 1000)
  ON CONFLICT (city_id, slug) DO UPDATE
    SET lat      = EXCLUDED.lat,
        lng      = EXCLUDED.lng,
        type     = EXCLUDED.type,
        zone     = EXCLUDED.zone,
        priority = EXCLUDED.priority,
        radius_m = EXCLUDED.radius_m;
END;
$$;

-- 3. Set radius_m on all existing localities based on their physical size
DO $$
DECLARE city_uuid UUID;
BEGIN
  SELECT id INTO city_uuid FROM cities WHERE slug = 'prayagraj' LIMIT 1;
  IF city_uuid IS NULL THEN RETURN; END IF;

  -- Large localities (suburban / wide area)
  UPDATE localities SET radius_m = 2500
  WHERE city_id = city_uuid AND slug IN (
    'civil-lines', 'allahpur', 'naini', 'phaphamau',
    'bakshi-bandh', 'jhunsi', 'handia', 'karchana',
    'manauri', 'bamrauli', 'shringverpur', 'koraon',
    'triveni-sangam', 'jhalwa'
  );

  -- Medium localities (standard residential/commercial)
  UPDATE localities SET radius_m = 1500
  WHERE city_id = city_uuid AND slug IN (
    'teliyarganj', 'salori', 'rajrooppur', 'mahewa',
    'rajapur', 'tagore-town', 'mehdauri', 'baghambari',
    'lukerganj', 'rambagh', 'shivkuti', 'daraganj',
    'dhoomanganj', 'sohbatiyabagh', 'alopibagh',
    'pritam-nagar', 'george-town', 'kakadev', 'ashok-nagar'
  );

  -- Compact/dense localities (tight urban pockets)
  UPDATE localities SET radius_m = 900
  WHERE city_id = city_uuid AND slug IN (
    'chowk', 'katra', 'colonelganj', 'muthiganj',
    'mumfordganj', 'kydganj', 'hatia', 'dariyabad',
    'kalyani-devi', 'atala', 'zero-road', 'khuldabad',
    'gauhar-bagh', 'hastings-road', 'shyam-nagar'
  );

  -- Medium-small
  UPDATE localities SET radius_m = 1200
  WHERE city_id = city_uuid AND slug IN (
    'kidwai-nagar', 'lohiya-nagar'
  );

END;
$$;

-- 4. Update nearby_localities RPC to also return radius_m
CREATE OR REPLACE FUNCTION nearby_localities(
  user_lat  FLOAT,
  user_lng  FLOAT,
  limit_n   INT DEFAULT 40
)
RETURNS TABLE (
  id          UUID,
  name        TEXT,
  slug        TEXT,
  lat         DECIMAL,
  lng         DECIMAL,
  type        TEXT,
  zone        TEXT,
  priority    INT,
  radius_m    INT,
  city_id     UUID,
  distance_m  FLOAT
)
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT
    l.id, l.name, l.slug, l.lat, l.lng,
    l.type, l.zone, l.priority, l.radius_m, l.city_id,
    calculate_distance_m(user_lat, user_lng, l.lat::FLOAT, l.lng::FLOAT) AS distance_m
  FROM localities l
  ORDER BY distance_m ASC
  LIMIT limit_n;
$$;
