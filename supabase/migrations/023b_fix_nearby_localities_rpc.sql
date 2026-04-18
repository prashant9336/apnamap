-- Fix: cannot change return type with CREATE OR REPLACE — must drop first
DROP FUNCTION IF EXISTS nearby_localities(double precision, double precision, integer);

CREATE FUNCTION nearby_localities(
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
