import type { DealType } from "@/types";

interface Rule {
  type: DealType;
  weight: number;
  patterns: RegExp[];
}

const RULES: Rule[] = [
  {
    type: "clearance",
    weight: 10,
    patterns: [
      /clearance/i,
      /stock\s*saaf/i,
      /saaf\s*kar/i,
      /end\s*of\s*season/i,
      /purana\s*stock/i,
      /season\s*(end|sale)/i,
      /bhari\s*sale/i,
    ],
  },
  {
    type: "new_arrival",
    weight: 9,
    patterns: [
      /new\s*arrival/i,
      /fresh\s*stock/i,
      /naya\s*(stock|collection|maal|item)/i,
      /nayi\s*collection/i,
      /latest\s*collection/i,
      /aaya\s*h(ai|e|a)/i,
      /aa\s*gaya/i,
      /new\s*stock/i,
      /just\s*(arrived|aaya)/i,
    ],
  },
  {
    type: "limited_stock",
    weight: 8,
    patterns: [
      /limited\s*stock/i,
      /sirf\s*\d+\s*(piece|pcs|items?|bacha)/i,
      /stock\s*khatam\s*(ho\s*raha|hone\s*wala)/i,
      /last\s*(few|pieces|items|bachhe)/i,
      /bahut\s*kam\s*bacha/i,
      /thoda\s*hi\s*bacha/i,
      /jaldi\s*(lo|karo|aao)/i,
    ],
  },
  {
    type: "combo_offer",
    weight: 8,
    patterns: [
      /combo/i,
      /do\s*(lo|kharido|loge)\s*\w*\s*(ek|1|dusra)\s*(free|milega)/i,
      /buy\s*(one|1|two|2|three|3)\s*get\s*(one|1|free)/i,
      /bogo/i,
      /pack\s*(offer|deal|mein)/i,
      /saath\s*mein\s*(free|milega|denge)/i,
      /\d+\s*lo\s*\d+\s*(free|milega)/i,
      /ek\s*(ke\s*saath|pe)\s*(ek|dusra)\s*free/i,
    ],
  },
  {
    type: "festive_offer",
    weight: 7,
    patterns: [
      /festival/i,
      /festive/i,
      /diwali/i,
      /holi/i,
      /eid/i,
      /raksha\s*bandhan/i,
      /navratri/i,
      /christmas/i,
      /new\s*year/i,
      /shaadi\s*(season|offer)/i,
      /wedding\s*(season|offer)/i,
      /school\s*season/i,
      /back\s*to\s*school/i,
      /tyohar/i,
    ],
  },
  {
    type: "flash_deal",
    weight: 7,
    patterns: [
      /sirf\s*aaj/i,
      /aaj\s*(hi|tak|ke\s*liye|sirf)/i,
      /today\s*only/i,
      /flash\s*(deal|sale)/i,
      /limited\s*time/i,
      /sirf\s*(\d+|kuch)\s*(ghante|hours?)/i,
      /abhi\s*(hi|sirf|aao)/i,
      /tonight/i,
      /this\s*evening/i,
      /\d+\s*baje\s*tak/i,
    ],
  },
  {
    type: "big_deal",
    weight: 6,
    patterns: [
      /[4-9]\d\s*%\s*off/i,
      /[4-9]\d\s*percent/i,
      /bhaari\s*(discount|offer|chhutt|sale)/i,
      /heavy\s*discount/i,
      /bada\s*(offer|deal|discount|sale)/i,
      /upto\s*[4-9]\d\s*%/i,
      /half\s*price/i,
      /aadhe\s*daam/i,
    ],
  },
];

export function classifyDealType(text: string): DealType {
  let best: { type: DealType; score: number } = {
    type: "regular_offer",
    score: 0,
  };

  for (const rule of RULES) {
    let score = 0;
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) score += rule.weight;
    }
    if (score > best.score) {
      best = { type: rule.type, score };
    }
  }

  return best.type;
}
