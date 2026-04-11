/**
 * Central app configuration.
 *
 * NEXT_PUBLIC_APP_URL drives all public-facing URLs (vendor messages,
 * sitemaps, QR codes, share links).
 *
 * Current testing value: https://apnamap.vercel.app
 * Future production value: https://apnamap.com
 *
 * To switch domain: update NEXT_PUBLIC_APP_URL in Vercel dashboard
 * (or .env.local for local dev) — nothing else needs to change.
 */

/** Base URL for all public-facing links. No trailing slash. */
export const APP_URL =
  (process.env.NEXT_PUBLIC_APP_URL ?? "https://apnamap.vercel.app").replace(/\/$/, "");

/** Vendor login page URL — used in WhatsApp onboarding messages. */
export const VENDOR_LOGIN_URL = `${APP_URL}/vendor/login`;

/**
 * Vendor set-password page URL — used when admin creates accounts
 * and vendor needs to set a new password after first login.
 */
export const VENDOR_SET_PASSWORD_URL = `${APP_URL}/vendor/set-password`;

/**
 * Build a public shop URL from its slug.
 * Used for share links, QR codes, and admin-generated messages.
 */
export function shopUrl(slug: string): string {
  return `${APP_URL}/shop/${slug}`;
}

/**
 * INTERNAL: Supabase synthetic email domain for vendor auth.
 * This is NOT a real or public domain — it is only used as a string
 * format so Supabase email-auth works without a phone provider.
 * DO NOT change this value — existing vendor accounts in Supabase
 * are registered with this domain and would break if it changes.
 */
export const VENDOR_EMAIL_DOMAIN = "vendor.apnamap.in";

/** Build a vendor's synthetic Supabase email from their 10-digit mobile. */
export function vendorAuthEmail(digits: string): string {
  return `${digits}@${VENDOR_EMAIL_DOMAIN}`;
}

// ─── Phone normalization ──────────────────────────────────────────────────────
// Canonical format throughout the app: "+91XXXXXXXXXX"
// Use these helpers everywhere — never inline phone formatting.

/**
 * Normalize any Indian phone input to "+91XXXXXXXXXX".
 * Accepts: "9876543210", "+919876543210", "919876543210", "09876543210"
 * Returns null if the input cannot be resolved to exactly 10 digits.
 */
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  // Strip all non-digits
  let digits = raw.replace(/\D/g, "");
  // Handle "91XXXXXXXXXX" (12 digits starting with 91)
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  // Handle "0XXXXXXXXXX" (11 digits with leading 0)
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  return `+91${digits}`;
}

/**
 * Extract the raw 10-digit number from a canonical phone string.
 * e.g. "+919876543210" → "9876543210"
 */
export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}
