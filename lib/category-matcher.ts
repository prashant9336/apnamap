/**
 * lib/category-matcher.ts
 *
 * Three-layer smart business-type detector.
 *
 * Layer 1: Bigram keyword matching (highest specificity)
 * Layer 2: Unigram keyword matching (fallback tokens)
 * Layer 3: Category-level confidence aggregation
 *          (handles "kirana and dairy" correctly — both hit
 *           grocery-daily-needs so category confidence = high
 *           even though subcategories differ)
 *
 * Confidence thresholds:
 *   high   >= 0.7  → auto-select, ask vendor to confirm
 *   medium  0.4–0.7 → show top 3 options
 *   low    < 0.4   → manual picker
 */

import { SYNONYM_MAP, type SynonymEntry } from "./category-synonyms";

export interface CategoryMatch {
  categorySlug: string;
  subcategorySlug: string;
  customBusinessType: string;  // human-readable label from matched term
  tags: string[];
  score: number;
  confidence: number;          // 0–1, based on category-level aggregation
}

export interface MatchResult {
  primary: CategoryMatch | null;
  alternatives: CategoryMatch[];   // up to 2 runners-up (different categories)
  level: "high" | "medium" | "low";
  inputText: string;
}

// ── Normalise input ────────────────────────────────────────────
function normalise(input: string): string {
  return input
    .toLowerCase()
    .trim()
    // keep Hindi Unicode block (U+0900–U+097F) and alphanumerics
    .replace(/[^\w\s\u0900-\u097F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Score accumulator ─────────────────────────────────────────
interface SubScore {
  catSlug: string;
  subSlug: string;
  score: number;
  tags: Set<string>;
  label: string;   // best matched term for customBusinessType suggestion
}

function addHit(
  map: Map<string, SubScore>,
  entry: SynonymEntry,
  term: string
) {
  const key = `${entry.category}|${entry.subcategory}`;
  const existing = map.get(key);
  if (existing) {
    existing.score += entry.weight;
    entry.tags.forEach(t => existing.tags.add(t));
    // prefer higher-weight terms as label
    if (entry.weight > (SYNONYM_MAP[existing.label]?.weight ?? 0)) {
      existing.label = term;
    }
  } else {
    map.set(key, {
      catSlug:  entry.category,
      subSlug:  entry.subcategory,
      score:    entry.weight,
      tags:     new Set(entry.tags),
      label:    term,
    });
  }
}

// ── Main export ───────────────────────────────────────────────
export function matchBusinessType(rawInput: string): MatchResult {
  const inputText = rawInput.trim();

  if (!inputText) {
    return { primary: null, alternatives: [], level: "low", inputText };
  }

  const norm = normalise(inputText);
  const tokens = norm.split(" ").filter(Boolean);

  const subScores = new Map<string, SubScore>();
  const matchedPositions = new Set<number>(); // track positions consumed by bigrams

  // Layer 1: bigrams
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = `${tokens[i]} ${tokens[i + 1]}`;
    const entry = SYNONYM_MAP[bigram];
    if (entry) {
      addHit(subScores, entry, bigram);
      matchedPositions.add(i);
      matchedPositions.add(i + 1);
    }
  }

  // Layer 2: unigrams (skip positions already consumed by a bigram)
  tokens.forEach((token, i) => {
    if (matchedPositions.has(i)) return;
    const entry = SYNONYM_MAP[token];
    if (entry) addHit(subScores, entry, token);
  });

  if (subScores.size === 0) {
    return { primary: null, alternatives: [], level: "low", inputText };
  }

  // Layer 3: aggregate to category level
  const catTotals = new Map<string, number>();
  const subScoreArr = Array.from(subScores.values());
  for (const sub of subScoreArr) {
    catTotals.set(sub.catSlug, (catTotals.get(sub.catSlug) ?? 0) + sub.score);
  }

  const catTotalsArr = Array.from(catTotals.entries());
  const totalAllCats = catTotalsArr.reduce((a, [, v]) => a + v, 0);
  const sortedCats   = catTotalsArr.sort((a, b) => b[1] - a[1]);
  const topCatSlug   = sortedCats[0][0];
  const topCatScore  = sortedCats[0][1];

  // Confidence = share of total score belonging to the winning category
  const catConfidence = totalAllCats > 0 ? topCatScore / totalAllCats : 0;

  // Best subcategory within winning category
  const topSub = subScoreArr
    .filter(s => s.catSlug === topCatSlug)
    .sort((a, b) => b.score - a.score)[0];

  const toMatch = (sub: SubScore, conf: number): CategoryMatch => ({
    categorySlug:       sub.catSlug,
    subcategorySlug:    sub.subSlug,
    customBusinessType: capitalise(sub.label),
    tags:               Array.from(sub.tags),
    score:              sub.score,
    confidence:         conf,
  });

  const primary = toMatch(topSub, catConfidence);

  // Alternatives: top subcategory of each other category (up to 2)
  const otherCats = sortedCats
    .filter(([slug]) => slug !== topCatSlug)
    .slice(0, 2);

  const alternatives: CategoryMatch[] = otherCats.map(([slug, score]) => {
    const bestSub = subScoreArr
      .filter(s => s.catSlug === slug)
      .sort((a, b) => b.score - a.score)[0];
    const altConf = totalAllCats > 0 ? score / totalAllCats : 0;
    return toMatch(bestSub, altConf);
  });

  const level: MatchResult["level"] =
    catConfidence >= 0.7 ? "high" :
    catConfidence >= 0.4 ? "medium" : "low";

  return { primary, alternatives, level, inputText };
}

// ── Helpers ───────────────────────────────────────────────────
function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Derive a human-readable custom business type label from the raw input */
export function suggestCustomType(input: string): string {
  const norm = input.trim();
  if (!norm) return "";
  // Title-case each word, max 40 chars
  return norm
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
    .slice(0, 40);
}

/** Derive tag suggestions from raw input tokens not already in tags */
export function suggestTags(input: string, existingTags: string[]): string[] {
  const words = input.toLowerCase().trim().split(/\s+/).filter(w => w.length > 2);
  const existing = new Set(existingTags.map(t => t.toLowerCase()));
  const stopWords = new Set(["and", "the", "for", "with", "shop", "store", "near", "in"]);
  return words
    .filter(w => !existing.has(w) && !stopWords.has(w))
    .slice(0, 5);
}
