-- =====================================================
-- 009_locality_gps.sql
-- GPS-based dynamic locality system for Prayagraj
-- =====================================================

-- 1. Add type + zone columns to localities
ALTER TABLE localities ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'locality';
ALTER TABLE localities ADD COLUMN IF NOT EXISTS zone TEXT;

-- 2. nearby_localities RPC — returns all localities sorted by distance from user
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
  city_id     UUID,
  distance_m  FLOAT
)
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT
    l.id, l.name, l.slug, l.lat, l.lng,
    l.type, l.zone, l.priority, l.city_id,
    calculate_distance_m(user_lat, user_lng, l.lat::FLOAT, l.lng::FLOAT) AS distance_m
  FROM localities l
  ORDER BY distance_m ASC
  LIMIT limit_n;
$$;

-- 3. Seed comprehensive Prayagraj localities
--    Uses INSERT ... ON CONFLICT (city_id, slug) DO UPDATE
--    so this is safe to re-run and will refresh coordinates.

DO $$
DECLARE
  city_uuid UUID;
BEGIN
  SELECT id INTO city_uuid FROM cities WHERE slug = 'prayagraj' LIMIT 1;

  IF city_uuid IS NULL THEN
    -- Insert city if not present
    INSERT INTO cities (name, slug, lat, lng, state)
    VALUES ('Prayagraj', 'prayagraj', 25.4358, 81.8463, 'Uttar Pradesh')
    RETURNING id INTO city_uuid;
  END IF;

  -- ── Core city localities ──────────────────────────────────────────────────
  INSERT INTO localities (city_id, name, slug, lat, lng, type, zone, priority)
  VALUES
    -- Central
    (city_uuid, 'Civil Lines',      'civil-lines',      25.4484, 81.8428, 'locality', 'central',  1),
    (city_uuid, 'Chowk',           'chowk',            25.4524, 81.8406, 'locality', 'central',  2),
    (city_uuid, 'Katra',           'katra',            25.4473, 81.8371, 'locality', 'central',  3),
    (city_uuid, 'Colonelganj',     'colonelganj',      25.4489, 81.8362, 'locality', 'central',  4),
    (city_uuid, 'Muthiganj',       'muthiganj',        25.4467, 81.8427, 'locality', 'central',  5),
    (city_uuid, 'Mumfordganj',     'mumfordganj',      25.4447, 81.8381, 'locality', 'central',  6),
    (city_uuid, 'Kydganj',         'kydganj',          25.4462, 81.8362, 'locality', 'central',  7),
    (city_uuid, 'Hatia',           'hatia',            25.4477, 81.8418, 'locality', 'central',  8),
    (city_uuid, 'Dariyabad',       'dariyabad',        25.4517, 81.8333, 'locality', 'central',  9),
    (city_uuid, 'Kalyani Devi',    'kalyani-devi',     25.4461, 81.8307, 'locality', 'central', 10),
    (city_uuid, 'Atala',           'atala',            25.4530, 81.8272, 'locality', 'central', 11),
    (city_uuid, 'Pritam Nagar',    'pritam-nagar',     25.4560, 81.8320, 'locality', 'central', 12),
    (city_uuid, 'Sohbatiyabagh',   'sohbatiyabagh',    25.4491, 81.8444, 'locality', 'central', 13),
    (city_uuid, 'Alopibagh',       'alopibagh',        25.4412, 81.8418, 'locality', 'central', 14),
    (city_uuid, 'Zero Road',       'zero-road',        25.4459, 81.8488, 'locality', 'central', 15),

    -- North
    (city_uuid, 'Lukerganj',       'lukerganj',        25.4547, 81.8454, 'locality', 'north',   16),
    (city_uuid, 'Tagore Town',     'tagore-town',      25.4568, 81.8529, 'locality', 'north',   17),
    (city_uuid, 'Mehdauri',        'mehdauri',         25.4588, 81.8482, 'locality', 'north',   18),
    (city_uuid, 'Baghambari',      'baghambari',       25.4596, 81.8545, 'locality', 'north',   19),
    (city_uuid, 'Allahpur',        'allahpur',         25.4428, 81.8536, 'locality', 'north',   20),
    (city_uuid, 'Rajapur',         'rajapur',          25.4328, 81.8448, 'locality', 'north',   21),
    (city_uuid, 'Phaphamau',       'phaphamau',        25.5049, 81.8555, 'locality', 'north',   22),
    (city_uuid, 'Bakshi Bandh',    'bakshi-bandh',     25.5232, 81.8616, 'locality', 'north',   23),

    -- South / Yamuna
    (city_uuid, 'Teliyarganj',     'teliyarganj',      25.4374, 81.8473, 'locality', 'south',   24),
    (city_uuid, 'Salori',          'salori',           25.4311, 81.8492, 'locality', 'south',   25),
    (city_uuid, 'Rajrooppur',      'rajrooppur',       25.4286, 81.8539, 'locality', 'south',   26),
    (city_uuid, 'Mahewa',          'mahewa',           25.4154, 81.8544, 'locality', 'south',   27),
    (city_uuid, 'Naini',           'naini',            25.3985, 81.8934, 'locality', 'south',   28),
    (city_uuid, 'Karchana',        'karchana',         25.2978, 81.9361, 'locality', 'south',   29),

    -- East / Ganga
    (city_uuid, 'Rambagh',         'rambagh',          25.4355, 81.8556, 'locality', 'east',    30),
    (city_uuid, 'Shivkuti',        'shivkuti',         25.4366, 81.8642, 'locality', 'east',    31),
    (city_uuid, 'Daraganj',        'daraganj',         25.4411, 81.8698, 'locality', 'east',    32),
    (city_uuid, 'Dhoomanganj',     'dhoomanganj',      25.4307, 81.8667, 'locality', 'east',    33),
    (city_uuid, 'Triveni Sangam',  'triveni-sangam',   25.4239, 81.8838, 'locality', 'east',    34),
    (city_uuid, 'Jhunsi',          'jhunsi',           25.4302, 81.9003, 'locality', 'east',    35),
    (city_uuid, 'Handia',          'handia',           25.3834, 82.0007, 'locality', 'east',    36),

    -- West / Airport area
    (city_uuid, 'Manauri',         'manauri',          25.4479, 81.7431, 'locality', 'west',    37),
    (city_uuid, 'Bamrauli',        'bamrauli',         25.4481, 81.7327, 'locality', 'west',    38),
    (city_uuid, 'Shringverpur',    'shringverpur',     25.3938, 81.7053, 'locality', 'west',    39),
    (city_uuid, 'Koraon',          'koraon',           25.3556, 81.6800, 'locality', 'west',    40)

  ON CONFLICT (city_id, slug) DO UPDATE
    SET lat      = EXCLUDED.lat,
        lng      = EXCLUDED.lng,
        type     = EXCLUDED.type,
        zone     = EXCLUDED.zone,
        priority = EXCLUDED.priority;

END;
$$;

-- 4. Index on lat/lng for spatial queries
CREATE INDEX IF NOT EXISTS idx_localities_lat_lng ON localities(lat, lng);
