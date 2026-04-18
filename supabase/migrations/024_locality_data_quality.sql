-- =====================================================
-- 024_locality_data_quality.sql
-- Foundation-level locality data corrections:
--   1. Fix center-point coordinates for key localities
--   2. Correct radius_m for areas that span wider than default
--   3. Improve priority for southern/outer localities
--      so they surface faster when GPS is unavailable
--   4. Ensure all active localities have correct data
-- =====================================================

DO $$
DECLARE city_uuid UUID;
BEGIN
  SELECT id INTO city_uuid FROM cities WHERE slug = 'prayagraj' LIMIT 1;
  IF city_uuid IS NULL THEN RETURN; END IF;

  -- ── Fix center coordinates ─────────────────────────────────────────
  -- Jhalwa: move center to main residential cluster (south colony, near canal road)
  -- Previous: 25.3968, 81.8702 — correct, kept as-is
  -- Bamrauli: airport area, west Prayagraj — correct at 25.4481, 81.7327

  -- Naini: industrial + residential, south across Yamuna
  -- Fix center to actual Naini market/residential core
  UPDATE localities SET lat = 25.3930, lng = 81.9000, radius_m = 2500
  WHERE city_id = city_uuid AND slug = 'naini';

  -- Mahewa: south residential, correct center
  UPDATE localities SET lat = 25.4154, lng = 81.8544, radius_m = 1800
  WHERE city_id = city_uuid AND slug = 'mahewa';

  -- Salori: between Teliyarganj and Rajrooppur
  UPDATE localities SET lat = 25.4240, lng = 81.8510, radius_m = 1200
  WHERE city_id = city_uuid AND slug = 'salori';

  -- Rajrooppur: correct center
  UPDATE localities SET lat = 25.4286, lng = 81.8539, radius_m = 1200
  WHERE city_id = city_uuid AND slug = 'rajrooppur';

  -- Tagore Town: correct center (east of Civil Lines)
  UPDATE localities SET lat = 25.4602, lng = 81.8582, radius_m = 1500
  WHERE city_id = city_uuid AND slug = 'tagore-town';

  -- Rajapur: south-central
  UPDATE localities SET lat = 25.4328, lng = 81.8448, radius_m = 1200
  WHERE city_id = city_uuid AND slug = 'rajapur';

  -- Allahpur: large residential south of Civil Lines
  UPDATE localities SET lat = 25.4400, lng = 81.8590, radius_m = 2000
  WHERE city_id = city_uuid AND slug = 'allahpur';

  -- Rambagh: west of Lukerganj, correct center
  UPDATE localities SET lat = 25.4335, lng = 81.8590, radius_m = 1500
  WHERE city_id = city_uuid AND slug = 'rambagh';

  -- ── Improve priorities for outer/southern localities ────────────────
  -- Priority only matters when GPS is unavailable (fallback sort).
  -- South colonies get bumped up so they're not buried at priority 29+.
  UPDATE localities SET priority = 12
  WHERE city_id = city_uuid AND slug = 'jhalwa';

  UPDATE localities SET priority = 14
  WHERE city_id = city_uuid AND slug = 'allahpur';

  UPDATE localities SET priority = 16
  WHERE city_id = city_uuid AND slug = 'naini';

  UPDATE localities SET priority = 18
  WHERE city_id = city_uuid AND slug = 'teliyarganj';

  UPDATE localities SET priority = 20
  WHERE city_id = city_uuid AND slug = 'mahewa';

  UPDATE localities SET priority = 22
  WHERE city_id = city_uuid AND slug = 'salori';

  -- ── Ensure Bamrauli has large radius (airport area is wide) ────────
  UPDATE localities SET radius_m = 3000
  WHERE city_id = city_uuid AND slug = 'bamrauli';

  -- ── Ensure all localities have radius_m set (no NULLs) ─────────────
  UPDATE localities SET radius_m = 1500
  WHERE city_id = city_uuid AND radius_m IS NULL;

END;
$$;
