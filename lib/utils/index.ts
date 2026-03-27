import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format, isAfter } from "date-fns";

// ─── CLASSNAME HELPER ─────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── DISTANCE FORMATTING ─────────────────────────────────────

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

export function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── TIME HELPERS ─────────────────────────────────────────────

export function isShopOpen(openTime: string | null, closeTime: string | null): boolean {
  if (!openTime || !closeTime) return false;
  const now = new Date();
  const [openH, openM] = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);
  const open = new Date(now);
  open.setHours(openH, openM, 0, 0);
  const close = new Date(now);
  close.setHours(closeH, closeM, 0, 0);
  // Handle midnight close
  if (closeH === 0 && closeM === 0) {
    close.setDate(close.getDate() + 1);
  }
  return now >= open && now <= close;
}

export function formatTimeAgo(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatOfferExpiry(endDate: string | null): string {
  if (!endDate) return "No expiry";
  const end = new Date(endDate);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  const diffHrs = diffMs / (1000 * 60 * 60);
  if (diffHrs < 0) return "Expired";
  if (diffHrs < 24) return `Ends in ${Math.round(diffHrs)}h`;
  const diffDays = Math.round(diffHrs / 24);
  if (diffDays < 7) return `Ends in ${diffDays}d`;
  return `Till ${format(end, "d MMM")}`;
}

export function isOfferExpiringSoon(endDate: string | null): boolean {
  if (!endDate) return false;
  const end = new Date(endDate);
  const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  return end <= twoDaysFromNow && isAfter(end, new Date());
}

// ─── SLUG GENERATION ──────────────────────────────────────────

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// ─── OFFER LABEL ──────────────────────────────────────────────

export function getOfferLabel(offer: {
  offer_type: string;
  discount_value: number | null;
  title: string;
}): string {
  if (offer.offer_type === "percentage" && offer.discount_value) {
    return `${offer.discount_value}% OFF`;
  }
  if (offer.offer_type === "flat" && offer.discount_value) {
    return `₹${offer.discount_value} OFF`;
  }
  if (offer.offer_type === "bogo") return "Buy 1 Get 1";
  if (offer.offer_type === "free_service") return "Free Service";
  if (offer.offer_type === "combo") return "Combo Deal";
  return offer.title.slice(0, 20);
}

// ─── NUMBER FORMATTING ────────────────────────────────────────

export function formatCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
}

// ─── RANDOM VIEWER COUNT (for engagement layer) ──────────────

export function getViewerCount(shopId: string): number {
  // Deterministic pseudo-random based on shop id + current hour
  const hour = new Date().getHours();
  const seed = shopId.charCodeAt(0) + shopId.charCodeAt(shopId.length - 1) + hour;
  return (seed % 40) + 5; // 5 to 44
}
