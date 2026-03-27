// ═══════════════════════════════════════════════════════════════
// APNAMAP — GLOBAL TYPES
// ═══════════════════════════════════════════════════════════════

export type UserRole = "user" | "vendor" | "admin";
export type ShopStatus = "pending" | "active" | "suspended" | "rejected";
export type OfferStatus = "active" | "expired" | "paused";
export type OfferType = "percentage" | "flat" | "bogo" | "free_service" | "combo" | "other";

// ─── DATABASE TYPES ───────────────────────────────────────────

export interface Profile {
  id: string;
  full_name: string | null;
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
  sort_order: number;
  is_active: boolean;
  // joined
  city?: City;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  bg_class: string;
  sort_order: number;
}

export interface Vendor {
  id: string;
  user_id: string;
  business_name: string;
  gstin: string | null;
  verified: boolean;
}

export interface Shop {
  id: string;
  vendor_id: string | null;
  category_id: string;
  locality_id: string;
  city_id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  email: string | null;
  lat: number;
  lng: number;
  logo_url: string | null;
  cover_url: string | null;
  gallery: string[];
  tags: string[];
  open_time: string | null;
  close_time: string | null;
  open_days: string[];
  rating: number;
  review_count: number;
  status: ShopStatus;
  is_featured: boolean;
  view_count: number;
  save_count: number;
  created_at: string;
  updated_at: string;
  // joined
  category?: Category;
  locality?: Locality;
  city?: City;
  offers?: Offer[];
}

export interface ShopWithDistance extends Shop {
  distance_km: number;
  category_name: string;
  category_icon: string;
  locality_name: string;
  city_name: string;
  active_offer_count: number;
}

export interface Offer {
  id: string;
  shop_id: string;
  title: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  offer_type: OfferType;
  discount_value: number | null;
  min_order: number | null;
  max_discount: number | null;
  coupon_code: string | null;
  start_date: string;
  end_date: string | null;
  terms: string | null;
  status: OfferStatus;
  view_count: number;
  click_count: number;
  created_at: string;
  // joined
  shop?: Shop;
}

export interface Review {
  id: string;
  shop_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  images: string[];
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

// ─── APP TYPES ────────────────────────────────────────────────

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface WalkViewLocality {
  locality: Locality;
  shops: ShopWithDistance[];
}

export interface AnalyticsEvent {
  event_type: string;
  shop_id?: string;
  offer_id?: string;
  locality_id?: string;
  lat?: number;
  lng?: number;
  meta?: Record<string, unknown>;
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
  website: string;
  email: string;
  lat: number;
  lng: number;
  open_time: string;
  close_time: string;
}

export interface OfferFormData {
  title: string;
  description: string;
  offer_type: OfferType;
  discount_value?: number;
  coupon_code?: string;
  end_date?: string;
  terms?: string;
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
