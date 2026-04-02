export interface ExtractedEntities {
  offerValueText: string | null;
  validityText: string | null;
  validUntil: Date | null;
  localityText: string | null;
  cleanedText: string;
}

// Matches common Prayagraj localities — extend as needed
const KNOWN_LOCALITIES: string[] = [
  "civil lines",
  "chowk bazar",
  "chowk",
  "katra",
  "rambagh",
  "naini",
  "george town",
  "allenganj",
  "tagore town",
  "lukerganj",
  "mumfordganj",
  "phaphamau",
  "jhunsi",
  "kalyani devi",
  "atala",
];

interface DiscountRule {
  pattern: RegExp;
  format: (m: RegExpMatchArray) => string;
}

const DISCOUNT_RULES: DiscountRule[] = [
  {
    pattern: /(\d+)\s*%\s*(?:off|discount|chhutt|ki\s*chhutt)/i,
    format: (m) => `${m[1]}% off`,
  },
  {
    pattern: /(\d+)\s*percent\s*(?:off|discount|ki\s*chhutt)?/i,
    format: (m) => `${m[1]}% off`,
  },
  {
    pattern: /(?:flat\s*)?(?:rs\.?|₹)\s*(\d+)\s*off/i,
    format: (m) => `₹${m[1]} off`,
  },
  {
    pattern: /(\d+)\s*rupees?\s*off/i,
    format: (m) => `₹${m[1]} off`,
  },
  {
    pattern: /half\s*price|aadhe\s*daam/i,
    format: () => "50% off",
  },
];

interface ValidityRule {
  pattern: RegExp;
  resolve: (m: RegExpMatchArray) => { text: string; date: Date };
}

const VALIDITY_RULES: ValidityRule[] = [
  {
    pattern: /sirf\s*aaj|today\s*only|aaj\s*(hi|tak|ke\s*liye)/i,
    resolve: () => {
      const d = new Date();
      d.setHours(23, 59, 59, 0);
      return { text: "Today only", date: d };
    },
  },
  {
    pattern: /kal\s*tak|till\s*tomorrow|by\s*tomorrow/i,
    resolve: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(23, 59, 59, 0);
      return { text: "Till tomorrow", date: d };
    },
  },
  {
    pattern: /(\d+)\s*din\s*(?:tak|ke\s*liye)|(\d+)\s*days?/i,
    resolve: (m) => {
      const days = parseInt(m[1] ?? m[2]);
      const d = new Date();
      d.setDate(d.getDate() + days);
      d.setHours(23, 59, 59, 0);
      return { text: `${days} day${days !== 1 ? "s" : ""}`, date: d };
    },
  },
  {
    pattern: /weekend\s*tak|till\s*(the\s*)?weekend|this\s*weekend/i,
    resolve: () => {
      const d = new Date();
      const day = d.getDay(); // 0=Sun
      const toSunday = day === 0 ? 0 : 7 - day;
      d.setDate(d.getDate() + toSunday);
      d.setHours(23, 59, 59, 0);
      return { text: "This weekend", date: d };
    },
  },
  {
    pattern: /is\s*mahine\s*(?:tak|ke\s*end\s*tak)|this\s*month|end\s*of\s*month/i,
    resolve: () => {
      const now = new Date();
      const d = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { text: "End of month", date: d };
    },
  },
  {
    pattern: /is\s*hafte\s*(?:tak)?|this\s*week/i,
    resolve: () => {
      const d = new Date();
      const toSat = 6 - d.getDay();
      d.setDate(d.getDate() + (toSat < 0 ? 0 : toSat));
      d.setHours(23, 59, 59, 0);
      return { text: "This week", date: d };
    },
  },
];

const FILLER_PATTERN = /\b(umm+|uh+|ah+|hmm+|err+|ahem|haww|haan\s*toh|toh\s*bhai|bhai\s*log)\b/gi;

export function extractEntities(text: string): ExtractedEntities {
  let offerValueText: string | null = null;
  let validityText: string | null = null;
  let validUntil: Date | null = null;
  let localityText: string | null = null;

  // Extract discount
  for (const rule of DISCOUNT_RULES) {
    const m = text.match(rule.pattern);
    if (m) {
      offerValueText = rule.format(m);
      break;
    }
  }

  // Extract validity
  for (const rule of VALIDITY_RULES) {
    const m = text.match(rule.pattern);
    if (m) {
      const result = rule.resolve(m);
      validityText = result.text;
      validUntil = result.date;
      break;
    }
  }

  // Extract locality (case-insensitive substring match)
  const lower = text.toLowerCase();
  for (const loc of KNOWN_LOCALITIES) {
    if (lower.includes(loc)) {
      localityText = loc
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      break;
    }
  }

  // Clean transcript: strip filler words and collapse whitespace
  const cleanedText = text
    .replace(FILLER_PATTERN, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return { offerValueText, validityText, validUntil, localityText, cleanedText };
}
