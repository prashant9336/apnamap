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
