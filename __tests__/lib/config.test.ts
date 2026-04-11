import { describe, it, expect } from "vitest";
import { normalizePhone, phoneDigits, vendorAuthEmail } from "../../lib/config";

describe("normalizePhone", () => {
  it("normalizes 10-digit raw input", () => {
    expect(normalizePhone("9876543210")).toBe("+919876543210");
  });

  it("normalizes +91 prefixed input", () => {
    expect(normalizePhone("+919876543210")).toBe("+919876543210");
  });

  it("normalizes 91-prefixed 12-digit input", () => {
    expect(normalizePhone("919876543210")).toBe("+919876543210");
  });

  it("normalizes 0-prefixed 11-digit input", () => {
    expect(normalizePhone("09876543210")).toBe("+919876543210");
  });

  it("strips spaces and dashes", () => {
    expect(normalizePhone("98765 43210")).toBe("+919876543210");
    expect(normalizePhone("98765-43210")).toBe("+919876543210");
  });

  it("returns null for short input", () => {
    expect(normalizePhone("12345")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizePhone("")).toBeNull();
  });

  it("returns null for 9-digit input", () => {
    expect(normalizePhone("987654321")).toBeNull();
  });
});

describe("phoneDigits", () => {
  it("extracts last 10 digits from canonical phone", () => {
    expect(phoneDigits("+919876543210")).toBe("9876543210");
  });
});

describe("vendorAuthEmail", () => {
  it("builds synthetic vendor email", () => {
    expect(vendorAuthEmail("9876543210")).toBe("9876543210@vendor.apnamap.in");
  });
});
