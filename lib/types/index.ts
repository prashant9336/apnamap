// ═══════════════════════════════════════════════════════════════
// APNAMAP — GLOBAL TYPES (aligned with 001_schema.sql)
// ═══════════════════════════════════════════════════════════════

export type UserRole = "customer" | "vendor" | "admin" | "sales";
export type DiscountType = "percent" | "flat" | "bogo" | "free" | "other";

// ─── DATABASE TYPES ───────────────────────────────────────────

export interface Profile {
  id: string;
  name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  city_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface City {
  id: string;
  name: string;
  slug: string;
  state: string;
  lat: number;
  lng: number;
  is_active: boolean;
}

export interface Locality {
  id: string;
  city_id: string;
  name: string;
  slug: string;
  description: string | null;
  lat: number;
  lng: number;
  priority: number;
  // joined
  city?: City;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  parent_id: string | null;
}

export interface Vendor {
  id: string;
  business_name: string | null;
  gstin: string | null;
  is_verified: boolean;
  created_at: string;
}

export interface Shop {
  id: string;
  vendor_id: string;
  locality_id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  lat: number;
  lng: number;
  logo_url: string | null;
  cover_url: string | null;
  is_approved: boolean;
  is_active: boolean;
  is_featured: boolean;
  open_time: string | null;
  close_time: string | null;
  open_days: string[];
  avg_rating: number;
  review_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  // joined
  locality?: Locality;
  category?: Category;
  offers?: Offer[];
}

export interface ShopWithDistance extends Shop {
  distance_m: number;
}

export interface Offer {
  id: string;
  shop_id: string;
  title: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number | null;
  original_price: number | null;
  offer_price: number | null;
  coupon_code: string | null;
  image_url: string | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  is_featured: boolean;
  tier: 1 | 2 | 3;
  view_count: number;
  click_count: number;
  created_at: string;
  updated_at: string;
  // joined
  shop?: Shop;
}

export interface Review {
  id: string;
  user_id: string;
  shop_id: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
  // joined
  profile?: Profile;
}

export interface Favorite {
  id: string;
  user_id: string;
  shop_id: string | null;
  offer_id: string | null;
  created_at: string;
  // joined
  shop?: Shop;
  offer?: Offer;
}

export interface AnalyticsEvent {
  id: string;
  user_id: string | null;
  shop_id: string | null;
  offer_id: string | null;
  event_type: "view" | "click" | "call" | "whatsapp" | "direction" | "save";
  meta: Record<string, unknown>;
  created_at: string;
}

export interface LocalityStreak {
  id: string;
  user_id: string;
  locality_id: string;
  streak_count: number;
  last_visit_date: string;
  reward_unlocked: boolean;
  reward_code: string | null;
  created_at: string;
  updated_at: string;
}

// ─── APP TYPES ────────────────────────────────────────────────

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface WalkLocality extends Locality {
  shops: WalkShop[];
  crowd_count: number;
  crowd_label: string;
  crowd_badge: "hot" | "busy" | "quiet";
}

export interface WalkShop extends Shop {
  distance_m: number;
  is_open: boolean;
  top_offer: Offer | null;
}

export interface GeoState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
  locality: string | null;
}

// ─── FORM TYPES ───────────────────────────────────────────────

export interface ShopFormData {
  name: string;
  description: string;
  category_id: string;
  locality_id: string;
  address: string;
  phone: string;
  whatsapp: string;
  lat: number;
  lng: number;
  open_time: string;
  close_time: string;
}

export interface OfferFormData {
  title: string;
  description: string;
  discount_type: DiscountType;
  discount_value?: number;
  coupon_code?: string;
  ends_at?: string;
}

// ─── API RESPONSE TYPES ───────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  per_page: number;
}
