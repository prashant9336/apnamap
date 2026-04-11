/**
 * Unit tests for /api/vendor/register input validation.
 * Mocks Supabase so no real DB connection is needed.
 */
import { describe, it, expect, vi } from "vitest";

function makeReq(body: unknown): Request {
  return new Request("http://localhost/api/vendor/register", {
    method:  "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body:    JSON.stringify(body),
  });
}

// Stub out Supabase and rate limiter
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    auth: {
      getUser:   vi.fn().mockResolvedValue({ data: { user: null } }),
      admin:     { createUser: vi.fn().mockResolvedValue({ data: { user: { id: "uid-1" } }, error: null }) },
      signInWithPassword: vi.fn().mockResolvedValue({ data: { session: null }, error: { message: "mock" } }),
    },
    from: (_: string) => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
      upsert: () => Promise.resolve({ error: null }),
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: "shop-1", slug: "test" }, error: null }) }) }),
    }),
  }),
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRate: vi.fn().mockResolvedValue(null), // never block in tests
}));

describe("POST /api/vendor/register — validation", () => {
  it("rejects missing owner_name", async () => {
    const { POST } = await import("../../app/api/vendor/register/route");
    const res = await POST(makeReq({ mobile: "9876543210", password: "pass123", shop_name: "Shop", category_id: "cat", locality_id: "loc" }) as any);
    expect(res.status).toBe(400);
    const b = await res.json();
    expect(b.error).toMatch(/owner name/i);
  });

  it("rejects invalid mobile (too short)", async () => {
    const { POST } = await import("../../app/api/vendor/register/route");
    const res = await POST(makeReq({ owner_name: "Test", mobile: "12345", password: "pass123", shop_name: "Shop", category_id: "cat", locality_id: "loc" }) as any);
    expect(res.status).toBe(400);
    const b = await res.json();
    expect(b.error).toMatch(/mobile/i);
  });

  it("rejects short password", async () => {
    const { POST } = await import("../../app/api/vendor/register/route");
    const res = await POST(makeReq({ owner_name: "Test", mobile: "9876543210", password: "12", shop_name: "Shop", category_id: "cat", locality_id: "loc" }) as any);
    expect(res.status).toBe(400);
    const b = await res.json();
    expect(b.error).toMatch(/password/i);
  });

  it("rejects missing shop_name", async () => {
    const { POST } = await import("../../app/api/vendor/register/route");
    const res = await POST(makeReq({ owner_name: "Test", mobile: "9876543210", password: "pass123", category_id: "cat", locality_id: "loc" }) as any);
    expect(res.status).toBe(400);
    const b = await res.json();
    expect(b.error).toMatch(/shop name/i);
  });

  it("rejects missing category_id", async () => {
    const { POST } = await import("../../app/api/vendor/register/route");
    const res = await POST(makeReq({ owner_name: "Test", mobile: "9876543210", password: "pass123", shop_name: "Shop", locality_id: "loc" }) as any);
    expect(res.status).toBe(400);
  });
});
