/**
 * lib/offer-engine/auto-offer.ts
 *
 * Generates safe, believable starter offers for new shops.
 *
 * Design rules (enforced throughout):
 *   ✗ No fake percentages or amounts
 *   ✗ No false urgency ("only 2 left!") unless a real expiry is set
 *   ✗ No superlatives ("best in city", "unbeatable prices")
 *   ✓ Generic, category-relevant, honest wording
 *   ✓ Short titles (≤ 60 chars) so they fit shop cards
 *   ✓ Hinglish raw input is cleaned to presentable English
 */

/* ── Types ──────────────────────────────────────────────────────────── */
export interface StarterOffer {
  title:          string;
  description:    string | null;
  source_type:    "auto_generated" | "vendor";
  raw_input_text: string | null;
}

interface OfferTemplate {
  title:       string;
  description: string;
}

/* ── Category template map ───────────────────────────────────────────
 * Keys are slug fragments or name substrings (lowercased, OR-matched).
 * Each entry provides 2 templates; one is picked deterministically by
 * hashing shopName so the same shop always gets the same offer.
 * ─────────────────────────────────────────────────────────────────── */
const CATEGORY_MAP: Array<{
  slugs: string[];
  names: string[];
  templates: [OfferTemplate, OfferTemplate];
}> = [
  {
    slugs: ["pharmacy", "medical", "medicine", "health", "chemist", "clinic", "hospital"],
    names: ["pharmacy", "medical", "medicine", "health", "chemist", "clinic", "hospital", "dawakhana", "dawa"],
    templates: [
      { title: "In-store savings on medicines today",        description: "Visit us and ask about today's available offers on medicines and healthcare products." },
      { title: "Healthcare offers available — ask in store", description: "Talk to our staff for current offers on prescription and over-the-counter medicines." },
    ],
  },
  {
    slugs: ["grocery", "kirana", "supermarket", "vegetables", "fruits", "sabzi"],
    names: ["grocery", "kirana", "supermarket", "vegetables", "fruits", "sabzi", "general store"],
    templates: [
      { title: "Fresh stock and local deals available",    description: "Daily fresh stock at local prices. Ask us for today's special items." },
      { title: "Daily grocery deals — visit the store",   description: "Seasonal and daily deals on groceries. Drop in to check today's availability." },
    ],
  },
  {
    slugs: ["restaurant", "food", "cafe", "dhaba", "biryani", "sweet", "mithai", "bakery", "juice", "fast-food", "pizza", "chinese"],
    names: ["restaurant", "food", "cafe", "dhaba", "biryani", "sweet", "mithai", "bakery", "juice", "snacks", "tiffin", "canteen"],
    templates: [
      { title: "Today's special available at the shop",   description: "Fresh preparation, good taste. Ask us what's special on the menu today." },
      { title: "Fresh food available — walk in welcome",  description: "Home-style cooking and fresh daily specials. Come in and ask about today's menu." },
    ],
  },
  {
    slugs: ["salon", "beauty", "parlour", "parlor", "spa", "haircut", "makeup"],
    names: ["salon", "beauty", "parlour", "parlor", "spa", "haircut", "makeup", "grooming", "unisex"],
    templates: [
      { title: "Salon services available — inquire inside",  description: "Quality grooming services available. Ask about today's offers on treatments and packages." },
      { title: "Beauty offers for today — visit us",         description: "Special service packages available. Walk in and ask our team for details." },
    ],
  },
  {
    slugs: ["clothing", "fashion", "garment", "boutique", "saree", "kurta", "dress", "apparel", "textile"],
    names: ["clothing", "fashion", "garment", "boutique", "saree", "kurta", "dress", "apparel", "textile", "readymade"],
    templates: [
      { title: "New arrivals and in-store selections today",  description: "Latest designs and seasonal stock available. Visit us to browse." },
      { title: "In-store clothing deals — walk in welcome",   description: "Wide range of designs available. Ask about current collections and special prices." },
    ],
  },
  {
    slugs: ["electronics", "mobile", "computer", "laptop", "repair", "gadget", "appliance", "cctv"],
    names: ["electronics", "mobile", "computer", "laptop", "repair", "gadget", "appliance", "camera", "cctv", "accessories"],
    templates: [
      { title: "In-store offers on electronics today",        description: "Products, accessories, and repair services available. Ask us about today's prices." },
      { title: "Electronics deals available — ask inside",    description: "New and service offers available. Walk in for a free consultation on your needs." },
    ],
  },
  {
    slugs: ["real-estate", "property", "plot", "flat", "house", "rental"],
    names: ["real estate", "property", "plot", "flat", "house", "rental", "pg", "hostel"],
    templates: [
      { title: "Property listings available — contact us",    description: "Current properties for sale or rent. Call or visit for a free consultation." },
      { title: "Free property consultation available",        description: "Residential and commercial listings available in the area. Get in touch for details." },
    ],
  },
  {
    slugs: ["jewellery", "jewelry", "gold", "silver", "ornament"],
    names: ["jewellery", "jewelry", "gold", "silver", "ornament", "bangles", "necklace"],
    templates: [
      { title: "Latest jewellery designs available in store", description: "Fresh designs and hallmarked jewellery available. Visit us for current selections." },
      { title: "In-store jewellery offers today",             description: "Wide collection of traditional and modern designs. Ask about in-store pricing." },
    ],
  },
  {
    slugs: ["stationery", "books", "school", "study", "coaching", "tuition"],
    names: ["stationery", "books", "school", "study", "coaching", "tuition", "education", "printing"],
    templates: [
      { title: "Stationery and book offers available",        description: "School supplies, books, and more available at everyday prices. Visit us today." },
      { title: "In-store deals on books and supplies",        description: "Wide range of educational materials and stationery. Ask about current stock." },
    ],
  },
  {
    slugs: ["hardware", "paint", "plumbing", "sanitary", "construction", "tools"],
    names: ["hardware", "paint", "plumbing", "sanitary", "construction", "tools", "building"],
    templates: [
      { title: "Hardware and material deals in store",        description: "Construction materials, tools, and supplies available. Ask about bulk pricing." },
      { title: "In-store offers on hardware today",           description: "Wide range of materials and tools at local prices. Visit for availability." },
    ],
  },
  {
    slugs: ["gym", "fitness", "yoga", "sports", "cycling"],
    names: ["gym", "fitness", "yoga", "sports", "cycling", "martial", "zumba"],
    templates: [
      { title: "Fitness membership offers available",         description: "Join us for health and fitness. Ask about membership plans and current offers." },
      { title: "Special fitness packages — inquire inside",   description: "Trial sessions and monthly plans available. Visit and ask our team." },
    ],
  },
];

/* ── Hinglish → English cleanup ─────────────────────────────────────
 * Applied when raw vendor input contains Hindi/Hinglish markers.
 * Substitutions are conservative — only well-known short words.
 * ─────────────────────────────────────────────────────────────────── */
const HINGLISH_SUBS: Array<[RegExp, string]> = [
  [/\baaj\b/gi,       "today"],
  [/\bkal\b/gi,       "tomorrow"],
  [/\bhai\b/gi,       "available"],
  [/\bhain\b/gi,      "available"],
  [/\bpe\b/gi,        "on"],
  [/\bpar\b/gi,       "on"],
  [/\bmein\b/gi,      "in"],
  [/\bme\b/gi,        "in"],
  [/\bse\b/gi,        "from"],
  [/\bko\b/gi,        ""],
  [/\bke liye\b/gi,   "for"],
  [/\bka\b/gi,        "of"],
  [/\bki\b/gi,        "of"],
  [/\bke\b/gi,        "of"],
  [/\bwala\b/gi,      ""],
  [/\bwali\b/gi,      ""],
  [/\bwale\b/gi,      ""],
  [/\bkaro\b/gi,      "get"],
  [/\bmilta\b/gi,     "available"],
  [/\bmilega\b/gi,    "available"],
  [/\bbhi\b/gi,       "also"],
  [/\baur\b/gi,       "and"],
  [/\bnahi\b/gi,      ""],
  [/\bsirf\b/gi,      "only"],
  [/\bjaldi\b/gi,     "today"],
  [/\babhi\b/gi,      "now"],
  [/\bkuch\b/gi,      "some"],
  [/\bsab\b/gi,       "all"],
  [/\bbaar\b/gi,      "time"],
  [/\bkhaas\b/gi,     "special"],
];

/** Regex that matches Devanagari script or common Hinglish marker words */
const HINGLISH_PATTERN = /[\u0900-\u097F]|\b(pe|hai|hain|aaj|mein|wala|wali|milta|milega|karo|sirf|jaldi|abhi|nahi|bhi|aur|se)\b/i;

function isHinglish(text: string): boolean {
  return HINGLISH_PATTERN.test(text);
}

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Attempt to clean Hinglish raw input into presentable English.
 * Returns null if the result is too short or still looks broken.
 */
function cleanRawInput(raw: string): string | null {
  if (!isHinglish(raw)) return null; // not Hinglish — caller handles as-is

  let cleaned = raw;
  for (const [pattern, replacement] of HINGLISH_SUBS) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  // Remove leftover Devanagari characters
  cleaned = cleaned.replace(/[\u0900-\u097F]+/g, "").trim();
  // Collapse multiple spaces
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();

  // Validate: must be >= 10 chars and <= 60 chars to be usable
  if (cleaned.length < 10 || cleaned.length > 80) return null;

  return titleCase(cleaned);
}

/* ── Template picker ────────────────────────────────────────────────
 * Picks deterministically by hashing shop name → always same offer
 * for the same shop, but different shops get variety.
 * ─────────────────────────────────────────────────────────────────── */
function pickTemplate(shopName: string, templates: [OfferTemplate, OfferTemplate]): OfferTemplate {
  const hash = shopName.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return templates[hash % 2];
}

function findTemplates(
  categorySlug: string,
  categoryName: string
): [OfferTemplate, OfferTemplate] | null {
  const slug = categorySlug.toLowerCase();
  const name = categoryName.toLowerCase();

  for (const entry of CATEGORY_MAP) {
    if (
      entry.slugs.some(s => slug.includes(s)) ||
      entry.names.some(n => name.includes(n))
    ) {
      return entry.templates;
    }
  }
  return null;
}

const FALLBACK_TEMPLATES: [OfferTemplate, OfferTemplate] = [
  { title: "Special offer available — visit the store",  description: "Current deals and offers available. Drop in or call us for details." },
  { title: "In-store deals available today",             description: "Ask our team about current offers and available products/services." },
];

/* ── Public API ─────────────────────────────────────────────────────── */

/**
 * Generate a starter offer for a new shop.
 *
 * @param categorySlug  - The category's slug string (e.g. "pharmacy-medical")
 * @param categoryName  - The category's display name (e.g. "Pharmacy")
 * @param shopName      - Used for deterministic template selection
 * @param rawInput      - Optional: what the vendor typed (may be Hinglish or empty)
 *
 * @returns StarterOffer with title, description, source_type, and raw_input_text
 */
export function generateStarterOffer(
  categorySlug: string,
  categoryName: string,
  shopName:     string,
  rawInput?:    string,
): StarterOffer {
  const raw = (rawInput ?? "").trim();

  // ── Case 1: vendor provided clean, meaningful English input ──────
  if (raw.length >= 10 && !isHinglish(raw)) {
    return {
      title:          raw.slice(0, 80),  // cap at 80 chars
      description:    null,
      source_type:    "vendor",
      raw_input_text: null,
    };
  }

  // ── Case 2: vendor provided Hinglish — try to clean it ──────────
  if (raw.length > 0 && isHinglish(raw)) {
    const cleaned = cleanRawInput(raw);
    if (cleaned) {
      return {
        title:          cleaned,
        description:    null,
        source_type:    "auto_generated",
        raw_input_text: raw,
      };
    }
    // Cleanup failed — fall through to category template but keep raw
  }

  // ── Case 3: no input or cleanup failed — use category template ───
  const templates = findTemplates(categorySlug, categoryName) ?? FALLBACK_TEMPLATES;
  const tpl       = pickTemplate(shopName, templates);

  return {
    title:          tpl.title,
    description:    tpl.description,
    source_type:    "auto_generated",
    raw_input_text: raw.length > 0 ? raw : null,
  };
}
