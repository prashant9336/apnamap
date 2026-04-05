-- ══════════════════════════════════════════════════════════════════════
-- ApnaMap — 100 Realistic Prayagraj Shops Seed
-- Run AFTER prayagraj.sql (or standalone — vendor setup is idempotent)
-- Adds: Jhalwa + Allahpur localities, Cafe category, 100 shops, 65 offers
-- ══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  demo_vendor_id UUID := '99000000-0000-0000-0000-000000000001';

  -- Localities (existing)
  civil_id    UUID := '10000000-0000-0000-0000-000000000001';
  chowk_id    UUID := '10000000-0000-0000-0000-000000000002';
  katra_id    UUID := '10000000-0000-0000-0000-000000000003';
  rambagh_id  UUID := '10000000-0000-0000-0000-000000000004';
  -- New localities
  jhalwa_id   UUID := '10000000-0000-0000-0000-000000000006';
  allahpur_id UUID := '10000000-0000-0000-0000-000000000007';

  -- Categories (existing)
  sweet_id      UUID := '20000000-0000-0000-0000-000000000001';
  restaurant_id UUID := '20000000-0000-0000-0000-000000000002';
  street_id     UUID := '20000000-0000-0000-0000-000000000003';
  grocery_id    UUID := '20000000-0000-0000-0000-000000000004';
  fashion_id    UUID := '20000000-0000-0000-0000-000000000005';
  salon_id      UUID := '20000000-0000-0000-0000-000000000007';
  pharmacy_id   UUID := '20000000-0000-0000-0000-000000000010';
  -- New category
  cafe_id       UUID := '20000000-0000-0000-0000-000000000013';

BEGIN

-- ── Ensure demo vendor exists (idempotent — safe if prayagraj.sql ran first) ──
INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
) VALUES (
  demo_vendor_id,
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'demo-vendor@apnamap.test',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"vendor","name":"Demo Vendor"}',
  FALSE
) ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, name, phone, role)
VALUES (demo_vendor_id, 'Demo Vendor', '9400000001', 'vendor')
ON CONFLICT (id) DO NOTHING;

INSERT INTO vendors (id, business_name, is_verified)
VALUES (demo_vendor_id, 'ApnaMap Demo Vendor', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ── New Localities ─────────────────────────────────────────────────
INSERT INTO localities (id, city_id, name, slug, description, lat, lng, priority)
VALUES
  (jhalwa_id,   '00000000-0000-0000-0000-000000000001',
   'Jhalwa',    'jhalwa',    'South Prayagraj residential belt near universities', 25.3895, 81.8592, 6),
  (allahpur_id, '00000000-0000-0000-0000-000000000001',
   'Allahpur',  'allahpur',  'Mid-city residential colony with active local markets', 25.4225, 81.8690, 7)
ON CONFLICT (city_id, slug) DO NOTHING;

-- ── New Category: Cafe ─────────────────────────────────────────────
INSERT INTO categories (id, name, slug, icon, color)
VALUES (cafe_id, 'Cafe', 'cafe', '☕', '#A16207')
ON CONFLICT (slug) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════
-- SHOPS
-- Column order: id, vendor_id, locality_id, category_id,
--   name, slug, description, phone, whatsapp, address,
--   lat, lng, is_approved, is_active, open_time, close_time,
--   avg_rating, review_count
-- ══════════════════════════════════════════════════════════════════════

INSERT INTO shops (id, vendor_id, locality_id, category_id, name, slug, description,
  phone, whatsapp, address, lat, lng, is_approved, is_active,
  open_time, close_time, avg_rating, review_count)
VALUES

-- ── CIVIL LINES (20 shops) ─────────────────────────────────────────

('30000000-0000-0000-0000-000000000011', demo_vendor_id, civil_id, restaurant_id,
 'El Chico Restaurant', 'el-chico-restaurant',
 'Prayagraj landmark since 1959. Beloved for their sizzlers, continental mains, and signature cold coffee. Always packed on weekends.',
 '9415011001', '9415011001', '17 MG Marg, Civil Lines, Prayagraj',
 25.4582, 81.8388, TRUE, TRUE, '11:00', '22:30', 4.6, 892),

('30000000-0000-0000-0000-000000000012', demo_vendor_id, civil_id, cafe_id,
 'Cafe Rendezvous', 'cafe-rendezvous',
 'The most talked-about cafe in Civil Lines. Wood-panelled walls, great mocha, and sandwiches that taste like 1990. A student institution.',
 '9415012002', '9415012002', '4 Elgin Road, Civil Lines, Prayagraj',
 25.4577, 81.8375, TRUE, TRUE, '08:00', '22:00', 4.5, 1124),

('30000000-0000-0000-0000-000000000013', demo_vendor_id, civil_id, pharmacy_id,
 'Apollo Pharmacy Civil Lines', 'apollo-pharmacy-civil-lines',
 'Authorised Apollo chain. Full stock of medicines, surgical items, and OTC. Open late, accepts prescriptions.',
 '9415013003', '9415013003', '9 Thornhill Road, Civil Lines, Prayagraj',
 25.4580, 81.8361, TRUE, TRUE, '08:00', '22:00', 4.4, 211),

('30000000-0000-0000-0000-000000000014', demo_vendor_id, civil_id, fashion_id,
 'Fabindia Civil Lines', 'fabindia-civil-lines',
 'Handwoven fabrics, kurtas, home furnishings. Ethically sourced from Indian artisans. Festive collection always available.',
 '9415014004', '9415014004', '26 Leader Road, Civil Lines, Prayagraj',
 25.4571, 81.8379, TRUE, TRUE, '10:30', '20:30', 4.3, 178),

('30000000-0000-0000-0000-000000000015', demo_vendor_id, civil_id, salon_id,
 'Green Trends Unisex Salon', 'green-trends-salon',
 'Professional hair cutting, colouring, and skin treatments. Trained stylists. Walk-ins welcome. Bridal packages available.',
 '9415015005', '9415015005', '11 Stanley Road, Civil Lines, Prayagraj',
 25.4575, 81.8371, TRUE, TRUE, '10:00', '20:00', 4.2, 143),

('30000000-0000-0000-0000-000000000016', demo_vendor_id, civil_id, grocery_id,
 'Nature Fresh Supermart', 'nature-fresh-supermart',
 'Clean, well-stocked grocery store. Fresh vegetables, imported dairy, branded packaged goods. Home delivery available.',
 '9415016006', '9415016006', '33 Civil Lines Main Road, Prayagraj',
 25.4585, 81.8368, TRUE, TRUE, '08:00', '21:00', 4.1, 96),

('30000000-0000-0000-0000-000000000017', demo_vendor_id, civil_id, sweet_id,
 'Agarwal Sweets Civil Lines', 'agarwal-sweets-civil-lines',
 'Freshly made sweets every morning. Known for their mawa kachori, laddoo, and kalakand. Gift boxes on order.',
 '9415017007', '9415017007', '5 Bentinck Road, Civil Lines, Prayagraj',
 25.4574, 81.8384, TRUE, TRUE, '08:30', '21:30', 4.5, 367),

('30000000-0000-0000-0000-000000000018', demo_vendor_id, civil_id, street_id,
 'Chacha Ki Chaat', 'chacha-ki-chaat',
 'MG Marg''s most loved chaat stall. Papdi chaat, bhel, and aloo tikki that regulars travel across the city for.',
 '9415018008', '9415018008', 'Near GPO, MG Marg, Civil Lines, Prayagraj',
 25.4579, 81.8365, TRUE, TRUE, '16:00', '21:00', 4.7, 534),

('30000000-0000-0000-0000-000000000019', demo_vendor_id, civil_id, restaurant_id,
 'Jade Garden Chinese Restaurant', 'jade-garden-chinese',
 'Best Chinese food in Prayagraj. Chilli paneer, hakka noodles, and dumplings made fresh. Air-conditioned. Family friendly.',
 '9415019009', '9415019009', '44 MG Marg, Civil Lines, Prayagraj',
 25.4583, 81.8359, TRUE, TRUE, '12:00', '22:00', 4.4, 412),

('30000000-0000-0000-0000-000000000020', demo_vendor_id, civil_id, cafe_id,
 'The Coffee House', 'the-coffee-house-civil-lines',
 'Classic Uttar Pradesh Coffee House. Filter coffee, rusks, and light snacks. Red wooden booths. Timeless.',
 '9415020010', '9415020010', '2 Alfred Park Road, Civil Lines, Prayagraj',
 25.4569, 81.8377, TRUE, TRUE, '07:30', '21:30', 4.3, 621),

('30000000-0000-0000-0000-000000000021', demo_vendor_id, civil_id, fashion_id,
 'Raymond The Complete Man', 'raymond-civil-lines',
 'Authorised Raymond showroom. Suiting, shirting, and readymade formals. Custom stitching available in 5 working days.',
 '9415021011', '9415021011', '18 Leader Road, Civil Lines, Prayagraj',
 25.4572, 81.8381, TRUE, TRUE, '10:30', '20:30', 4.2, 89),

('30000000-0000-0000-0000-000000000022', demo_vendor_id, civil_id, pharmacy_id,
 'MedPlus Civil Lines', 'medplus-civil-lines',
 'Chain pharmacy with guaranteed stock. Discounts on generics. Lab test booking available at counter.',
 '9415022012', '9415022012', '7 Thornhill Road, Civil Lines, Prayagraj',
 25.4578, 81.8363, TRUE, TRUE, '08:00', '21:30', 4.2, 134),

('30000000-0000-0000-0000-000000000023', demo_vendor_id, civil_id, restaurant_id,
 'Tandoor Palace', 'tandoor-palace-civil-lines',
 'North Indian specialities from the clay tandoor. Butter chicken, naan, and seekh kebabs done right. Rooftop seating.',
 '9415023013', '9415023013', '51 Civil Lines, Prayagraj',
 25.4586, 81.8372, TRUE, TRUE, '12:00', '23:00', 4.3, 298),

('30000000-0000-0000-0000-000000000024', demo_vendor_id, civil_id, salon_id,
 'Naturals Salon Civil Lines', 'naturals-salon-civil-lines',
 'Premium women''s salon. Hair spa, keratin treatments, waxing. Appointment preferred but walk-ins welcome.',
 '9415024014', '9415024014', '30 Elgin Road, Civil Lines, Prayagraj',
 25.4568, 81.8391, TRUE, TRUE, '09:30', '19:30', 4.4, 203),

('30000000-0000-0000-0000-000000000025', demo_vendor_id, civil_id, fashion_id,
 'Biba Women', 'biba-civil-lines',
 'Bright ethnic wear for women. Kurtas, suits, and fusion wear. New collections arrive twice a month.',
 '9415025015', '9415025015', '22 MG Marg, Civil Lines, Prayagraj',
 25.4581, 81.8356, TRUE, TRUE, '10:30', '20:30', 4.1, 112),

('30000000-0000-0000-0000-000000000026', demo_vendor_id, civil_id, sweet_id,
 'Kesari Sweets Civil Lines', 'kesari-sweets-civil-lines',
 'Premium Rajasthani-style sweets made with pure desi ghee. Famous for their besan laddoo, ghewar, and dry fruit barfi.',
 '9415026016', '9415026016', '14 Stanley Road, Civil Lines, Prayagraj',
 25.4576, 81.8374, TRUE, TRUE, '09:00', '21:00', 4.6, 445),

('30000000-0000-0000-0000-000000000027', demo_vendor_id, civil_id, cafe_id,
 'Brewhood Coffee Roasters', 'brewhood-coffee',
 'Specialty coffee, cold brews, and artisan breads. Laptop-friendly with fast wifi. Popular with working professionals.',
 '9415027017', '9415027017', '8 Civil Lines Station Road, Prayagraj',
 25.4590, 81.8360, TRUE, TRUE, '08:00', '22:00', 4.5, 287),

('30000000-0000-0000-0000-000000000028', demo_vendor_id, civil_id, grocery_id,
 'BigBazaar Civil Lines', 'bigbazaar-civil-lines',
 'Large format retail. Groceries, apparel, electronics, and home goods under one roof. Weekend deals always running.',
 '9415028018', '9415028018', 'Civil Lines Shopping Complex, Prayagraj',
 25.4567, 81.8397, TRUE, TRUE, '10:00', '22:00', 3.9, 623),

('30000000-0000-0000-0000-000000000029', demo_vendor_id, civil_id, street_id,
 'Pani Puri Palace MG Marg', 'pani-puri-palace-mg-marg',
 'Crispy handmade golgappe with four flavours of jaljeera water. Their shot glasses are Instagram-famous.',
 '9415029019', '9415029019', 'MG Marg Footpath, Civil Lines, Prayagraj',
 25.4584, 81.8353, TRUE, TRUE, '15:30', '21:30', 4.8, 712),

('30000000-0000-0000-0000-000000000030', demo_vendor_id, civil_id, restaurant_id,
 'Food Station Civil Lines', 'food-station-civil-lines',
 'Fast casual with biryani, wraps, burgers, and fresh juices. Good value, consistent quality, no frills.',
 '9415030020', '9415030020', '40 Leader Road, Civil Lines, Prayagraj',
 25.4573, 81.8388, TRUE, TRUE, '11:00', '22:30', 4.0, 176),

-- ── CHOWK BAZAR (18 shops) ─────────────────────────────────────────

('30000000-0000-0000-0000-000000000031', demo_vendor_id, chowk_id, street_id,
 'Shiv Chaat Bhandar', 'shiv-chaat-bhandar',
 'Prayagraj''s most famous chaat spot since 1948. Dahi papdi, aloo tikki, and tamatar chaat that people travel hours for. Seat yourself.',
 '9415031021', '9415031021', 'Chowk Chauraha, Old City, Prayagraj',
 25.4455, 81.8467, TRUE, TRUE, '12:00', '21:30', 4.9, 2341),

('30000000-0000-0000-0000-000000000032', demo_vendor_id, chowk_id, sweet_id,
 'Moti Mahal Sweets', 'moti-mahal-sweets',
 'Old city sweets institution. Their rabri is made fresh at 6am and sells out by noon. Also known for mawa barfi and sohan halwa.',
 '9415032022', '9415032022', 'Sadar Bazar, Chowk, Prayagraj',
 25.4459, 81.8471, TRUE, TRUE, '06:00', '21:00', 4.7, 876),

('30000000-0000-0000-0000-000000000033', demo_vendor_id, chowk_id, sweet_id,
 'Pyarelal Misthan Bhandar', 'pyarelal-misthan-bhandar',
 'Three generations of mithai-making. Best peda and khoya barfi in the old city. Pure ghee, no shortcuts.',
 '9415033023', '9415033023', 'Dharma Tala, Chowk, Prayagraj',
 25.4452, 81.8464, TRUE, TRUE, '07:00', '21:00', 4.8, 1102),

('30000000-0000-0000-0000-000000000034', demo_vendor_id, chowk_id, restaurant_id,
 'Lucky Restaurant Chowk', 'lucky-restaurant-chowk',
 'No-frills legendary dhaba. Mutton curry, tawa roti, and lassi. Always crowded at lunch. Cash only.',
 '9415034024', '9415034024', 'Chowk Market, Prayagraj',
 25.4461, 81.8458, TRUE, TRUE, '10:00', '22:00', 4.3, 543),

('30000000-0000-0000-0000-000000000035', demo_vendor_id, chowk_id, grocery_id,
 'Sharma Kirana Store', 'sharma-kirana-chowk',
 'Old city provision store. Whole spices, lentils, mustard oil, and homemade pickles. Loyal customers since 1975.',
 '9415035025', '9415035025', 'Lane 6, Chowk Bazar, Prayagraj',
 25.4448, 81.8473, TRUE, TRUE, '07:00', '21:30', 4.2, 78),

('30000000-0000-0000-0000-000000000036', demo_vendor_id, chowk_id, salon_id,
 'Rekha Beauty Parlour', 'rekha-beauty-parlour',
 'Ladies-only parlour in the heart of Chowk. Threading, facials, bridal makeup. Affordable and trusted.',
 '9415036026', '9415036026', 'Near Hanuman Mandir, Chowk, Prayagraj',
 25.4456, 81.8476, TRUE, TRUE, '09:00', '20:00', 4.1, 167),

('30000000-0000-0000-0000-000000000037', demo_vendor_id, chowk_id, pharmacy_id,
 'Lucky Medical Store', 'lucky-medical-chowk',
 'Old city medical shop with complete pharma stock. 24-hour availability on weekdays. Generic medicines available.',
 '9415037027', '9415037027', 'Chowk Crossing, Prayagraj',
 25.4453, 81.8461, TRUE, TRUE, '07:30', '23:00', 4.0, 89),

('30000000-0000-0000-0000-000000000038', demo_vendor_id, chowk_id, street_id,
 'Ram Lal Ji Ka Kachori Samosa', 'ram-lal-kachori-samosa',
 'Pull over wherever you are — their crispy samosas and khasta kachori are worth it. Made fresh every hour.',
 '9415038028', '9415038028', 'Kachehri Chowk, Old City, Prayagraj',
 25.4463, 81.8454, TRUE, TRUE, '07:00', '14:00', 4.8, 987),

('30000000-0000-0000-0000-000000000039', demo_vendor_id, chowk_id, restaurant_id,
 'Hotel Prayag Classic', 'hotel-prayag-classic',
 'Budget thali restaurant popular with shopkeepers and office staff. Unlimited rajma-rice and seasonal sabzi. Clean, fast service.',
 '9415039029', '9415039029', 'Main Chowk Road, Prayagraj',
 25.4458, 81.8468, TRUE, TRUE, '11:00', '22:00', 3.9, 234),

('30000000-0000-0000-0000-000000000040', demo_vendor_id, chowk_id, fashion_id,
 'Fancy Saree Centre', 'fancy-saree-centre',
 'Banarasi, Chanderi, Georgette, and printed cotton sarees. Wholesale and retail. Embroidery work done in-house.',
 '9415040030', '9415040030', 'Saree Market Lane, Chowk, Prayagraj',
 25.4446, 81.8478, TRUE, TRUE, '10:00', '21:00', 4.3, 302),

('30000000-0000-0000-0000-000000000041', demo_vendor_id, chowk_id, pharmacy_id,
 'Gulshan Medical Hall', 'gulshan-medical-hall',
 'Trusted pharmacy in Chowk since 1988. Allopathy and Ayurvedic medicines. Free blood pressure check.',
 '9415041031', '9415041031', 'Dharma Tala, Chowk, Prayagraj',
 25.4450, 81.8465, TRUE, TRUE, '08:00', '22:00', 4.1, 112),

('30000000-0000-0000-0000-000000000042', demo_vendor_id, chowk_id, sweet_id,
 'Anand Sweets Corner', 'anand-sweets-corner',
 'Budget sweets shop. Kaju katli, motichoor laddoo, and chakki ki barfi at prices that haven''t changed in years.',
 '9415042032', '9415042032', 'Chowk Bazar, Prayagraj',
 25.4462, 81.8456, TRUE, TRUE, '08:00', '21:00', 4.2, 198),

('30000000-0000-0000-0000-000000000043', demo_vendor_id, chowk_id, street_id,
 'Mohan Lal Namkeen Wala', 'mohan-lal-namkeen',
 'Hand-fried namkeen and chaklis made fresh daily. Their masala peanuts and mathri are the city''s best kept secret.',
 '9415043033', '9415043033', 'Chowk Footpath, Prayagraj',
 25.4454, 81.8459, TRUE, TRUE, '10:00', '20:00', 4.6, 445),

('30000000-0000-0000-0000-000000000044', demo_vendor_id, chowk_id, grocery_id,
 'Vijay Departmental Store', 'vijay-departmental-chowk',
 'Complete household store. Detergents, staples, oils, and snacks. Home delivery to nearby colonies. Open till late.',
 '9415044034', '9415044034', 'Sadar Bazar Lane, Chowk, Prayagraj',
 25.4447, 81.8472, TRUE, TRUE, '07:30', '22:30', 3.8, 65),

('30000000-0000-0000-0000-000000000045', demo_vendor_id, chowk_id, salon_id,
 'City Salon Chowk', 'city-salon-chowk',
 'Men''s haircut, shave, and massage. Old-school barber shop with decades of loyal customers. ₹50 haircut included.',
 '9415045035', '9415045035', 'Chowk Market, Prayagraj',
 25.4460, 81.8470, TRUE, TRUE, '09:00', '21:00', 4.0, 88),

('30000000-0000-0000-0000-000000000046', demo_vendor_id, chowk_id, restaurant_id,
 'The Mughal Darbar', 'mughal-darbar-chowk',
 'Authentic Lucknawi cuisine. Dum biryani cooked overnight, kakori kebabs, and sheer korma. Feels like nawabi dining on a budget.',
 '9415046036', '9415046036', 'Near Chowk Police Station, Prayagraj',
 25.4457, 81.8475, TRUE, TRUE, '12:00', '23:00', 4.5, 389),

('30000000-0000-0000-0000-000000000047', demo_vendor_id, chowk_id, street_id,
 'Ramesh Cold Drinks & Juice Corner', 'ramesh-cold-drinks',
 'Seasonal sugarcane juice, fresh orange, and kala khatta. Their nimbu sharbat is legendary in summers. Open since 1970.',
 '9415047037', '9415047037', 'Chowk Chauraha, Prayagraj',
 25.4464, 81.8453, TRUE, TRUE, '09:00', '21:00', 4.4, 512),

('30000000-0000-0000-0000-000000000048', demo_vendor_id, chowk_id, cafe_id,
 'Chai Pe Charcha', 'chai-pe-charcha-chowk',
 'Kullad chai and local gossip. Twelve varieties of chai including masala, ginger, saffron, and iced rose tea.',
 '9415048038', '9415048038', 'Dharma Tala Chowk, Prayagraj',
 25.4449, 81.8462, TRUE, TRUE, '06:00', '23:00', 4.5, 734),

-- ── KATRA MARKET (18 shops) ────────────────────────────────────────

('30000000-0000-0000-0000-000000000049', demo_vendor_id, katra_id, sweet_id,
 'Manohar Das Sweets', 'manohar-das-sweets',
 'Prayagraj sweet royalty. Their khurchan, imarti, and milk cake are unlike anywhere else. Family recipe since 1934.',
 '9415049039', '9415049039', 'Katra Main Road, Prayagraj',
 25.4420, 81.8517, TRUE, TRUE, '07:00', '21:30', 4.9, 1876),

('30000000-0000-0000-0000-000000000050', demo_vendor_id, katra_id, sweet_id,
 'Mathura Wale Misthan', 'mathura-wale-misthan',
 'Famous for pedha brought fresh from Mathura and locally made rabri jalebi. A pilgrimage stop for sweet lovers.',
 '9415050040', '9415050040', 'Katra Bazar, Prayagraj',
 25.4416, 81.8521, TRUE, TRUE, '08:00', '21:00', 4.7, 645),

('30000000-0000-0000-0000-000000000051', demo_vendor_id, katra_id, restaurant_id,
 'Zaika-e-Awadh', 'zaika-e-awadh-katra',
 'Slow-cooked dum dishes in Awadhi tradition. Their paya soup and mutton nihari draw loyalists every Sunday morning.',
 '9415051041', '9415051041', 'Katra Market Road, Prayagraj',
 25.4418, 81.8514, TRUE, TRUE, '07:00', '23:00', 4.6, 478),

('30000000-0000-0000-0000-000000000052', demo_vendor_id, katra_id, street_id,
 'Ram Ji Ke Chole Bhature', 'ram-ji-chole-bhature',
 'Fluffy bhature and perfectly spiced chole. Open only till 2pm — always a queue. Breakfast institution since 1962.',
 '9415052042', '9415052042', 'Near Katra Chauraha, Prayagraj',
 25.4423, 81.8509, TRUE, TRUE, '07:00', '14:00', 4.8, 1234),

('30000000-0000-0000-0000-000000000053', demo_vendor_id, katra_id, fashion_id,
 'Utsav Fashion House', 'utsav-fashion-katra',
 'Lehengas, bridal wear, and festive salwar suits. Custom stitching with embroidery in 10 days. Bridal consultations by appointment.',
 '9415053043', '9415053043', 'Katra Fabric Market, Prayagraj',
 25.4413, 81.8526, TRUE, TRUE, '10:30', '20:30', 4.3, 201),

('30000000-0000-0000-0000-000000000054', demo_vendor_id, katra_id, fashion_id,
 'Katra Fabric World', 'katra-fabric-world',
 'Wholesale and retail fabrics. Georgette, silk, cotton, net. Tailors recommended nearby. Biggest selection in old city.',
 '9415054044', '9415054044', 'Katra Kapda Market, Prayagraj',
 25.4410, 81.8530, TRUE, TRUE, '10:00', '21:00', 4.1, 134),

('30000000-0000-0000-0000-000000000055', demo_vendor_id, katra_id, pharmacy_id,
 'Surendra Medical Store', 'surendra-medical-katra',
 'Complete pharmacy catering to old city. Surgical supplies, baby products, and diagnostic strips always in stock.',
 '9415055045', '9415055045', 'Katra Chowk, Prayagraj',
 25.4419, 81.8511, TRUE, TRUE, '08:00', '21:30', 4.2, 93),

('30000000-0000-0000-0000-000000000056', demo_vendor_id, katra_id, salon_id,
 'Shri Ram Unisex Salon', 'shri-ram-salon-katra',
 'Quality hair service at old city prices. Popular with students and working folk. Expert in straightening and rebonding.',
 '9415056046', '9415056046', 'Katra Market, Prayagraj',
 25.4421, 81.8519, TRUE, TRUE, '09:00', '20:30', 4.0, 126),

('30000000-0000-0000-0000-000000000057', demo_vendor_id, katra_id, grocery_id,
 'Puja Departmental Store', 'puja-departmental-katra',
 'Household essential stop in Katra. Full stock of oils, pulses, atta, and local snacks. Known for fair weighing.',
 '9415057047', '9415057047', 'Lane 2, Katra Bazar, Prayagraj',
 25.4415, 81.8523, TRUE, TRUE, '07:00', '22:00', 4.0, 55),

('30000000-0000-0000-0000-000000000058', demo_vendor_id, katra_id, sweet_id,
 'Balaji Sweet Corner', 'balaji-sweet-corner-katra',
 'Street-level sweet kiosk. Quick gulab jamun, jalebi, and halwa for ₹20–₹40. Always fresh, always hot.',
 '9415058048', '9415058048', 'Katra Bazar Footpath, Prayagraj',
 25.4424, 81.8507, TRUE, TRUE, '08:00', '21:00', 4.4, 312),

('30000000-0000-0000-0000-000000000059', demo_vendor_id, katra_id, restaurant_id,
 'Desi Rasoi', 'desi-rasoi-katra',
 'Homestyle UP meals. Dal makhani, kadhi, aloo gobhi, and fresh rotis. Lunch tiffin service to nearby offices.',
 '9415059049', '9415059049', 'Katra, Prayagraj',
 25.4417, 81.8516, TRUE, TRUE, '10:00', '21:30', 4.2, 198),

('30000000-0000-0000-0000-000000000060', demo_vendor_id, katra_id, street_id,
 'The Paratha House Katra', 'paratha-house-katra',
 'Ten stuffed paratha varieties including aloo, gobhi, mooli, onion, and paneer. Served with fresh curd and pickle. ₹25 each.',
 '9415060050', '9415060050', 'Near Katra Gate, Prayagraj',
 25.4411, 81.8527, TRUE, TRUE, '07:00', '14:30', 4.5, 567),

('30000000-0000-0000-0000-000000000061', demo_vendor_id, katra_id, pharmacy_id,
 'Sameer Medical Hall', 'sameer-medical-katra',
 'Neighbourhood pharmacy. Generic and branded medicines. Medical test strip refills. Night delivery on WhatsApp.',
 '9415061051', '9415061051', 'Katra Chowrasta, Prayagraj',
 25.4414, 81.8524, TRUE, TRUE, '08:30', '22:00', 3.9, 67),

('30000000-0000-0000-0000-000000000062', demo_vendor_id, katra_id, cafe_id,
 'Noorani Chai House', 'noorani-chai-house-katra',
 'Midnight chai for night owls and early risers. Doodh patti, irani chai, and bun maska. Open until 2am on weekends.',
 '9415062052', '9415062052', 'Katra Main Road, Prayagraj',
 25.4426, 81.8505, TRUE, TRUE, '05:30', '02:00', 4.6, 788),

('30000000-0000-0000-0000-000000000063', demo_vendor_id, katra_id, fashion_id,
 'Ritu Boutique', 'ritu-boutique-katra',
 'Designer blouses, ready-made salwar suits, and custom embroidery. Ladies'' boutique with fitting room. Walk-ins welcome.',
 '9415063053', '9415063053', 'Katra Bazar, Prayagraj',
 25.4412, 81.8528, TRUE, TRUE, '10:00', '20:00', 4.2, 87),

('30000000-0000-0000-0000-000000000064', demo_vendor_id, katra_id, restaurant_id,
 'Hotel Allahabad Nawab', 'hotel-allahabad-nawab',
 'Full-service restaurant with AC. Biryani, shahi paneer, and firni. Popular for group dinners and small functions.',
 '9415064054', '9415064054', 'Katra Road, Prayagraj',
 25.4422, 81.8512, TRUE, TRUE, '11:00', '23:00', 4.1, 234),

('30000000-0000-0000-0000-000000000065', demo_vendor_id, katra_id, grocery_id,
 'Classic Grocery Katra', 'classic-grocery-katra',
 'Fresh produce delivered from Naini Mandi daily. Vegetables, fruits, and packaged goods. Students get a loyalty card.',
 '9415065055', '9415065055', 'Lane 9, Katra Market, Prayagraj',
 25.4425, 81.8506, TRUE, TRUE, '07:00', '21:30', 4.1, 72),

('30000000-0000-0000-0000-000000000066', demo_vendor_id, katra_id, street_id,
 'Idli Wala Katra', 'idli-wala-katra',
 'South Indian breakfast in the old city. Soft idli, crispy vada, and coconut chutney. Opens at 6am and closes when sold out.',
 '9415066056', '9415066056', 'Katra Footpath, Prayagraj',
 25.4427, 81.8508, TRUE, TRUE, '06:00', '11:30', 4.7, 423),

-- ── RAMBAGH (18 shops) ─────────────────────────────────────────────

('30000000-0000-0000-0000-000000000067', demo_vendor_id, rambagh_id, sweet_id,
 'Haldiram''s Rambagh', 'haldirams-rambagh',
 'Branded sweets, namkeens, and snacks. Full range of Haldiram''s products. Also serves chaat, dosa, and thali in the dining area.',
 '9415067057', '9415067057', 'Rambagh Main Road, Prayagraj',
 25.4325, 81.8632, TRUE, TRUE, '09:00', '22:00', 4.4, 654),

('30000000-0000-0000-0000-000000000068', demo_vendor_id, rambagh_id, salon_id,
 'Jawed Habib Rambagh', 'jawed-habib-rambagh',
 'Professional haircuts, colour, and spa services. Trained Jawed Habib Academy stylists. Book online or walk in.',
 '9415068058', '9415068058', 'Rambagh Colony, Prayagraj',
 25.4318, 81.8637, TRUE, TRUE, '10:00', '20:00', 4.3, 245),

('30000000-0000-0000-0000-000000000069', demo_vendor_id, rambagh_id, grocery_id,
 'More Supermarket Rambagh', 'more-supermarket-rambagh',
 'Aditya Birla More retail chain. Fresh produce, dairy, packaged goods, and toiletries. Points card for regular shoppers.',
 '9415069059', '9415069059', 'Rambagh Road, Prayagraj',
 25.4332, 81.8625, TRUE, TRUE, '09:00', '21:00', 4.0, 312),

('30000000-0000-0000-0000-000000000070', demo_vendor_id, rambagh_id, pharmacy_id,
 'Life Care Pharmacy Rambagh', 'life-care-pharmacy-rambagh',
 'Well-stocked neighbourhood pharmacy. Diabetic supplies, baby nutrition, and homeopathic medicines. Senior discount 10%.',
 '9415070060', '9415070060', 'Rambagh Colony, Prayagraj',
 25.4321, 81.8630, TRUE, TRUE, '08:00', '22:00', 4.2, 156),

('30000000-0000-0000-0000-000000000071', demo_vendor_id, rambagh_id, cafe_id,
 'Mango Cafe Rambagh', 'mango-cafe-rambagh',
 'Cosy neighbourhood cafe. Mango smoothies, cold brews, and paninis. Kids corner, board games, and weekly quiz nights.',
 '9415071061', '9415071061', '12 Rambagh Colony, Prayagraj',
 25.4328, 81.8620, TRUE, TRUE, '09:00', '22:00', 4.4, 387),

('30000000-0000-0000-0000-000000000072', demo_vendor_id, rambagh_id, restaurant_id,
 'Sangam Restaurant', 'sangam-restaurant-rambagh',
 'Prayagraj''s heritage veg restaurant. Traditional thali, kadhi-chawal, and Indian sweets. Open since 1967. No alcohol served.',
 '9415072062', '9415072062', 'Rambagh Main Chowk, Prayagraj',
 25.4315, 81.8642, TRUE, TRUE, '11:00', '22:00', 4.5, 521),

('30000000-0000-0000-0000-000000000073', demo_vendor_id, rambagh_id, restaurant_id,
 'Dosa Plaza Rambagh', 'dosa-plaza-rambagh',
 'Forty varieties of dosa made fresh to order. Paper, masala, paneer, cheese, and fusion dosas. Uttapam and idli too.',
 '9415073063', '9415073063', 'Rambagh Colony Road, Prayagraj',
 25.4324, 81.8628, TRUE, TRUE, '08:00', '21:30', 4.1, 189),

('30000000-0000-0000-0000-000000000074', demo_vendor_id, rambagh_id, fashion_id,
 'Cotton Casuals Rambagh', 'cotton-casuals-rambagh',
 'Comfortable everyday cotton wear for men and women. Linen shirts, printed kurtas, and cotton trousers. Affordable and breathable.',
 '9415074064', '9415074064', 'Rambagh Market, Prayagraj',
 25.4319, 81.8635, TRUE, TRUE, '10:30', '20:30', 4.0, 97),

('30000000-0000-0000-0000-000000000075', demo_vendor_id, rambagh_id, sweet_id,
 'Om Prakash Mithai', 'om-prakash-mithai-rambagh',
 'Local favourite for decades. Malai sandwich, kalakand, and khoya barfi. Also makes wedding laddoos on bulk order.',
 '9415075065', '9415075065', 'Rambagh Colony, Prayagraj',
 25.4327, 81.8621, TRUE, TRUE, '08:00', '21:00', 4.6, 392),

('30000000-0000-0000-0000-000000000076', demo_vendor_id, rambagh_id, pharmacy_id,
 'Medical Plus Rambagh', 'medical-plus-rambagh',
 'Doctor''s prescriptions filled quickly. BP monitor on free use. Wellness supplements and skincare products stocked.',
 '9415076066', '9415076066', 'Near Rambagh Market, Prayagraj',
 25.4316, 81.8641, TRUE, TRUE, '08:30', '22:00', 4.1, 102),

('30000000-0000-0000-0000-000000000077', demo_vendor_id, rambagh_id, grocery_id,
 'Patel Bros Grocery', 'patel-bros-grocery-rambagh',
 'Family grocery run by three brothers. Best prices on staples. Local sourcing for vegetables. WhatsApp order and delivery.',
 '9415077067', '9415077067', 'Rambagh Lane 3, Prayagraj',
 25.4333, 81.8624, TRUE, TRUE, '07:00', '22:00', 4.3, 84),

('30000000-0000-0000-0000-000000000078', demo_vendor_id, rambagh_id, street_id,
 'Paratha Club Rambagh', 'paratha-club-rambagh',
 'Breakfast stop for the entire colony. Stuffed parathas with makhan and their own special achaar. Lassi always chilled.',
 '9415078068', '9415078068', 'Rambagh Chowk, Prayagraj',
 25.4320, 81.8633, TRUE, TRUE, '06:30', '11:30', 4.6, 456),

('30000000-0000-0000-0000-000000000079', demo_vendor_id, rambagh_id, salon_id,
 'Wellness Salon Rambagh', 'wellness-salon-rambagh',
 'Ladies salon. Trusted for threading, waxing, and pre-bridal packages. Book early for Sunday appointments.',
 '9415079069', '9415079069', 'Rambagh Colony Main Road, Prayagraj',
 25.4323, 81.8627, TRUE, TRUE, '09:30', '20:00', 4.2, 134),

('30000000-0000-0000-0000-000000000080', demo_vendor_id, rambagh_id, restaurant_id,
 'Pizza Port Rambagh', 'pizza-port-rambagh',
 'Local pizza brand. Thin crust, extra toppings, and a spicy Indian twist. Reliable delivery within 3km. Meal deals on weekdays.',
 '9415080070', '9415080070', 'Rambagh Market Road, Prayagraj',
 25.4330, 81.8618, TRUE, TRUE, '11:00', '23:00', 3.9, 212),

('30000000-0000-0000-0000-000000000081', demo_vendor_id, rambagh_id, cafe_id,
 'Filter Coffee House Rambagh', 'filter-coffee-rambagh',
 'Madras-style filter coffee and light South Indian snacks. Loved by early risers. Their rose milk is a sleeper hit.',
 '9415081071', '9415081071', '8 Rambagh Colony, Prayagraj',
 25.4326, 81.8622, TRUE, TRUE, '07:00', '21:00', 4.3, 267),

('30000000-0000-0000-0000-000000000082', demo_vendor_id, rambagh_id, grocery_id,
 'Balaji General Store', 'balaji-general-rambagh',
 'Corner store staple. Milk, bread, eggs, and everyday provisions. Open early and stays open late. Quick neighbourhood stop.',
 '9415082072', '9415082072', 'Corner of Rambagh Lane 5, Prayagraj',
 25.4317, 81.8639, TRUE, TRUE, '06:30', '22:30', 3.9, 48),

('30000000-0000-0000-0000-000000000083', demo_vendor_id, rambagh_id, sweet_id,
 'Rambagh Halwai', 'rambagh-halwai',
 'Home-style sweets made in small batches. Besan laddoo, coconut barfi, and shakkar pare. Made fresh every alternate day.',
 '9415083073', '9415083073', 'Rambagh Colony, Prayagraj',
 25.4329, 81.8619, TRUE, TRUE, '09:00', '20:30', 4.4, 178),

-- ── JHALWA (13 shops) ──────────────────────────────────────────────

('30000000-0000-0000-0000-000000000084', demo_vendor_id, jhalwa_id, cafe_id,
 'Campus Cafe Jhalwa', 'campus-cafe-jhalwa',
 'Students'' hangout near university. Budget meals, fast wifi, board games, and exam snack combos. Open till midnight.',
 '9415084074', '9415084074', 'Near Motilal Nehru NIT Campus, Jhalwa, Prayagraj',
 25.3902, 81.8588, TRUE, TRUE, '08:00', '00:00', 4.4, 789),

('30000000-0000-0000-0000-000000000085', demo_vendor_id, jhalwa_id, restaurant_id,
 'Domino''s Pizza Jhalwa', 'dominos-jhalwa',
 'Domino''s franchise. Standard menu with India-specific options. 30-minute delivery. Student discounts with ID.',
 '9415085075', '9415085075', 'Jhalwa Main Road, Prayagraj',
 25.3888, 81.8601, TRUE, TRUE, '11:00', '23:00', 4.0, 421),

('30000000-0000-0000-0000-000000000086', demo_vendor_id, jhalwa_id, cafe_id,
 'Study Zone Cafe', 'study-zone-cafe-jhalwa',
 'Dedicated study cafe. Cubicle seating, no-noise policy, printing, and free refills on coffee. Exam season favourite.',
 '9415086076', '9415086076', 'University Road, Jhalwa, Prayagraj',
 25.3911, 81.8579, TRUE, TRUE, '08:00', '22:00', 4.3, 342),

('30000000-0000-0000-0000-000000000087', demo_vendor_id, jhalwa_id, grocery_id,
 'Reliance Smart Jhalwa', 'reliance-smart-jhalwa',
 'Reliance chain supermarket. Wide variety of groceries, personal care, and household goods. Loyalty points program.',
 '9415087077', '9415087077', 'Jhalwa Commercial Zone, Prayagraj',
 25.3884, 81.8607, TRUE, TRUE, '09:00', '21:00', 4.1, 287),

('30000000-0000-0000-0000-000000000088', demo_vendor_id, jhalwa_id, pharmacy_id,
 'Green Cross Pharmacy Jhalwa', 'green-cross-pharmacy-jhalwa',
 'Modern pharmacy near the university belt. Generic medicine catalogue available. 15% off on student prescriptions.',
 '9415088078', '9415088078', 'University Colony, Jhalwa, Prayagraj',
 25.3896, 81.8594, TRUE, TRUE, '08:00', '21:30', 4.2, 134),

('30000000-0000-0000-0000-000000000089', demo_vendor_id, jhalwa_id, salon_id,
 'Scissors Edge Salon', 'scissors-edge-jhalwa',
 'Youth-oriented salon. Fade cuts, highlights, and beard styling. Instagram-trained stylists. Walk-in only.',
 '9415089079', '9415089079', 'Near NIT Gate, Jhalwa, Prayagraj',
 25.3905, 81.8583, TRUE, TRUE, '10:00', '20:00', 4.3, 167),

('30000000-0000-0000-0000-000000000090', demo_vendor_id, jhalwa_id, restaurant_id,
 'Student Dhaba Jhalwa', 'student-dhaba-jhalwa',
 'Full meal under ₹80. Dal, sabzi, roti, rice, and salad. Hostel students'' lifeline. No delivery — eat-in only.',
 '9415090080', '9415090080', 'University Area, Jhalwa, Prayagraj',
 25.3880, 81.8613, TRUE, TRUE, '07:30', '22:30', 4.2, 612),

('30000000-0000-0000-0000-000000000091', demo_vendor_id, jhalwa_id, restaurant_id,
 'Mama''s Kitchen', 'mamas-kitchen-jhalwa',
 'Home-cooked feel in a small restaurant. Seasonal home-style food. Rolling menu changes daily. No WhatsApp delivery — too small!',
 '9415091081', '9415091081', 'Jhalwa Colony Lane, Prayagraj',
 25.3917, 81.8572, TRUE, TRUE, '11:00', '21:00', 4.7, 298),

('30000000-0000-0000-0000-000000000092', demo_vendor_id, jhalwa_id, grocery_id,
 'Sasta Bazar Jhalwa', 'sasta-bazar-jhalwa',
 'Budget grocery for students and families. Staples, noodles, biscuits, and toiletries. Weekly vegetable stall outside.',
 '9415092082', '9415092082', 'Jhalwa Main Market, Prayagraj',
 25.3886, 81.8605, TRUE, TRUE, '08:00', '22:00', 3.8, 73),

('30000000-0000-0000-0000-000000000093', demo_vendor_id, jhalwa_id, street_id,
 'Momos Hub Jhalwa', 'momos-hub-jhalwa',
 'Steamed, fried, and tandoori momos. Twelve fillings including chicken, paneer, and cheese corn. Open late for night cravings.',
 '9415093083', '9415093083', 'Near University Gate 2, Jhalwa, Prayagraj',
 25.3908, 81.8580, TRUE, TRUE, '15:00', '00:00', 4.6, 891),

('30000000-0000-0000-0000-000000000094', demo_vendor_id, jhalwa_id, cafe_id,
 'Night Owl Cafe', 'night-owl-cafe-jhalwa',
 'Open till 2am. Coffee, cold drinks, sandwiches, and maggi. The only place open after 11pm in Jhalwa. A lifesaver.',
 '9415094084', '9415094084', 'Jhalwa, Prayagraj',
 25.3893, 81.8597, TRUE, TRUE, '12:00', '02:00', 4.5, 556),

('30000000-0000-0000-0000-000000000095', demo_vendor_id, jhalwa_id, pharmacy_id,
 'Amar Medical Store Jhalwa', 'amar-medical-jhalwa',
 'Open early and closes late. Fast-moving medicines, ORS, paracetamol, and vitamins always in stock.',
 '9415095085', '9415095085', 'Jhalwa Colony, Prayagraj',
 25.3876, 81.8618, TRUE, TRUE, '08:00', '23:00', 4.0, 88),

('30000000-0000-0000-0000-000000000096', demo_vendor_id, jhalwa_id, street_id,
 'Metro Fast Food Corner', 'metro-fast-food-jhalwa',
 'Roll counter with egg, paneer, and chicken options. Also serves bhurji pav and masala chai. Budget-friendly, open till midnight.',
 '9415096086', '9415096086', 'Jhalwa Chowk, Prayagraj',
 25.3899, 81.8590, TRUE, TRUE, '14:00', '00:00', 4.3, 445),

-- ── ALLAHPUR (13 shops) ────────────────────────────────────────────

('30000000-0000-0000-0000-000000000097', demo_vendor_id, allahpur_id, restaurant_id,
 'Spice Garden Allahpur', 'spice-garden-allahpur',
 'Family restaurant with North Indian and Chinese fusion menu. Great paneer tikka masala and chilli chicken. Takeaway available.',
 '9415097087', '9415097087', 'Allahpur Main Road, Prayagraj',
 25.4228, 81.8687, TRUE, TRUE, '12:00', '22:30', 4.2, 287),

('30000000-0000-0000-0000-000000000098', demo_vendor_id, allahpur_id, restaurant_id,
 'Suruchi Veg Dhaba', 'suruchi-veg-dhaba-allahpur',
 'Pure vegetarian. Known for their boondi raita, lauki kofta, and seasonal specials. Preferred by families for Sunday lunch.',
 '9415098088', '9415098088', 'Allahpur Colony, Prayagraj',
 25.4215, 81.8695, TRUE, TRUE, '11:00', '22:00', 4.5, 412),

('30000000-0000-0000-0000-000000000099', demo_vendor_id, allahpur_id, street_id,
 'Prayag Chaat Corner', 'prayag-chaat-allahpur',
 'Evening chaat institution. Bhel puri, dahi papdi, sev puri, and aloo tikki. Generous portions and proper tamarind chutney.',
 '9415099089', '9415099089', 'Allahpur Chowk, Prayagraj',
 25.4231, 81.8682, TRUE, TRUE, '16:00', '21:30', 4.7, 623),

('30000000-0000-0000-0000-000000000100', demo_vendor_id, allahpur_id, salon_id,
 'YLG Salon Allahpur', 'ylg-salon-allahpur',
 'South Indian chain. Known for affordable haircuts, clean interiors, and consistent service. Both men''s and women''s services.',
 '9415100090', '9415100090', 'Allahpur Main Market, Prayagraj',
 25.4221, 81.8691, TRUE, TRUE, '10:00', '20:00', 4.1, 198),

('30000000-0000-0000-0000-000000000101', demo_vendor_id, allahpur_id, fashion_id,
 'W for Woman Allahpur', 'w-for-woman-allahpur',
 'Stylish contemporary Indian wear. Kurtis, palazzos, and co-ord sets. Everyday and festive collections. Great fitting room.',
 '9415101091', '9415101091', 'Allahpur Shopping Area, Prayagraj',
 25.4218, 81.8697, TRUE, TRUE, '10:30', '20:30', 4.0, 112),

('30000000-0000-0000-0000-000000000102', demo_vendor_id, allahpur_id, sweet_id,
 'Annapurna Sweets Allahpur', 'annapurna-sweets-allahpur',
 'Morning sweets and fresh prasad. Peda, churma laddoo, and sattu laddoo. Popular with temple-goers in the morning.',
 '9415102092', '9415102092', 'Near Hanuman Mandir, Allahpur, Prayagraj',
 25.4234, 81.8679, TRUE, TRUE, '07:00', '21:00', 4.4, 267),

('30000000-0000-0000-0000-000000000103', demo_vendor_id, allahpur_id, pharmacy_id,
 'MedPlus Allahpur', 'medplus-allahpur',
 'Chain pharmacy. Lab test booking, medicine subscription, and home delivery over ₹500. Senior citizen discount 10%.',
 '9415103093', '9415103093', 'Allahpur Colony Road, Prayagraj',
 25.4209, 81.8703, TRUE, TRUE, '08:00', '21:30', 4.2, 156),

('30000000-0000-0000-0000-000000000104', demo_vendor_id, allahpur_id, grocery_id,
 'City Mart Allahpur', 'city-mart-allahpur',
 'Neighbourhood supermarket. Fresh bread daily, imported cheese, and good organic section. Weekly discount flyer on WhatsApp.',
 '9415104094', '9415104094', 'Allahpur Main Road, Prayagraj',
 25.4225, 81.8688, TRUE, TRUE, '08:30', '21:30', 4.0, 145),

('30000000-0000-0000-0000-000000000105', demo_vendor_id, allahpur_id, street_id,
 'Street Samosa Allahpur', 'street-samosa-allahpur',
 'The samosa is hand-crimped, potato filling with proper jeera and aamchur. ₹8 each. Gets a crowd by 5pm every day.',
 '9415105095', '9415105095', 'Allahpur Chowk, Prayagraj',
 25.4236, 81.8677, TRUE, TRUE, '15:00', '21:00', 4.8, 765),

('30000000-0000-0000-0000-000000000106', demo_vendor_id, allahpur_id, cafe_id,
 'The Chai Stop', 'chai-stop-allahpur',
 'Neighbourhood chai stall elevated to cafe. Twenty chai varieties, lemon ginger soda, and egg sandwiches. Free refills on regular chai.',
 '9415106096', '9415106096', 'Allahpur Colony, Prayagraj',
 25.4212, 81.8700, TRUE, TRUE, '07:00', '23:00', 4.4, 498),

('30000000-0000-0000-0000-000000000107', demo_vendor_id, allahpur_id, sweet_id,
 'Vrindavan Sweets Allahpur', 'vrindavan-sweets-allahpur',
 'Festive season specialists. Panjeeri, churma, and modak available year round. Custom sweet hampers for gifting.',
 '9415107097', '9415107097', 'Allahpur Colony, Prayagraj',
 25.4222, 81.8690, TRUE, TRUE, '09:00', '21:00', 4.5, 312),

('30000000-0000-0000-0000-000000000108', demo_vendor_id, allahpur_id, grocery_id,
 'Agarwal Provisions', 'agarwal-provisions-allahpur',
 'Old-fashioned provisions store. Brass weights, real spices, and the personal service of a shop that knows your family.',
 '9415108098', '9415108098', 'Allahpur Lane 4, Prayagraj',
 25.4219, 81.8693, TRUE, TRUE, '07:30', '21:00', 4.3, 67),

('30000000-0000-0000-0000-000000000109', demo_vendor_id, allahpur_id, restaurant_id,
 'Mehfil Restaurant', 'mehfil-restaurant-allahpur',
 'Evening dining spot. Ghee roast mutton, roomali roti, and shahi korma. Indoor and rooftop seating. Sheesha also available.',
 '9415109099', '9415109099', 'Allahpur, Prayagraj',
 25.4207, 81.8706, TRUE, TRUE, '18:00', '00:00', 4.3, 378),

('30000000-0000-0000-0000-000000000110', demo_vendor_id, allahpur_id, fashion_id,
 'Manyavar Allahpur', 'manyavar-allahpur',
 'Men''s ethnic wear. Sherwanis, kurta sets, and Indo-western for weddings and celebrations. Tailoring adjustments included.',
 '9415110100', '9415110100', 'Allahpur Market, Prayagraj',
 25.4226, 81.8686, TRUE, TRUE, '10:30', '20:30', 4.2, 143)

ON CONFLICT (slug) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════
-- OFFERS (65 shops get active deals)
-- ══════════════════════════════════════════════════════════════════════

INSERT INTO offers (shop_id, title, description, discount_type, discount_value,
  original_price, offer_price, coupon_code, starts_at, ends_at, is_active, is_featured, tier)
VALUES

-- El Chico
('30000000-0000-0000-0000-000000000011',
 'Sizzler Combo — Flat ₹100 OFF', 'Any sizzler + a cold coffee for ₹100 off. Dine-in only.',
 'flat', 100, 499, 399, 'SIZZLER100', NOW(), NOW() + INTERVAL '5 days', TRUE, TRUE, 1),

-- Cafe Rendezvous
('30000000-0000-0000-0000-000000000012',
 'Buy 1 Get 1 — Coffee', 'Order any coffee, get a second one free. Valid 10am–12pm only.',
 'bogo', NULL, NULL, NULL, 'RENDEZVOUS', NOW(), NOW() + INTERVAL '3 days', TRUE, FALSE, 2),

-- Apollo Pharmacy
('30000000-0000-0000-0000-000000000013',
 '20% OFF on Generics', 'Flat 20% off on all generic medicines. No minimum order.',
 'percent', 20, NULL, NULL, 'APOLLO20', NOW(), NOW() + INTERVAL '30 days', TRUE, FALSE, 2),

-- Fabindia
('30000000-0000-0000-0000-000000000014',
 'Festive 15% OFF', 'Flat 15% off on all festive kurtas and handlooms.',
 'percent', 15, NULL, NULL, 'FESTIVE15', NOW(), NOW() + INTERVAL '7 days', TRUE, TRUE, 2),

-- Green Trends
('30000000-0000-0000-0000-000000000015',
 'New Customer — 40% OFF', 'First visit? Get 40% off on any service. Hair, skin, or threading.',
 'percent', 40, NULL, NULL, 'NEW40', NOW(), NOW() + INTERVAL '14 days', TRUE, TRUE, 1),

-- Nature Fresh
('30000000-0000-0000-0000-000000000016',
 'Free Home Delivery', 'Free delivery on orders above ₹500 within 2km.',
 'free', NULL, NULL, NULL, NULL, NOW(), NOW() + INTERVAL '60 days', TRUE, FALSE, 3),

-- Agarwal Sweets
('30000000-0000-0000-0000-000000000017',
 '25% OFF on Gift Boxes', 'Any sweet gift box above 500g gets 25% off. Perfect for festivals.',
 'percent', 25, NULL, NULL, 'GIFT25', NOW(), NOW() + INTERVAL '10 days', TRUE, TRUE, 1),

-- Chacha Ki Chaat
('30000000-0000-0000-0000-000000000018',
 'Combo Plate for ₹60', 'Dahi papdi + bhel + aloo tikki — all three for ₹60 only.',
 'flat', 60, NULL, NULL, NULL, NOW(), NOW() + INTERVAL '2 days', TRUE, FALSE, 1),

-- Jade Garden
('30000000-0000-0000-0000-000000000019',
 '15% OFF on Table Booking', 'Pre-book a table and get 15% off the bill. Weekdays only.',
 'percent', 15, NULL, NULL, 'TABLE15', NOW(), NOW() + INTERVAL '30 days', TRUE, FALSE, 2),

-- Brewhood Coffee
('30000000-0000-0000-0000-000000000027',
 'Morning Combo ₹99', 'Cold brew + avocado toast before 11am for just ₹99. Worth it.',
 'flat', 99, 180, 99, NULL, NOW(), NOW() + INTERVAL '7 days', TRUE, TRUE, 1),

-- Kesari Sweets
('30000000-0000-0000-0000-000000000026',
 'Buy 1kg Get 200g Free', 'Buy any 1kg of sweets and get 200g of besan laddoo free.',
 'bogo', NULL, NULL, NULL, NULL, NOW(), NOW() + INTERVAL '5 days', TRUE, FALSE, 2),

-- Shiv Chaat Bhandar
('30000000-0000-0000-0000-000000000031',
 'Chaat Thali ₹50', 'Full chaat thali — papdi, tikki, bhel — all for ₹50. Evening only.',
 'flat', 50, NULL, NULL, NULL, NOW(), NOW() + INTERVAL '1 day', TRUE, TRUE, 1),

-- Moti Mahal Sweets
('30000000-0000-0000-0000-000000000032',
 '30% OFF on Rabri', 'Flat 30% off on all rabri orders above 500g.',
 'percent', 30, NULL, NULL, 'RABRI30', NOW(), NOW() + INTERVAL '3 days', TRUE, FALSE, 1),

-- Pyarelal Misthan
('30000000-0000-0000-0000-000000000033',
 'Peda Box — Buy 2 Get 1', 'Buy 2 boxes of peda and get a third one free. Festival offer.',
 'bogo', NULL, NULL, NULL, NULL, NOW(), NOW() + INTERVAL '7 days', TRUE, FALSE, 2),

-- Lucky Restaurant Chowk
('30000000-0000-0000-0000-000000000034',
 'Mutton Thali ₹120', 'Full mutton thali with dal, roti, and chawal at ₹120. Lunch only.',
 'flat', 120, NULL, NULL, NULL, NOW(), NOW() + INTERVAL '30 days', TRUE, TRUE, 1),

-- Rekha Beauty Parlour
('30000000-0000-0000-0000-000000000036',
 'Bridal Package — 20% OFF', 'Pre-bridal full package at 20% off. Book one week in advance.',
 'percent', 20, NULL, NULL, 'BRIDE20', NOW() + INTERVAL '1 day', NOW() + INTERVAL '30 days', TRUE, FALSE, 2),

-- Ram Lal Ji Ka Kachori Samosa
('30000000-0000-0000-0000-000000000038',
 'Breakfast Combo ₹30', 'Kachori + samosa + chai — all for ₹30. Limited 100 plates daily.',
 'flat', 30, 55, 30, NULL, NOW(), NOW() + INTERVAL '1 day', TRUE, TRUE, 1),

-- The Mughal Darbar
('30000000-0000-0000-0000-000000000046',
 'Biryani Combo — Flat ₹80 OFF', 'Dum biryani + raita + sheer korma for ₹80 off. Dine-in only.',
 'flat', 80, NULL, NULL, 'NAWAB80', NOW(), NOW() + INTERVAL '5 days', TRUE, TRUE, 1),

-- Chai Pe Charcha
('30000000-0000-0000-0000-000000000048',
 'Unlimited Refills ₹30', 'Pay ₹30 and get unlimited chai refills for 2 hours. Sit and sip.',
 'flat', 30, NULL, NULL, NULL, NOW(), NOW() + INTERVAL '90 days', TRUE, FALSE, 3),

-- Manohar Das Sweets
('30000000-0000-0000-0000-000000000049',
 'Khurchan — 100g Free', 'Buy 500g khurchan and get 100g free. Legendary Katra offer.',
 'bogo', NULL, NULL, NULL, NULL, NOW(), NOW() + INTERVAL '3 days', TRUE, TRUE, 1),

-- Mathura Wale Misthan
('30000000-0000-0000-0000-000000000050',
 '20% OFF Peda Orders', '20% off on any peda order above 500g. Ship to family too.',
 'percent', 20, NULL, NULL, 'PEDA20', NOW(), NOW() + INTERVAL '5 days', TRUE, FALSE, 2),

-- Zaika-e-Awadh
('30000000-0000-0000-0000-000000000051',
 'Sunday Nihari — ₹50 OFF', 'Mutton nihari + sheermal for ₹50 off. Sunday mornings only.',
 'flat', 50, NULL, NULL, NULL, NOW(), NOW() + INTERVAL '7 days', TRUE, FALSE, 2),

-- Ram Ji Ke Chole Bhature
('30000000-0000-0000-0000-000000000052',
 'Double Plate ₹40', 'Extra large chole bhature — double portion for just ₹40.',
 'flat', 40, 70, 40, NULL, NOW(), NOW() + INTERVAL '30 days', TRUE, TRUE, 1),

-- Utsav Fashion House
('30000000-0000-0000-0000-000000000053',
 'Bridal Lehenga — 25% OFF', '25% off on all bridal lehenga orders above ₹3000.',
 'percent', 25, NULL, NULL, 'BRIDE25', NOW(), NOW() + INTERVAL '15 days', TRUE, TRUE, 1),

-- Katra Fabric World
('30000000-0000-0000-0000-000000000054',
 'Bulk Discount — 5m+', 'Buy 5 metres or more of any fabric and get ₹50 off per metre.',
 'flat', 250, NULL, NULL, NULL, NOW(), NOW() + INTERVAL '30 days', TRUE, FALSE, 2),

-- Shri Ram Salon
('30000000-0000-0000-0000-000000000056',
 'Haircut + Trim ₹80', 'Men''s haircut with beard trim for just ₹80. Walk-in only.',
 'flat', 80, 130, 80, NULL, NOW(), NOW() + INTERVAL '30 days', TRUE, FALSE, 3),

-- Balaji Sweet Corner
('30000000-0000-0000-0000-000000000058',
 'Jalebi Morning Special', 'Fresh hot jalebi for ₹10 per 100g between 8–10am only.',
 'flat', 10, NULL, NULL, NULL, NOW(), NOW() + INTERVAL '30 days', TRUE, FALSE, 3),

-- The Paratha House Katra
('30000000-0000-0000-0000-000000000060',
 'Full Breakfast ₹60', 'Two stuffed parathas + curd + pickle for ₹60. Most filling deal in Katra.',
 'flat', 60, 90, 60, NULL, NOW(), NOW() + INTERVAL '30 days', TRUE, TRUE, 1),

-- Noorani Chai House
('30000000-0000-0000-0000-000000000062',
 'Midnight Irani Combo', 'Irani chai + bun maska after 11pm for ₹30. Night owl discount.',
 'flat', 30, 55, 30, NULL, NOW(), NOW() + INTERVAL '60 days', TRUE, FALSE, 2),

-- Idli Wala Katra
('30000000-0000-0000-0000-000000000066',
 'Breakfast Plate ₹35', 'Two idlis + vada + sambar + chutney for ₹35. First 50 customers only.',
 'flat', 35, 60, 35, NULL, NOW(), NOW() + INTERVAL '30 days', TRUE, TRUE, 1),

-- Haldiram''s Rambagh
('30000000-0000-0000-0000-000000000067',
 'Namkeen Saver Pack', 'Buy any 2 Haldiram''s 400g packs and get 1 pack of bhujia free.',
 'bogo', NULL, NULL, NULL, NULL, NOW(), NOW() + INTERVAL '14 days', TRUE, FALSE, 2),

-- Jawed Habib Rambagh
('30000000-0000-0000-0000-000000000068',
 'Hair Spa — ₹200 OFF', 'Any hair spa treatment gets ₹200 off. First-time customers only.',
 'flat', 200, NULL, NULL, 'SPA200', NOW(), NOW() + INTERVAL '21 days', TRUE, TRUE, 1),

-- More Supermarket
('30000000-0000-0000-0000-000000000069',
 '10% Cashback on ₹500+', 'Shop for ₹500 or more and earn 10% cashback in More points.',
 'percent', 10, NULL, NULL, NULL, NOW(), NOW() + INTERVAL '30 days', TRUE, FALSE, 3),

-- Mango Cafe Rambagh
('30000000-0000-0000-0000-000000000071',
 'Quiz Night Special', 'Free dessert for quiz night participants every Thursday.',
 'free', NULL, NULL, NULL, NULL, NOW(), NOW() + INTERVAL '90 days', TRUE, FALSE, 3),

-- Sangam Restaurant
('30000000-0000-0000-0000-000000000072',
 'Unlimited Thali ₹89', 'Weekday unlimited veg thali for ₹89. Dal, sabzi, rice, roti.',
 'flat', 89, NULL, NULL, 'THALI89', NOW(), NOW() + INTERVAL '60 days', TRUE, TRUE, 1),

-- Dosa Plaza Rambagh
('30000000-0000-0000-0000-000000000073',
 'Family Dosa Combo', 'Four dosas + two vadas + rasam for ₹180. Feeds a family of four.',
 'flat', 180, NULL, NULL, NULL, NOW(), NOW() + INTERVAL '30 days', TRUE, FALSE, 2),

-- Om Prakash Mithai
('30000000-0000-0000-0000-000000000075',
 'Wedding Order — 10% OFF', '10% off on bulk sweet orders above 5kg for functions.',
 'percent', 10, NULL, NULL, 'WEDDING10', NOW(), NOW() + INTERVAL '60 days', TRUE, FALSE, 3),

-- Paratha Club Rambagh
('30000000-0000-0000-0000-000000000078',
 'Early Bird Combo ₹50', 'Before 8am — paratha + makhan + lassi for ₹50.',
 'flat', 50, 80, 50, NULL, NOW(), NOW() + INTERVAL '30 days', TRUE, TRUE, 1),

-- Filter Coffee House
('30000000-0000-0000-0000-000000000081',
 'Filter Coffee Free Refill', 'Buy one filter coffee, get free refill. Morning only — 7–9am.',
 'free', NULL, NULL, NULL, NULL, NOW(), NOW() + INTERVAL '90 days', TRUE, FALSE, 3),

-- Campus Cafe
('30000000-0000-0000-0000-000000000084',
 'Student Meal Deal ₹70', 'Rice + dal + sabzi + curd for ₹70. Valid with student ID.',
 'flat', 70, 100, 70, 'STUDENT70', NOW(), NOW() + INTERVAL '120 days', TRUE, TRUE, 1),

-- Domino''s Jhalwa
('30000000-0000-0000-0000-000000000085',
 'Tuesday BOGO on Mediums', 'Buy 1 medium pizza, get 1 free every Tuesday.',
 'bogo', NULL, NULL, NULL, NULL, NOW(), NOW() + INTERVAL '60 days', TRUE, FALSE, 2),

-- Study Zone Cafe
('30000000-0000-0000-0000-000000000086',
 'Exam Season Pack', 'Coffee + sandwich + 6-hour seat for ₹150. Exam weeks only.',
 'flat', 150, 220, 150, 'EXAM150', NOW(), NOW() + INTERVAL '30 days', TRUE, TRUE, 1),

-- Green Cross Pharmacy
('30000000-0000-0000-0000-000000000088',
 'Student Prescription 15% OFF', 'Show college ID, get 15% off on any prescription.',
 'percent', 15, NULL, NULL, 'STUDENT15', NOW(), NOW() + INTERVAL '365 days', TRUE, FALSE, 3),

-- Scissors Edge Salon
('30000000-0000-0000-0000-000000000089',
 'Fade Cut + Beard Combo ₹120', 'Premium fade cut with beard styling for ₹120. Weekdays only.',
 'flat', 120, 180, 120, NULL, NOW(), NOW() + INTERVAL '30 days', TRUE, FALSE, 2),

-- Momos Hub
('30000000-0000-0000-0000-000000000093',
 'Momo Bucket — 20 for ₹100', 'Twenty steamed momos with three dips for ₹100. Group deal.',
 'flat', 100, 160, 100, NULL, NOW(), NOW() + INTERVAL '7 days', TRUE, TRUE, 1),

-- Night Owl Cafe
('30000000-0000-0000-0000-000000000094',
 'Midnight Maggi + Tea ₹40', 'Maggi + kadak chai after 11pm for ₹40. Night owl menu.',
 'flat', 40, 70, 40, NULL, NOW(), NOW() + INTERVAL '90 days', TRUE, FALSE, 2),

-- Metro Fast Food
('30000000-0000-0000-0000-000000000096',
 'Roll + Chai ₹45', 'Any egg or paneer roll with chai for ₹45. Evening combo.',
 'flat', 45, 70, 45, NULL, NOW(), NOW() + INTERVAL '30 days', TRUE, FALSE, 3),

-- Spice Garden
('30000000-0000-0000-0000-000000000097',
 'Family Meal Flat ₹150 OFF', 'Family meal for 4+ people — ₹150 off the total bill.',
 'flat', 150, NULL, NULL, 'FAMILY150', NOW(), NOW() + INTERVAL '30 days', TRUE, TRUE, 1),

-- Suruchi Veg Dhaba
('30000000-0000-0000-0000-000000000098',
 'Sunday Thali ₹99', 'Full special Sunday thali for ₹99. Five sabzis, puri, and kheer.',
 'flat', 99, NULL, NULL, NULL, NOW(), NOW() + INTERVAL '60 days', TRUE, FALSE, 2),

-- Prayag Chaat Corner
('30000000-0000-0000-0000-000000000099',
 'Evening Chaat Combo ₹50', 'Bhel + sev puri + dahi papdi for ₹50. 4pm onwards.',
 'flat', 50, 80, 50, NULL, NOW(), NOW() + INTERVAL '30 days', TRUE, TRUE, 1),

-- YLG Salon
('30000000-0000-0000-0000-000000000100',
 'Haircut + Wash — 30% OFF', '30% off on haircut + wash combo. New customers only.',
 'percent', 30, NULL, NULL, 'YLG30', NOW(), NOW() + INTERVAL '14 days', TRUE, FALSE, 2),

-- Annapurna Sweets
('30000000-0000-0000-0000-000000000102',
 'Morning Prasad Pack ₹50', 'Peda + laddoo combo in leaf plate for ₹50. Temple-ready.',
 'flat', 50, 80, 50, NULL, NOW(), NOW() + INTERVAL '90 days', TRUE, FALSE, 3),

-- MedPlus Allahpur
('30000000-0000-0000-0000-000000000103',
 'Senior Citizen 10% OFF', 'Any medicine purchase — 10% off for customers above 60.',
 'percent', 10, NULL, NULL, NULL, NOW(), NOW() + INTERVAL '365 days', TRUE, FALSE, 3),

-- Street Samosa Allahpur
('30000000-0000-0000-0000-000000000105',
 'Dozen Samosa Deal ₹80', 'Twelve samosas for ₹80. Bulk party order ready in 30 minutes.',
 'flat', 80, 96, 80, NULL, NOW(), NOW() + INTERVAL '30 days', TRUE, TRUE, 1),

-- The Chai Stop
('30000000-0000-0000-0000-000000000106',
 'Chai + Snack Combo ₹30', 'Masala chai + biscuit + egg sandwich for ₹30. Morning rush deal.',
 'flat', 30, 55, 30, NULL, NOW(), NOW() + INTERVAL '30 days', TRUE, FALSE, 2),

-- Vrindavan Sweets
('30000000-0000-0000-0000-000000000107',
 'Gift Hamper — Flat ₹100 OFF', 'Any gift hamper above ₹500 gets ₹100 off. Free ribbon wrapping.',
 'flat', 100, NULL, NULL, 'HAMPER100', NOW(), NOW() + INTERVAL '15 days', TRUE, TRUE, 1),

-- Mehfil Restaurant
('30000000-0000-0000-0000-000000000109',
 'Rooftop Dinner — 20% OFF', '20% off on total bill for rooftop table. Weekends only.',
 'percent', 20, NULL, NULL, 'ROOFTOP20', NOW(), NOW() + INTERVAL '30 days', TRUE, TRUE, 1),

-- Tandoor Palace
('30000000-0000-0000-0000-000000000023',
 'Dinner Combo for 2 — ₹399', 'Butter chicken + 6 naan + raita for two at ₹399. Rooftop table included.',
 'flat', 399, 580, 399, 'DATE399', NOW(), NOW() + INTERVAL '7 days', TRUE, TRUE, 1),

-- Naturals Salon
('30000000-0000-0000-0000-000000000024',
 'Hair Spa + Blow Dry ₹299', 'Premium hair spa with blow dry styling for ₹299. Weekend slots limited.',
 'flat', 299, 450, 299, 'SPA299', NOW(), NOW() + INTERVAL '14 days', TRUE, FALSE, 2),

-- Biba
('30000000-0000-0000-0000-000000000025',
 'End of Season — 30% OFF', '30% off on all kurtis and suits. Sizes 36–46 available.',
 'percent', 30, NULL, NULL, 'BIBA30', NOW(), NOW() + INTERVAL '5 days', TRUE, TRUE, 1),

-- BigBazaar
('30000000-0000-0000-0000-000000000028',
 'Weekend Grocery Saver', '₹200 off on grocery bill of ₹1500 or more. Weekends only.',
 'flat', 200, NULL, NULL, 'WKD200', NOW(), NOW() + INTERVAL '14 days', TRUE, FALSE, 2),

-- Pani Puri Palace
('30000000-0000-0000-0000-000000000029',
 'Unlimited Pani Puri ₹40', 'Eat as many golgappe as you can in 5 minutes for ₹40. Evening only.',
 'flat', 40, NULL, NULL, NULL, NOW(), NOW() + INTERVAL '30 days', TRUE, TRUE, 1)

ON CONFLICT DO NOTHING;

END $$;
