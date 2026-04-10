/**
 * Distributed rate limiting via Upstash Redis.
 *
 * Setup (one-time):
 *  1. Create a free Redis database at https://console.upstash.com
 *  2. Add to your .env.local (and Vercel env vars):
 *       UPSTASH_REDIS_REST_URL=https://...upstash.io
 *       UPSTASH_REDIS_REST_TOKEN=AX...
 *
 * If the env vars are absent (e.g. local dev without Redis), rate limiting
 * is skipped and the route proceeds normally — no crash, no false 429s.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis }     from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

function makeRedis(): Redis | null {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = makeRedis();

/**
 * Sliding-window rate limiters keyed by use-case.
 * All return null when Redis is not configured.
 */
const limiters = redis
  ? {
      /** OTP send: 3 requests per 5 minutes per IP */
      otp: new Ratelimit({
        redis,
        limiter:   Ratelimit.slidingWindow(3, "5 m"),
        prefix:    "rl:otp",
        analytics: false,
      }),

      /** Unlock (password gate): 10 attempts per 15 minutes per IP */
      unlock: new Ratelimit({
        redis,
        limiter:   Ratelimit.slidingWindow(10, "15 m"),
        prefix:    "rl:unlock",
        analytics: false,
      }),

      /** Vendor request form: 5 submissions per hour per IP */
      vendorRequest: new Ratelimit({
        redis,
        limiter:   Ratelimit.slidingWindow(5, "1 h"),
        prefix:    "rl:vendor_req",
        analytics: false,
      }),
    }
  : null;

/** Extract best-effort IP from Next.js request headers */
function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

type LimiterKey = keyof NonNullable<typeof limiters>;

/**
 * Check rate limit for the given limiter key.
 * Returns a 429 NextResponse if the limit is exceeded, or null if allowed.
 *
 * Usage:
 *   const block = await checkRate(req, "otp");
 *   if (block) return block;
 */
export async function checkRate(
  req: NextRequest,
  key: LimiterKey
): Promise<NextResponse | null> {
  if (!limiters) return null; // Redis not configured — skip

  const ip     = getIp(req);
  const result = await limiters[key].limit(ip);

  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After":          String(retryAfter),
          "X-RateLimit-Limit":    String(result.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset":    String(result.reset),
        },
      }
    );
  }

  return null;
}
