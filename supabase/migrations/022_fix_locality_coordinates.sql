-- =====================================================
-- 022_fix_locality_coordinates.sql
-- Corrects locality center coordinates that were too close
-- to the default fallback point (25.4358, 81.8463),
-- which caused Teliyarganj to always win the nearest-locality
-- sort on cold load before GPS resolved.
--
-- Root cause: Teliyarganj was at 25.4374, 81.8473 — only ~203m
-- from the city-center default. Correct center for Teliyarganj
-- (the chowk/main market area) is ~25.4220, 81.8494.
-- =====================================================

DO $$
DECLARE
  city_uuid UUID;
BEGIN
  SELECT id INTO city_uuid FROM cities WHERE slug = 'prayagraj' LIMIT 1;
  IF city_uuid IS NULL THEN RETURN; END IF;

  -- Teliyarganj: was 25.4374,81.8473 (too north — near city center default)
  -- Correct location is the Teliyarganj chowk / market area, ~2.4km south
  UPDATE localities
  SET lat = 25.4220, lng = 81.8494
  WHERE city_id = city_uuid AND slug = 'teliyarganj';

  -- Rambagh: was 25.4355,81.8556 — slightly too close to default too.
  -- Rambagh colony center is more accurately at 25.4335, 81.8590
  UPDATE localities
  SET lat = 25.4335, lng = 81.8590
  WHERE city_id = city_uuid AND slug = 'rambagh';

  -- Salori: was 25.4311,81.8492 — correct, no change needed.

  -- Rajapur: was 25.4328,81.8448 — reasonably accurate, no change.

END;
$$;
