-- ApnaMap Complete Schema - Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT, phone TEXT, avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','vendor','admin')),
  city_id UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, state TEXT NOT NULL DEFAULT 'Uttar Pradesh',
  lat DECIMAL(10,7) NOT NULL, lng DECIMAL(10,7) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS localities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL, slug TEXT NOT NULL, description TEXT,
  lat DECIMAL(10,7) NOT NULL, lng DECIMAL(10,7) NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(city_id, slug)
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT '🏪', color TEXT NOT NULL DEFAULT '#FF5E1A',
  parent_id UUID REFERENCES categories(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  business_name TEXT, gstin TEXT, is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  locality_id UUID NOT NULL REFERENCES localities(id),
  category_id UUID NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, description TEXT,
  phone TEXT, whatsapp TEXT, address TEXT,
  lat DECIMAL(10,7) NOT NULL, lng DECIMAL(10,7) NOT NULL,
  logo_url TEXT, cover_url TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  open_time TIME, close_time TIME,
  open_days TEXT[] NOT NULL DEFAULT ARRAY['mon','tue','wed','thu','fri','sat'],
  avg_rating DECIMAL(3,2) NOT NULL DEFAULT 0, review_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  title TEXT NOT NULL, description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','flat','bogo','free','other')),
  discount_value DECIMAL(10,2), original_price DECIMAL(10,2), offer_price DECIMAL(10,2),
  coupon_code TEXT, image_url TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  tier INTEGER NOT NULL DEFAULT 2 CHECK (tier IN (1,2,3)),
  view_count INTEGER NOT NULL DEFAULT 0, click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT, is_approved BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, shop_id)
);

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('view','click','call','whatsapp','direction','save')),
  meta JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_shops_locality ON shops(locality_id);
CREATE INDEX IF NOT EXISTS idx_shops_category ON shops(category_id);
CREATE INDEX IF NOT EXISTS idx_shops_approved ON shops(is_approved, is_active);
CREATE INDEX IF NOT EXISTS idx_shops_location ON shops(lat, lng);
CREATE INDEX IF NOT EXISTS idx_offers_shop ON offers(shop_id);
CREATE INDEX IF NOT EXISTS idx_offers_active ON offers(is_active, ends_at);
CREATE INDEX IF NOT EXISTS idx_localities_city ON localities(city_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

-- AUTO-CREATE PROFILE TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
          COALESCE(NEW.raw_user_meta_data->>'role','customer'));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- DISTANCE FUNCTION
CREATE OR REPLACE FUNCTION calculate_distance_m(lat1 FLOAT, lng1 FLOAT, lat2 FLOAT, lng2 FLOAT)
RETURNS FLOAT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE R FLOAT := 6371000; dLat FLOAT; dLng FLOAT; a FLOAT;
BEGIN
  dLat := RADIANS(lat2-lat1); dLng := RADIANS(lng2-lng1);
  a := SIN(dLat/2)^2 + COS(RADIANS(lat1))*COS(RADIANS(lat2))*SIN(dLng/2)^2;
  RETURN R*2*ATAN2(SQRT(a),SQRT(1-a));
END;
$$;

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "shops_select_public" ON shops FOR SELECT USING (is_approved=TRUE AND is_active=TRUE);
CREATE POLICY "shops_vendor_all" ON shops FOR ALL USING (auth.uid()=vendor_id);
CREATE POLICY "shops_admin" ON shops FOR ALL USING (EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin'));
CREATE POLICY "offers_select_public" ON offers FOR SELECT USING (is_active=TRUE AND EXISTS(SELECT 1 FROM shops WHERE id=offers.shop_id AND is_approved=TRUE));
CREATE POLICY "offers_vendor_all" ON offers FOR ALL USING (EXISTS(SELECT 1 FROM shops WHERE id=offers.shop_id AND vendor_id=auth.uid()));
CREATE POLICY "reviews_select" ON reviews FOR SELECT USING (is_approved=TRUE);
CREATE POLICY "reviews_insert" ON reviews FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "favorites_all" ON favorites FOR ALL USING (auth.uid()=user_id);
CREATE POLICY "analytics_insert" ON analytics_events FOR INSERT WITH CHECK (TRUE);

-- LOCALITY STREAKS
CREATE TABLE IF NOT EXISTS user_locality_streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  locality_id UUID NOT NULL REFERENCES localities(id) ON DELETE CASCADE,
  streak_count INTEGER NOT NULL DEFAULT 1,
  last_visit_date TEXT NOT NULL,
  reward_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  reward_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, locality_id)
);

ALTER TABLE user_locality_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streaks_user_all" ON user_locality_streaks FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_streaks_user ON user_locality_streaks(user_id);

-- INCREMENT VIEW COUNT FUNCTION
CREATE OR REPLACE FUNCTION increment_view_count(p_shop_id UUID)
RETURNS void LANGUAGE SQL SECURITY DEFINER AS $$
  UPDATE shops SET view_count = view_count + 1 WHERE id = p_shop_id;
$$;
