-- =============================================================
-- 004_category_system.sql
-- Adds subcategories table, enriches shops table, seeds
-- 18 primary categories + all subcategories for Indian cities.
--
-- Safe to re-run:  INSERT … ON CONFLICT DO NOTHING / DO UPDATE
-- =============================================================

-- ── 1. SUBCATEGORIES TABLE ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS subcategories (
  id          UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id UUID        NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL,
  icon        TEXT        NOT NULL DEFAULT '🏪',
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_subcategories_category_id
  ON subcategories(category_id);

-- RLS: public read, only service role writes
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='subcategories' AND policyname='subcategories_read_all'
  ) THEN
    CREATE POLICY "subcategories_read_all"
      ON subcategories FOR SELECT USING (true);
  END IF;
END $$;

-- ── 2. SHOPS TABLE — new category columns ──────────────────────
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS subcategory_id          UUID        REFERENCES subcategories(id),
  ADD COLUMN IF NOT EXISTS custom_business_type    TEXT,
  ADD COLUMN IF NOT EXISTS tags                    TEXT[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_category_confidence  DECIMAL(4,3),
  ADD COLUMN IF NOT EXISTS business_input_text     TEXT;

CREATE INDEX IF NOT EXISTS idx_shops_tags
  ON shops USING GIN(tags);

-- ── 3. SEED 18 PRIMARY CATEGORIES ─────────────────────────────
INSERT INTO categories (name, slug, icon, color) VALUES
  ('Grocery & Daily Needs',         'grocery-daily-needs',         '🛒', '#4CAF50'),
  ('Food & Beverages',              'food-beverages',              '🍽️', '#FF9800'),
  ('Meat & Fresh Market',           'meat-fresh-market',           '🥩', '#F44336'),
  ('Fashion & Clothing',            'fashion-clothing',            '👗', '#E91E63'),
  ('Beauty & Personal Care',        'beauty-personal-care',        '💄', '#9C27B0'),
  ('Health & Medical',              'health-medical',              '🏥', '#2196F3'),
  ('Home & Furniture',              'home-furniture',              '🛋️', '#795548'),
  ('Hardware & Construction',       'hardware-construction',       '🔩', '#607D8B'),
  ('Electronics & Mobile',          'electronics-mobile',          '📱', '#3F51B5'),
  ('Auto & Vehicles',               'auto-vehicles',               '🚗', '#FF5722'),
  ('Education & Stationery',        'education-stationery',        '📚', '#009688'),
  ('Services & Utilities',          'services-utilities',          '🖨️', '#00BCD4'),
  ('Professional & Local Services', 'professional-local-services', '🔌', '#8BC34A'),
  ('Real Estate & Property',        'real-estate-property',        '🏠', '#FF6F00'),
  ('Gifts, Toys & Hobby',           'gifts-toys-hobby',            '🎁', '#FFC107'),
  ('Pets & Animals',                'pets-animals',                '🐾', '#CDDC39'),
  ('Religious & Cultural',          'religious-cultural',          '🪔', '#FF7043'),
  ('Other / Miscellaneous',         'other-miscellaneous',         '🏪', '#9E9E9E')
ON CONFLICT (slug) DO UPDATE SET
  name  = EXCLUDED.name,
  icon  = EXCLUDED.icon,
  color = EXCLUDED.color;

-- ── 4. SEED SUBCATEGORIES ──────────────────────────────────────
INSERT INTO subcategories (category_id, name, slug, icon, sort_order) VALUES

  -- Grocery & Daily Needs
  ((SELECT id FROM categories WHERE slug='grocery-daily-needs'), 'Kirana Store',               'kirana-store',            '🏪', 1),
  ((SELECT id FROM categories WHERE slug='grocery-daily-needs'), 'General Store',              'general-store',           '🏬', 2),
  ((SELECT id FROM categories WHERE slug='grocery-daily-needs'), 'Dairy / Milk Booth',         'dairy-milk-booth',        '🥛', 3),
  ((SELECT id FROM categories WHERE slug='grocery-daily-needs'), 'Fruits & Vegetables',        'fruits-vegetables',       '🥦', 4),
  ((SELECT id FROM categories WHERE slug='grocery-daily-needs'), 'Atta / Rice / Pulses',       'atta-rice-pulses',        '🌾', 5),
  ((SELECT id FROM categories WHERE slug='grocery-daily-needs'), 'Water Supplier (RO / Can)',  'water-supplier-ro-can',   '💧', 6),
  ((SELECT id FROM categories WHERE slug='grocery-daily-needs'), 'Gas Cylinder / LPG',         'gas-cylinder-lpg',        '⛽', 7),
  ((SELECT id FROM categories WHERE slug='grocery-daily-needs'), 'Pan Shop',                   'pan-shop',                '🌿', 8),
  ((SELECT id FROM categories WHERE slug='grocery-daily-needs'), 'Daily Essentials Vendor',    'daily-essentials-vendor', '🧴', 9),

  -- Food & Beverages
  ((SELECT id FROM categories WHERE slug='food-beverages'), 'Restaurant',            'restaurant',          '🍽️', 1),
  ((SELECT id FROM categories WHERE slug='food-beverages'), 'Street Food Stall',     'street-food-stall',   '🌮', 2),
  ((SELECT id FROM categories WHERE slug='food-beverages'), 'Tea Stall / Chai Shop', 'tea-stall-chai-shop', '☕', 3),
  ((SELECT id FROM categories WHERE slug='food-beverages'), 'Juice Shop',            'juice-shop',          '🥤', 4),
  ((SELECT id FROM categories WHERE slug='food-beverages'), 'Sweet Shop / Mithai',   'sweet-shop-mithai',   '🍬', 5),
  ((SELECT id FROM categories WHERE slug='food-beverages'), 'Bakery',                'bakery',              '🥐', 6),
  ((SELECT id FROM categories WHERE slug='food-beverages'), 'Fast Food / Chinese',   'fast-food-chinese',   '🍜', 7),
  ((SELECT id FROM categories WHERE slug='food-beverages'), 'Tiffin Service',        'tiffin-service',      '🍱', 8),
  ((SELECT id FROM categories WHERE slug='food-beverages'), 'Dhaba',                 'dhaba',               '🍛', 9),
  ((SELECT id FROM categories WHERE slug='food-beverages'), 'Ice Cream Parlour',     'ice-cream-parlour',   '🍦', 10),

  -- Meat & Fresh Market
  ((SELECT id FROM categories WHERE slug='meat-fresh-market'), 'Chicken Shop',  'chicken-shop',  '🍗', 1),
  ((SELECT id FROM categories WHERE slug='meat-fresh-market'), 'Mutton Shop',   'mutton-shop',   '🥩', 2),
  ((SELECT id FROM categories WHERE slug='meat-fresh-market'), 'Fish Shop',     'fish-shop',     '🐟', 3),
  ((SELECT id FROM categories WHERE slug='meat-fresh-market'), 'Egg Shop',      'egg-shop',      '🥚', 4),
  ((SELECT id FROM categories WHERE slug='meat-fresh-market'), 'Meat Supplier', 'meat-supplier', '🏪', 5),

  -- Fashion & Clothing
  ((SELECT id FROM categories WHERE slug='fashion-clothing'), 'Garments Store',           'garments-store',       '👔', 1),
  ((SELECT id FROM categories WHERE slug='fashion-clothing'), 'Ladies Wear',              'ladies-wear',          '👗', 2),
  ((SELECT id FROM categories WHERE slug='fashion-clothing'), 'Mens Wear',                'mens-wear',            '🧥', 3),
  ((SELECT id FROM categories WHERE slug='fashion-clothing'), 'Kids Wear',                'kids-wear',            '👕', 4),
  ((SELECT id FROM categories WHERE slug='fashion-clothing'), 'Tailor',                   'tailor',               '🧵', 5),
  ((SELECT id FROM categories WHERE slug='fashion-clothing'), 'Boutique',                 'boutique',             '👒', 6),
  ((SELECT id FROM categories WHERE slug='fashion-clothing'), 'Shoe Shop',                'shoe-shop',            '👟', 7),
  ((SELECT id FROM categories WHERE slug='fashion-clothing'), 'Bag Shop',                 'bag-shop',             '👜', 8),
  ((SELECT id FROM categories WHERE slug='fashion-clothing'), 'Jewellery / Artificial',   'jewellery-artificial', '💍', 9),
  ((SELECT id FROM categories WHERE slug='fashion-clothing'), 'Bangle Shop',              'bangle-shop',          '📿', 10),

  -- Beauty & Personal Care
  ((SELECT id FROM categories WHERE slug='beauty-personal-care'), 'Salon',          'salon',          '💈', 1),
  ((SELECT id FROM categories WHERE slug='beauty-personal-care'), 'Beauty Parlour', 'beauty-parlour', '💅', 2),
  ((SELECT id FROM categories WHERE slug='beauty-personal-care'), 'Spa',            'spa',            '🧖', 3),
  ((SELECT id FROM categories WHERE slug='beauty-personal-care'), 'Cosmetic Shop',  'cosmetic-shop',  '🧴', 4),
  ((SELECT id FROM categories WHERE slug='beauty-personal-care'), 'Tattoo Studio',  'tattoo-studio',  '🎨', 5),

  -- Health & Medical
  ((SELECT id FROM categories WHERE slug='health-medical'), 'Pharmacy / Medical Store', 'pharmacy-medical-store', '💊', 1),
  ((SELECT id FROM categories WHERE slug='health-medical'), 'Clinic',                   'clinic',                 '🏥', 2),
  ((SELECT id FROM categories WHERE slug='health-medical'), 'Hospital',                 'hospital',               '🏨', 3),
  ((SELECT id FROM categories WHERE slug='health-medical'), 'Diagnostic Center',        'diagnostic-center',      '🔬', 4),
  ((SELECT id FROM categories WHERE slug='health-medical'), 'Pathology Lab',            'pathology-lab',          '🧪', 5),
  ((SELECT id FROM categories WHERE slug='health-medical'), 'Optical Shop',             'optical-shop',           '👓', 6),
  ((SELECT id FROM categories WHERE slug='health-medical'), 'Dental Clinic',            'dental-clinic',          '🦷', 7),
  ((SELECT id FROM categories WHERE slug='health-medical'), 'Physiotherapy',            'physiotherapy',          '🤸', 8),

  -- Home & Furniture
  ((SELECT id FROM categories WHERE slug='home-furniture'), 'Furniture Shop',       'furniture-shop',     '🪑', 1),
  ((SELECT id FROM categories WHERE slug='home-furniture'), 'Home Decor',           'home-decor',         '🏮', 2),
  ((SELECT id FROM categories WHERE slug='home-furniture'), 'Mattress Store',       'mattress-store',     '🛏️', 3),
  ((SELECT id FROM categories WHERE slug='home-furniture'), 'Curtains / Furnishing','curtains-furnishing', '🪟', 4),
  ((SELECT id FROM categories WHERE slug='home-furniture'), 'Kitchen Utensils',     'kitchen-utensils',   '🍳', 5),

  -- Hardware & Construction
  ((SELECT id FROM categories WHERE slug='hardware-construction'), 'Hardware Store',          'hardware-store',        '🔩', 1),
  ((SELECT id FROM categories WHERE slug='hardware-construction'), 'Building Materials',      'building-materials',    '🧱', 2),
  ((SELECT id FROM categories WHERE slug='hardware-construction'), 'Cement / Sand / Bricks',  'cement-sand-bricks',    '🪨', 3),
  ((SELECT id FROM categories WHERE slug='hardware-construction'), 'Tiles / Marble / Granite', 'tiles-marble-granite', '🪨', 4),
  ((SELECT id FROM categories WHERE slug='hardware-construction'), 'Paint Shop',              'paint-shop',            '🎨', 5),
  ((SELECT id FROM categories WHERE slug='hardware-construction'), 'Electrical Fittings',     'electrical-fittings',   '🔌', 6),
  ((SELECT id FROM categories WHERE slug='hardware-construction'), 'Plumbing Materials',      'plumbing-materials',    '🚿', 7),

  -- Electronics & Mobile
  ((SELECT id FROM categories WHERE slug='electronics-mobile'), 'Mobile Shop',            'mobile-shop',           '📱', 1),
  ((SELECT id FROM categories WHERE slug='electronics-mobile'), 'Mobile Repair',          'mobile-repair',         '🔧', 2),
  ((SELECT id FROM categories WHERE slug='electronics-mobile'), 'Laptop / Computer Shop', 'laptop-computer-shop',  '💻', 3),
  ((SELECT id FROM categories WHERE slug='electronics-mobile'), 'Electronics Store',      'electronics-store',     '📺', 4),
  ((SELECT id FROM categories WHERE slug='electronics-mobile'), 'Appliance Store',        'appliance-store',       '🏠', 5),
  ((SELECT id FROM categories WHERE slug='electronics-mobile'), 'CCTV / Security Systems','cctv-security-systems', '📷', 6),

  -- Auto & Vehicles
  ((SELECT id FROM categories WHERE slug='auto-vehicles'), 'Bike Showroom',  'bike-showroom',  '🏍️', 1),
  ((SELECT id FROM categories WHERE slug='auto-vehicles'), 'Car Showroom',   'car-showroom',   '🚗', 2),
  ((SELECT id FROM categories WHERE slug='auto-vehicles'), 'Used Vehicles',  'used-vehicles',  '🔄', 3),
  ((SELECT id FROM categories WHERE slug='auto-vehicles'), 'Garage / Repair','garage-repair',  '🔧', 4),
  ((SELECT id FROM categories WHERE slug='auto-vehicles'), 'Car Wash',       'car-wash',       '🚿', 5),
  ((SELECT id FROM categories WHERE slug='auto-vehicles'), 'Bike Service',   'bike-service',   '🛵', 6),
  ((SELECT id FROM categories WHERE slug='auto-vehicles'), 'Petrol Pump',    'petrol-pump',    '⛽', 7),
  ((SELECT id FROM categories WHERE slug='auto-vehicles'), 'Spare Parts',    'spare-parts',    '⚙️', 8),

  -- Education & Stationery
  ((SELECT id FROM categories WHERE slug='education-stationery'), 'School',          'school',          '🏫', 1),
  ((SELECT id FROM categories WHERE slug='education-stationery'), 'Coaching Center', 'coaching-center', '📖', 2),
  ((SELECT id FROM categories WHERE slug='education-stationery'), 'Tuition Classes', 'tuition-classes', '✏️', 3),
  ((SELECT id FROM categories WHERE slug='education-stationery'), 'Stationery Shop', 'stationery-shop', '📎', 4),
  ((SELECT id FROM categories WHERE slug='education-stationery'), 'Book Store',      'book-store',      '📚', 5),
  ((SELECT id FROM categories WHERE slug='education-stationery'), 'Library',         'library',         '📖', 6),

  -- Services & Utilities
  ((SELECT id FROM categories WHERE slug='services-utilities'), 'Photocopy / Print Shop', 'photocopy-print-shop', '🖨️', 1),
  ((SELECT id FROM categories WHERE slug='services-utilities'), 'Cyber Cafe',             'cyber-cafe',           '💻', 2),
  ((SELECT id FROM categories WHERE slug='services-utilities'), 'Courier Service',        'courier-service',      '📦', 3),
  ((SELECT id FROM categories WHERE slug='services-utilities'), 'Recharge Shop',          'recharge-shop',        '📶', 4),
  ((SELECT id FROM categories WHERE slug='services-utilities'), 'Internet Provider',      'internet-provider',    '🌐', 5),
  ((SELECT id FROM categories WHERE slug='services-utilities'), 'Travel Agency',          'travel-agency',        '✈️', 6),
  ((SELECT id FROM categories WHERE slug='services-utilities'), 'Ticket Booking',         'ticket-booking',       '🎫', 7),

  -- Professional & Local Services
  ((SELECT id FROM categories WHERE slug='professional-local-services'), 'Electrician',      'electrician',      '⚡', 1),
  ((SELECT id FROM categories WHERE slug='professional-local-services'), 'Plumber',          'plumber',          '🔧', 2),
  ((SELECT id FROM categories WHERE slug='professional-local-services'), 'Carpenter',        'carpenter',        '🪚', 3),
  ((SELECT id FROM categories WHERE slug='professional-local-services'), 'Painter',          'painter',          '🎨', 4),
  ((SELECT id FROM categories WHERE slug='professional-local-services'), 'Mason',            'mason',            '🧱', 5),
  ((SELECT id FROM categories WHERE slug='professional-local-services'), 'AC Repair',        'ac-repair',        '❄️', 6),
  ((SELECT id FROM categories WHERE slug='professional-local-services'), 'Appliance Repair', 'appliance-repair', '🔌', 7),
  ((SELECT id FROM categories WHERE slug='professional-local-services'), 'Event Planner',    'event-planner',    '🎉', 8),

  -- Real Estate & Property
  ((SELECT id FROM categories WHERE slug='real-estate-property'), 'Property Dealer',    'property-dealer',    '🏘️', 1),
  ((SELECT id FROM categories WHERE slug='real-estate-property'), 'Plot Seller',         'plot-seller',        '📐', 2),
  ((SELECT id FROM categories WHERE slug='real-estate-property'), 'Builder',             'builder',            '🏗️', 3),
  ((SELECT id FROM categories WHERE slug='real-estate-property'), 'Rental Services',     'rental-services',    '🔑', 4),
  ((SELECT id FROM categories WHERE slug='real-estate-property'), 'PG / Hostel',         'pg-hostel',          '🏠', 5),
  ((SELECT id FROM categories WHERE slug='real-estate-property'), 'Commercial Property', 'commercial-property','🏢', 6),

  -- Gifts, Toys & Hobby
  ((SELECT id FROM categories WHERE slug='gifts-toys-hobby'), 'Gift Shop',        'gift-shop',        '🎁', 1),
  ((SELECT id FROM categories WHERE slug='gifts-toys-hobby'), 'Toy Shop',         'toy-shop',         '🧸', 2),
  ((SELECT id FROM categories WHERE slug='gifts-toys-hobby'), 'Sports Goods',     'sports-goods',     '⚽', 3),
  ((SELECT id FROM categories WHERE slug='gifts-toys-hobby'), 'Flower Shop',      'flower-shop',      '💐', 4),
  ((SELECT id FROM categories WHERE slug='gifts-toys-hobby'), 'Decoration Items', 'decoration-items', '🎊', 5),

  -- Pets & Animals
  ((SELECT id FROM categories WHERE slug='pets-animals'), 'Pet Shop',          'pet-shop',          '🐕', 1),
  ((SELECT id FROM categories WHERE slug='pets-animals'), 'Veterinary Clinic', 'veterinary-clinic', '🐾', 2),
  ((SELECT id FROM categories WHERE slug='pets-animals'), 'Animal Feed Store', 'animal-feed-store', '🌾', 3),
  ((SELECT id FROM categories WHERE slug='pets-animals'), 'Dairy Farming',     'dairy-farming',     '🐄', 4),

  -- Religious & Cultural
  ((SELECT id FROM categories WHERE slug='religious-cultural'), 'Temple Shop',    'temple-shop',    '🛕', 1),
  ((SELECT id FROM categories WHERE slug='religious-cultural'), 'Pooja Items',    'pooja-items',    '🪔', 2),
  ((SELECT id FROM categories WHERE slug='religious-cultural'), 'Flower Vendor',  'flower-vendor',  '🌸', 3),
  ((SELECT id FROM categories WHERE slug='religious-cultural'), 'Spiritual Store','spiritual-store', '📿', 4),

  -- Other / Miscellaneous
  ((SELECT id FROM categories WHERE slug='other-miscellaneous'), 'Miscellaneous Shop',    'miscellaneous-shop',    '🏪', 1),
  ((SELECT id FROM categories WHERE slug='other-miscellaneous'), 'Custom Local Business', 'custom-local-business', '🏬', 2),
  ((SELECT id FROM categories WHERE slug='other-miscellaneous'), 'Multi-Service Business','multi-service-business','🔄', 3)

ON CONFLICT (category_id, slug) DO NOTHING;
