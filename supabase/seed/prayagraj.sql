-- ══════════════════════════════════════════════════════════════
-- ApnaMap — Seed Data: Prayagraj
-- Run AFTER 001_schema.sql
-- ══════════════════════════════════════════════════════════════

-- ─── CITY ─────────────────────────────────────────────────────
INSERT INTO cities (id, name, slug, state, lat, lng) VALUES
('00000000-0000-0000-0000-000000000001', 'Prayagraj', 'prayagraj', 'Uttar Pradesh', 25.4358, 81.8463)
ON CONFLICT (slug) DO NOTHING;

-- ─── LOCALITIES ───────────────────────────────────────────────
INSERT INTO localities (id, city_id, name, slug, description, lat, lng, priority) VALUES
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 'Civil Lines', 'civil-lines', 'Upscale commercial hub with cafes, showrooms, and offices', 25.4580, 81.8372, 1),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
 'Chowk Bazar', 'chowk-bazar', 'Historic old city bazaar, dense and vibrant', 25.4452, 81.8465, 2),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
 'Katra Market', 'katra-market', 'Dense fashion, fabric and repair hub', 25.4418, 81.8515, 3),
('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
 'Rambagh', 'rambagh', 'Residential area with daily needs and eateries', 25.4320, 81.8630, 4),
('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001',
 'Naini', 'naini', 'Industrial and wholesale district across the Yamuna', 25.4010, 81.8980, 5)
ON CONFLICT (city_id, slug) DO NOTHING;

-- ─── CATEGORIES ───────────────────────────────────────────────
INSERT INTO categories (id, name, slug, icon, color) VALUES
('20000000-0000-0000-0000-000000000001', 'Sweet Shop',      'sweet-shop',    '🍮', '#FF8C00'),
('20000000-0000-0000-0000-000000000002', 'Restaurant',      'restaurant',    '🍽️', '#FF5E1A'),
('20000000-0000-0000-0000-000000000003', 'Street Food',     'street-food',   '🍜', '#FF6B35'),
('20000000-0000-0000-0000-000000000004', 'Grocery',         'grocery',       '🛒', '#22C55E'),
('20000000-0000-0000-0000-000000000005', 'Fashion',         'fashion',       '👗', '#EC4899'),
('20000000-0000-0000-0000-000000000006', 'Electronics',     'electronics',   '📺', '#38BDF8'),
('20000000-0000-0000-0000-000000000007', 'Salon',           'salon',         '✂️', '#A78BFA'),
('20000000-0000-0000-0000-000000000008', 'Mobile Repair',   'mobile-repair', '📱', '#60A5FA'),
('20000000-0000-0000-0000-000000000009', 'Jewellery',       'jewellery',     '💍', '#EAB308'),
('20000000-0000-0000-0000-000000000010', 'Pharmacy',        'pharmacy',      '💊', '#10B981'),
('20000000-0000-0000-0000-000000000011', 'Coaching',        'coaching',      '📚', '#F59E0B'),
('20000000-0000-0000-0000-000000000012', 'Gym & Fitness',   'gym',           '🏋️', '#6366F1')
ON CONFLICT (slug) DO NOTHING;

-- ─── DEMO VENDOR USER ─────────────────────────────────────────
-- Creates the full auth.users → profiles → vendors chain needed
-- for shops FK. Safe to re-run (ON CONFLICT DO NOTHING everywhere).
-- Password hash below is bcrypt for literal string "password".
DO $$
DECLARE
  demo_vendor_id UUID := '99000000-0000-0000-0000-000000000001';
  civil_id UUID := '10000000-0000-0000-0000-000000000001';
  chowk_id UUID := '10000000-0000-0000-0000-000000000002';
  katra_id UUID := '10000000-0000-0000-0000-000000000003';
  rambagh_id UUID := '10000000-0000-0000-0000-000000000004';
BEGIN

-- 1. Supabase auth user (required root of FK chain)
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

-- 2. Profile row
INSERT INTO profiles (id, name, phone, role)
VALUES (demo_vendor_id, 'Demo Vendor', '9400000001', 'vendor')
ON CONFLICT (id) DO NOTHING;

-- 3. Vendor row
INSERT INTO vendors (id, business_name, is_verified)
VALUES (demo_vendor_id, 'ApnaMap Demo Vendor', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ─── SHOPS ───────────────────────────────────────────────────

INSERT INTO shops (id, vendor_id, locality_id, category_id, name, slug, description,
  phone, whatsapp, address, lat, lng, is_approved, is_active,
  open_time, close_time, avg_rating, review_count)
VALUES

-- Civil Lines shops
('30000000-0000-0000-0000-000000000001', demo_vendor_id, civil_id,
 '20000000-0000-0000-0000-000000000001',
 'Gupta Sweet House', 'gupta-sweet-house',
 'Famous for rabri jalebi, kesar pedha, and traditional Prayagraj sweets since 1952.',
 '9415001234', '9415001234',
 '12 Thornhill Road, Civil Lines, Prayagraj',
 25.4581, 81.8380, TRUE, TRUE, '08:00', '22:00', 4.7, 312),

('30000000-0000-0000-0000-000000000002', demo_vendor_id, civil_id,
 '20000000-0000-0000-0000-000000000002',
 'Café Allahabad', 'cafe-allahabad',
 'The city''s oldest café. Classic sandwiches, filter coffee, and breakfast since 1941.',
 '9415002345', '9415002345',
 '45 MG Marg, Civil Lines, Prayagraj',
 25.4575, 81.8361, TRUE, TRUE, '07:30', '21:30', 4.5, 427),

('30000000-0000-0000-0000-000000000003', demo_vendor_id, civil_id,
 '20000000-0000-0000-0000-000000000006',
 'Sharma Electronics', 'sharma-electronics',
 'Authorised service centre. TVs, ACs, washing machines. Free home inspection.',
 '9415003456', '9415003456',
 '8 Leader Road, Civil Lines, Prayagraj',
 25.4578, 81.8370, TRUE, TRUE, '10:00', '20:00', 4.3, 186),

('30000000-0000-0000-0000-000000000004', demo_vendor_id, civil_id,
 '20000000-0000-0000-0000-000000000005',
 'New Fashion Point', 'new-fashion-point',
 'Latest ethnic and western wear for the whole family. New arrivals every week.',
 '9415004567', '9415004567',
 '22 Civil Lines, Prayagraj',
 25.4568, 81.8375, TRUE, TRUE, '10:30', '21:00', 4.2, 143),

-- Chowk shops
('30000000-0000-0000-0000-000000000005', demo_vendor_id, chowk_id,
 '20000000-0000-0000-0000-000000000003',
 'Raj Kachori Corner', 'raj-kachori-corner',
 'Legendary Prayagraj kachori-sabzi since 1965. Runs out by noon. Must try.',
 '9415005678', '9415005678',
 'Chowk Chauraha, Old City, Prayagraj',
 25.4455, 81.8467, TRUE, TRUE, '06:30', '13:00', 4.9, 1243),

('30000000-0000-0000-0000-000000000006', demo_vendor_id, chowk_id,
 '20000000-0000-0000-0000-000000000005',
 'Moti Mahal Sarees', 'moti-mahal-sarees',
 'Pure Banarasi and Chanderi sarees. Wholesale and retail. Trusted since 1978.',
 '9415006789', '9415006789',
 'Sadar Bazar, Chowk, Prayagraj',
 25.4450, 81.8470, TRUE, TRUE, '10:00', '21:00', 4.4, 288),

('30000000-0000-0000-0000-000000000007', demo_vendor_id, chowk_id,
 '20000000-0000-0000-0000-000000000004',
 'Trivedi Kirana Store', 'trivedi-kirana-store',
 'Everything for home. Quality groceries, spices, and daily needs at fair prices.',
 '9415007890', '9415007890',
 'Lane 4, Chowk Market, Prayagraj',
 25.4458, 81.8462, TRUE, TRUE, '07:00', '22:00', 4.1, 67),

-- Katra shops
('30000000-0000-0000-0000-000000000008', demo_vendor_id, katra_id,
 '20000000-0000-0000-0000-000000000007',
 'Style Studio Salon', 'style-studio-salon',
 'Unisex premium salon. Hair, skin, bridal packages. AC, trained stylists.',
 '9415008901', '9415008901',
 'Katra Market, Prayagraj',
 25.4420, 81.8517, TRUE, TRUE, '10:00', '20:00', 4.3, 201),

('30000000-0000-0000-0000-000000000009', demo_vendor_id, katra_id,
 '20000000-0000-0000-0000-000000000008',
 'Speed Mobile Care', 'speed-mobile-care',
 'All brand mobile repairs. Screen, battery, water damage. 1-hour service guarantee.',
 '9415009012', '9415009012',
 'Katra Bazar, Prayagraj',
 25.4416, 81.8512, TRUE, TRUE, '10:00', '20:00', 4.2, 178),

-- Rambagh shops
('30000000-0000-0000-0000-000000000010', demo_vendor_id, rambagh_id,
 '20000000-0000-0000-0000-000000000002',
 'Annapurna Restaurant', 'annapurna-restaurant',
 'Pure veg home-style thali. Unlimited refills. Best rajma-chawal in Prayagraj.',
 '9415010123', '9415010123',
 'Rambagh Colony, Prayagraj',
 25.4322, 81.8632, TRUE, TRUE, '11:30', '22:00', 4.6, 334)

ON CONFLICT (slug) DO NOTHING;

-- ─── OFFERS ──────────────────────────────────────────────────

INSERT INTO offers (shop_id, title, description, discount_type, discount_value,
  coupon_code, starts_at, ends_at, is_active, tier)
VALUES

('30000000-0000-0000-0000-000000000001',
 'Flat 25% OFF on All Sweets',
 'Get 25% off on entire range including kesar pedha, rabri jalebi, and barfi. Minimum order ₹200.',
 'percent', 25, 'SWEET25',
 NOW(), NOW() + INTERVAL '7 days', TRUE, 1),

('30000000-0000-0000-0000-000000000001',
 'Buy 500g Get 100g Free',
 'Buy any 500g sweet box and get 100g extra free. Valid on loose sweets only.',
 'bogo', NULL, NULL,
 NOW(), NOW() + INTERVAL '3 days', TRUE, 2),

('30000000-0000-0000-0000-000000000002',
 'Buy 1 Get 1 Free — Breakfast',
 'Order any breakfast item and get a second one free. Valid 8–11am only.',
 'bogo', NULL, 'CAFE11',
 NOW(), NOW() + INTERVAL '5 days', TRUE, 1),

('30000000-0000-0000-0000-000000000003',
 'Free Home Installation',
 'Buy any AC or washing machine and get free home installation worth ₹500.',
 'free', NULL, NULL,
 NOW(), NOW() + INTERVAL '30 days', TRUE, 2),

('30000000-0000-0000-0000-000000000004',
 'Flat 30% OFF on Ethnic Wear',
 'End of season sale. 30% off on all kurtas, salwar suits, and sarees.',
 'percent', 30, 'FASHION30',
 NOW(), NOW() + INTERVAL '4 days', TRUE, 1),

('30000000-0000-0000-0000-000000000005',
 'Full Combo Only ₹30',
 'Kachori, sabzi, and jalebis combo at ₹30. Limited plates. First come first served.',
 'flat', 30, NULL,
 NOW(), NOW() + INTERVAL '1 day', TRUE, 1),

('30000000-0000-0000-0000-000000000006',
 'Flat 20% OFF on Banarasi Sarees',
 'Festive season special. 20% off on all pure Banarasi silk sarees.',
 'percent', 20, 'SARI20',
 NOW(), NOW() + INTERVAL '10 days', TRUE, 2),

('30000000-0000-0000-0000-000000000008',
 '40% OFF Your First Visit',
 'New customers get 40% off on any service. Hair, skin, or threading.',
 'percent', 40, 'NEW40',
 NOW(), NOW() + INTERVAL '14 days', TRUE, 1),

('30000000-0000-0000-0000-000000000009',
 '₹100 OFF Screen Replacement',
 'Any brand screen replacement ₹100 off. Free tempered glass included.',
 'flat', 100, 'SCREEN100',
 NOW(), NOW() + INTERVAL '7 days', TRUE, 2),

('30000000-0000-0000-0000-000000000010',
 'Unlimited Thali ₹99',
 'Full unlimited veg thali for ₹99 on weekdays. Includes dal, sabzi, rice, roti.',
 'flat', 99, 'THALI99',
 NOW(), NOW() + INTERVAL '30 days', TRUE, 1);

END $$;
