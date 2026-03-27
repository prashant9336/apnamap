-- ═══════════════════════════════════════════════════════════════
-- APNAMAP — SEED DATA FOR PRAYAGRAJ
-- Run AFTER the schema migration
-- ═══════════════════════════════════════════════════════════════

-- ─── CATEGORIES ───────────────────────────────────────────────

INSERT INTO categories (name, slug, icon, color, bg_class, sort_order) VALUES
  ('Sweet Shop',     'sweet-shop',     '🍮', '#FF8C00', 'food',       1),
  ('Restaurant',     'restaurant',     '🍽️', '#FF6B35', 'food',       2),
  ('Street Food',    'street-food',    '🍲', '#FF5722', 'food',       3),
  ('Grocery',        'grocery',        '🛒', '#1FBB5A', 'grocery',    4),
  ('Fashion',        'fashion',        '👗', '#EC4899', 'fashion',    5),
  ('Electronics',    'electronics',    '📺', '#38BDF8', 'elec',       6),
  ('Salon & Beauty', 'salon',          '✂️', '#A78BFA', 'salon',      7),
  ('Mobile Repair',  'mobile-repair',  '📱', '#60A5FA', 'mobile',     8),
  ('Jewellery',      'jewellery',      '💍', '#E8A800', 'jewellery',  9),
  ('Pharmacy',       'pharmacy',       '💊', '#34D399', 'medical',    10),
  ('Coaching',       'coaching',       '📚', '#818CF8', 'coaching',   11),
  ('Gym & Fitness',  'gym',            '🏋️', '#F59E0B', 'gym',        12),
  ('Bakery',         'bakery',         '🎂', '#FB923C', 'food',       13),
  ('Auto & Repair',  'auto-repair',    '🔧', '#94A3B8', 'auto',       14),
  ('Hotel & Stay',   'hotel',          '🏨', '#6EE7B7', 'hotel',      15),
  ('Paan Shop',      'paan',           '🌿', '#86EFAC', 'paan',       16),
  ('Dairy & Milk',   'dairy',          '🥛', '#BAE6FD', 'dairy',      17),
  ('Hardware',       'hardware',       '🔩', '#CBD5E1', 'hardware',   18)
ON CONFLICT (slug) DO NOTHING;

-- ─── CITY: PRAYAGRAJ ──────────────────────────────────────────

INSERT INTO cities (name, slug, state, lat, lng) VALUES
  ('Prayagraj', 'prayagraj', 'Uttar Pradesh', 25.4358, 81.8463)
ON CONFLICT (slug) DO NOTHING;

-- ─── LOCALITIES ───────────────────────────────────────────────

WITH city AS (SELECT id FROM cities WHERE slug = 'prayagraj')
INSERT INTO localities (city_id, name, slug, description, lat, lng, sort_order)
SELECT city.id, v.name, v.slug, v.description, v.lat, v.lng, v.sort_order
FROM city, (VALUES
  ('Civil Lines',  'civil-lines',  'Upscale commercial hub with banks, cafes and major retail',         25.4580, 81.8372, 1),
  ('Chowk Bazar',  'chowk',        'The historic old city bazaar — dense, chaotic, full of character',  25.4462, 81.8465, 2),
  ('Katra Market', 'katra',        'Dense fashion, repair and street food lane',                        25.4418, 81.8515, 3),
  ('Rambagh',      'rambagh',      'Residential area with local markets and daily needs',               25.4312, 81.8690, 4),
  ('Naini',        'naini',        'Industrial zone with wholesale and auto markets',                   25.4025, 81.9003, 5),
  ('George Town',  'george-town',  'Busy commercial area near Prayag railway station',                  25.4437, 81.8280, 6),
  ('Lukerganj',    'lukerganj',    'Educational and residential area near Allahabad University',        25.4558, 81.8403, 7),
  ('Tagore Town',  'tagore-town',  'Heritage locality with old Bengali traders',                        25.4634, 81.8443, 8)
) AS v(name, slug, description, lat, lng, sort_order)
ON CONFLICT DO NOTHING;

-- ─── SHOPS ────────────────────────────────────────────────────

WITH 
  civil_lines AS (SELECT id FROM localities WHERE slug = 'civil-lines'),
  chowk       AS (SELECT id FROM localities WHERE slug = 'chowk'),
  katra       AS (SELECT id FROM localities WHERE slug = 'katra'),
  rambagh     AS (SELECT id FROM localities WHERE slug = 'rambagh'),
  city        AS (SELECT id FROM cities WHERE slug = 'prayagraj'),
  cat_sweet   AS (SELECT id FROM categories WHERE slug = 'sweet-shop'),
  cat_rest    AS (SELECT id FROM categories WHERE slug = 'restaurant'),
  cat_street  AS (SELECT id FROM categories WHERE slug = 'street-food'),
  cat_fashion AS (SELECT id FROM categories WHERE slug = 'fashion'),
  cat_elec    AS (SELECT id FROM categories WHERE slug = 'electronics'),
  cat_salon   AS (SELECT id FROM categories WHERE slug = 'salon'),
  cat_mobile  AS (SELECT id FROM categories WHERE slug = 'mobile-repair'),
  cat_pharma  AS (SELECT id FROM categories WHERE slug = 'pharmacy'),
  cat_jewel   AS (SELECT id FROM categories WHERE slug = 'jewellery'),
  cat_grocery AS (SELECT id FROM categories WHERE slug = 'grocery')

INSERT INTO shops (
  vendor_id, category_id, locality_id, city_id, name, slug, description,
  address, phone, whatsapp, lat, lng, rating, review_count, status, is_featured,
  open_time, close_time, tags
)
SELECT NULL, shop.cat_id, shop.loc_id, city.id, shop.name, shop.slug, shop.description,
       shop.address, shop.phone, shop.whatsapp, shop.lat, shop.lng, shop.rating,
       shop.review_count, 'active'::shop_status, shop.featured,
       shop.open_time::TIME, shop.close_time::TIME, shop.tags::TEXT[]
FROM city, (VALUES
  -- CIVIL LINES SHOPS
  ((SELECT id FROM cat_sweet), (SELECT id FROM civil_lines),
   'Gupta Sweet House', 'gupta-sweet-house',
   'Famous for rabri jalebi and kesar pedha since 1978. Pure desi ghee, no artificial colours.',
   '14 Civil Lines Market', '9415100101', '9415100101',
   25.4582, 81.8370, 4.7, 312, TRUE, '07:30', '22:00',
   ARRAY['pure-ghee','traditional','wholesale']),

  ((SELECT id FROM cat_rest), (SELECT id FROM civil_lines),
   'Café Allahabad', 'cafe-allahabad',
   'Nostalgic chai and snack adda since 1994. Best samosa-sabzi and filter coffee in Civil Lines.',
   '2 Leader Road, Civil Lines', '9415100102', '9415100102',
   25.4576, 81.8368, 4.5, 427, TRUE, '08:00', '22:30',
   ARRAY['chai','coffee','snacks','nostalgia']),

  ((SELECT id FROM cat_elec), (SELECT id FROM civil_lines),
   'Sharma Electronics', 'sharma-electronics',
   'Authorized Samsung and LG dealer. TVs, ACs, refrigerators. Expert installation team.',
   '8 Thornhill Road, Civil Lines', '9415100103', '9415100103',
   25.4574, 81.8366, 4.3, 186, FALSE, '10:00', '20:00',
   ARRAY['samsung','lg','authorized','installation']),

  ((SELECT id FROM cat_fashion), (SELECT id FROM civil_lines),
   'New Fashion Point', 'new-fashion-point',
   'Latest ethnic and western wear for women. New arrivals every week from Surat and Delhi.',
   '22 Civil Lines', '9415100104', '9415100104',
   25.4578, 81.8364, 4.2, 143, FALSE, '10:00', '21:00',
   ARRAY['ladies','ethnic','western','new-arrivals']),

  ((SELECT id FROM cat_pharma), (SELECT id FROM civil_lines),
   'Singh Medicals', 'singh-medicals',
   '24-hour pharmacy. All medicines available. Home delivery within 2 km.',
   '6 Muir Road, Civil Lines', '9415100105', '9415100105',
   25.4569, 81.8371, 4.5, 89, FALSE, '00:00', '23:59',
   ARRAY['24-hour','delivery','all-medicines']),

  -- CHOWK SHOPS
  ((SELECT id FROM cat_street), (SELECT id FROM chowk),
   'Raj Kachori Corner', 'raj-kachori-corner',
   'Legendary kachori-sabzi served from the same spot since 1965. Opens at 7am, sells out by noon.',
   'Near Chowk Chauraha', '9415100201', '9415100201',
   25.4461, 81.8467, 4.9, 1243, TRUE, '07:00', '13:00',
   ARRAY['heritage','must-try','kachori','breakfast']),

  ((SELECT id FROM cat_fashion), (SELECT id FROM chowk),
   'Moti Mahal Sarees', 'moti-mahal-sarees',
   'Three generations of saree trading. Banarasi, Kanjivaram, Chanderi — all under one roof.',
   'Chowk Main Road', '9415100202', '9415100202',
   25.4458, 81.8470, 4.4, 288, TRUE, '10:30', '21:30',
   ARRAY['banarasi','kanjivaram','wholesale','bridal']),

  ((SELECT id FROM cat_grocery), (SELECT id FROM chowk),
   'Trivedi Kirana Store', 'trivedi-kirana',
   'Complete household grocery. Fresh produce daily. Home delivery available via WhatsApp.',
   'Chowk Lane 3', '9415100203', '9415100203',
   25.4455, 81.8462, 4.1, 67, FALSE, '07:00', '22:00',
   ARRAY['delivery','fresh','grocery','home-delivery']),

  ((SELECT id FROM cat_jewel), (SELECT id FROM chowk),
   'Soni Jewellers', 'soni-jewellers',
   'BIS hallmark certified gold and silver. Bridal jewellery specialists since 1982.',
   'Chowk Market, Near Clock Tower', '9415100204', '9415100204',
   25.4460, 81.8473, 4.8, 201, TRUE, '10:00', '20:00',
   ARRAY['hallmark','bridal','gold','silver','certified']),

  ((SELECT id FROM cat_sweet), (SELECT id FROM chowk),
   'Ram Babu Laddoo Bhandar', 'ram-babu-laddoo',
   'Famous motichoor laddoo and besan laddoo. Also fresh pedha and burfi daily.',
   'Chowk Crossing', '9415100205', '9415100205',
   25.4463, 81.8468, 4.6, 412, FALSE, '08:00', '21:00',
   ARRAY['laddoo','motichoor','sweets','fresh']),

  -- KATRA SHOPS
  ((SELECT id FROM cat_salon), (SELECT id FROM katra),
   'Style Studio Salon', 'style-studio-salon',
   'Unisex salon. Hair colour, keratin, bridal makeup. Expert stylists trained in Delhi.',
   'Katra Market Lane 2', '9415100301', '9415100301',
   25.4419, 81.8516, 4.3, 201, TRUE, '09:00', '20:00',
   ARRAY['unisex','bridal','keratin','hair-colour']),

  ((SELECT id FROM cat_mobile), (SELECT id FROM katra),
   'Speed Mobile Repair', 'speed-mobile-repair',
   'All brand repairs. Screen replacement, battery change, water damage. 6-month warranty.',
   'Katra Main Road, Shop 14', '9415100302', '9415100302',
   25.4416, 81.8519, 4.2, 178, FALSE, '09:30', '20:30',
   ARRAY['all-brands','screen-repair','warranty','fast']),

  ((SELECT id FROM cat_rest), (SELECT id FROM katra),
   'Annapurna Restaurant', 'annapurna-restaurant',
   'Pure veg thali restaurant. Unlimited refills. Homestyle UP food.',
   'Katra Crossing', '9415100303', '9415100303',
   25.4421, 81.8513, 4.6, 334, TRUE, '12:00', '22:00',
   ARRAY['pure-veg','thali','unlimited','homestyle']),

  -- RAMBAGH SHOPS
  ((SELECT id FROM cat_grocery), (SELECT id FROM rambagh),
   'Mishra General Store', 'mishra-general-store',
   'Well-stocked general store. Groceries, dairy, snacks. Open early morning to late night.',
   'Rambagh Colony, Near Park', '9415100401', '9415100401',
   25.4313, 81.8692, 4.0, 54, FALSE, '06:30', '22:30',
   ARRAY['early-morning','late-night','general','dairy'])
) AS shop(
  cat_id, loc_id, name, slug, description, address, phone, whatsapp,
  lat, lng, rating, review_count, featured, open_time, close_time, tags
)
ON CONFLICT (slug) DO NOTHING;

-- ─── OFFERS ───────────────────────────────────────────────────

INSERT INTO offers (shop_id, title, slug, description, offer_type, discount_value, end_date, status, coupon_code)
SELECT s.id, o.title, o.slug, o.description, o.offer_type::offer_type, o.discount_value,
       NOW() + o.days_left * INTERVAL '1 day', 'active', o.coupon_code
FROM shops s
JOIN (VALUES
  -- Gupta Sweet House
  ('gupta-sweet-house', 'Flat 25% OFF on All Sweets', 'gupta-flat25',
   'Get 25% off on all sweets above ₹500. Valid on takeaway and packing.',
   'percentage', 25, 7, 'GUPTA25'),
  ('gupta-sweet-house', 'Buy 1 kg Get 250g Free', 'gupta-bogo',
   'Buy 1 kg of any sweet and get 250g of motichoor laddoo free.',
   'bogo', NULL, 14, NULL),
  -- Café Allahabad
  ('cafe-allahabad', 'Chai + Samosa Combo at ₹30', 'cafe-combo30',
   'One cutting chai + two crispy samosas for just ₹30. Dine-in only.',
   'combo', NULL, 30, 'CHAI30'),
  ('cafe-allahabad', 'Buy 3 Get 1 Free', 'cafe-bogo3',
   'Order any 3 items and get the cheapest one free.',
   'bogo', NULL, 10, NULL),
  -- Sharma Electronics
  ('sharma-electronics', 'Free Installation with Any AC', 'sharma-ac-install',
   'Purchase any AC above ₹20,000 and get free installation worth ₹1,500.',
   'free_service', NULL, 20, NULL),
  -- New Fashion Point
  ('new-fashion-point', 'End of Season Sale — Flat 30% OFF', 'fashion-30off',
   'Flat 30% off on all kurtis, sarees and western wear. No minimum order.',
   'percentage', 30, 5, 'FASHION30'),
  -- Raj Kachori Corner
  ('raj-kachori-corner', 'Morning Special: Full Thali ₹40', 'kachori-thali40',
   'Kachori + sabzi + jalebi morning thali for ₹40 before 10am.',
   'combo', NULL, 60, NULL),
  -- Moti Mahal Sarees
  ('moti-mahal-sarees', 'Banarasi Silk Flat 20% OFF', 'moti-banarasi20',
   'Flat 20% off on all Banarasi silk sarees above ₹2,000.',
   'percentage', 20, 12, 'BANARASI20'),
  -- Soni Jewellers
  ('soni-jewellers', 'Free Gold Coin on Purchase above ₹50,000', 'soni-goldcoin',
   'Get a complimentary 1-gram gold coin on any purchase above ₹50,000.',
   'free_service', NULL, 30, NULL),
  -- Style Studio Salon
  ('style-studio-salon', '40% OFF on First Visit', 'salon-first40',
   '40% off on any single service for first-time customers. Valid on all services.',
   'percentage', 40, 90, 'FIRST40'),
  ('style-studio-salon', 'Bridal Package at ₹4,999', 'salon-bridal-pkg',
   'Full bridal makeup + mehendi + hair styling package. Advance booking required.',
   'flat', 4999, 60, 'BRIDAL4999'),
  -- Speed Mobile Repair
  ('speed-mobile-repair', '₹100 OFF Screen Replacement', 'mobile-screen100',
   'Get ₹100 off on any screen replacement job. Valid on all brands.',
   'flat', 100, 15, 'SCREEN100'),
  -- Annapurna Restaurant
  ('annapurna-restaurant', 'Unlimited Thali at ₹99', 'annapurna-thali99',
   'Unlimited pure veg thali with dal, sabzi, roti, rice and salad. Weekdays only.',
   'flat', 99, 30, 'THALI99'),
  -- Ram Babu Laddoo
  ('ram-babu-laddoo', '500g Motichoor Free on 2kg Order', 'laddoo-free500',
   'Order 2kg or more and get 500g motichoor laddoo absolutely free.',
   'bogo', NULL, 7, NULL)
) AS o(shop_slug, title, slug, description, offer_type, discount_value, days_left, coupon_code)
ON s.slug = o.shop_slug
ON CONFLICT (slug) DO NOTHING;
