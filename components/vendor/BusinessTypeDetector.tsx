"use client";

/**
 * BusinessTypeDetector
 *
 * Smart category selection component for vendor onboarding.
 * Renders a single text input → runs the keyword matcher →
 * shows a confirmation card (high confidence), 3 choices
 * (medium), or a manual category grid (low / fallback).
 *
 * Props:
 *   categories  – fetched from /api/categories (with subcategories)
 *   onChange    – called with the final CategorySelection whenever
 *                 the vendor confirms a choice
 *   initial     – pre-fill if editing an existing shop
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { matchBusinessType, suggestTags } from "@/lib/category-matcher";
import { EXAMPLE_INPUTS } from "@/lib/category-synonyms";
import type { Category, Subcategory } from "@/types";

// ── Public types ──────────────────────────────────────────────
export interface CategorySelection {
  category_id: string;
  subcategory_id: string | null;
  custom_business_type: string;
  tags: string[];
  business_input_text: string;
  ai_category_confidence: number;
}

interface Props {
  categories: Category[];
  onChange: (sel: CategorySelection) => void;
  initial?: Partial<CategorySelection>;
}

// ── Helpers ───────────────────────────────────────────────────
const DEBOUNCE_MS = 420;

function inputStyle(active: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 14,
    fontSize: 15,
    outline: "none",
    background: "rgba(255,255,255,0.06)",
    border: active
      ? "1.5px solid var(--accent)"
      : "1px solid rgba(255,255,255,0.10)",
    color: "var(--t1)",
    transition: "border 0.15s",
  };
}

const pill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "5px 11px",
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s",
};

// ── Component ─────────────────────────────────────────────────
export default function BusinessTypeDetector({
  categories,
  onChange,
  initial,
}: Props) {
  const [inputText, setInputText]           = useState(initial?.business_input_text ?? "");
  const [inputFocused, setInputFocused]     = useState(false);

  // "idle" | "detecting" | "suggest" | "manual"
  const [phase, setPhase]                   = useState<"idle" | "detecting" | "suggest" | "manual">("idle");

  const [matchResult, setMatchResult]       = useState<ReturnType<typeof matchBusinessType> | null>(null);

  // confirmed final selection
  const [selectedCatId, setSelectedCatId]   = useState(initial?.category_id ?? "");
  const [selectedSubId, setSelectedSubId]   = useState(initial?.subcategory_id ?? "");
  const [customType, setCustomType]          = useState(initial?.custom_business_type ?? "");
  const [tags, setTags]                      = useState<string[]>(initial?.tags ?? []);
  const [confirmed, setConfirmed]            = useState(false);

  // manual picker state
  const [manualCat, setManualCat]            = useState<Category | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Run matcher whenever input changes ──────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!inputText.trim()) {
      setPhase("idle");
      setMatchResult(null);
      return;
    }

    setPhase("detecting");
    debounceRef.current = setTimeout(() => {
      const result = matchBusinessType(inputText);
      setMatchResult(result);
      if (result.primary) {
        setPhase("suggest");
      } else {
        setPhase("manual");
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputText]);

  // ── Map slug → ID using API data ───────────────────────────
  function catBySlug(slug: string): Category | undefined {
    return categories.find(c => c.slug === slug);
  }
  function subBySlug(cat: Category, slug: string): Subcategory | undefined {
    return (cat.subcategories ?? []).find(s => s.slug === slug);
  }

  // ── Confirm a match (from suggestion card or manual) ────────
  function confirmMatch(
    catId: string,
    subId: string | null,
    label: string,
    matchTags: string[],
    confidence: number,
  ) {
    setSelectedCatId(catId);
    setSelectedSubId(subId ?? "");
    setCustomType(label);
    setTags(matchTags);
    setConfirmed(true);
    onChange({
      category_id:             catId,
      subcategory_id:          subId,
      custom_business_type:    label,
      tags:                    matchTags,
      business_input_text:     inputText,
      ai_category_confidence:  confidence,
    });
  }

  // ── Auto-confirm high-confidence match ──────────────────────
  useEffect(() => {
    if (
      phase === "suggest" &&
      matchResult?.level === "high" &&
      matchResult.primary &&
      !confirmed
    ) {
      const cat = catBySlug(matchResult.primary.categorySlug);
      if (!cat) return;
      const sub = subBySlug(cat, matchResult.primary.subcategorySlug);
      const extraTags = suggestTags(inputText, matchResult.primary.tags);
      setSelectedCatId(cat.id);
      setSelectedSubId(sub?.id ?? "");
      setCustomType(matchResult.primary.customBusinessType);
      setTags([...matchResult.primary.tags, ...extraTags]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, matchResult]);

  // ── Helpers for tag editing ─────────────────────────────────
  function removeTag(t: string) {
    const next = tags.filter(x => x !== t);
    setTags(next);
    if (confirmed) {
      onChange({
        category_id: selectedCatId,
        subcategory_id: selectedSubId || null,
        custom_business_type: customType,
        tags: next,
        business_input_text: inputText,
        ai_category_confidence: matchResult?.primary?.confidence ?? 0,
      });
    }
  }

  function addTag(t: string) {
    if (!t.trim() || tags.includes(t.trim())) return;
    const next = [...tags, t.trim().toLowerCase()];
    setTags(next);
    if (confirmed) {
      onChange({
        category_id: selectedCatId,
        subcategory_id: selectedSubId || null,
        custom_business_type: customType,
        tags: next,
        business_input_text: inputText,
        ai_category_confidence: matchResult?.primary?.confidence ?? 0,
      });
    }
  }

  // ── Manual confirm from grid ────────────────────────────────
  function handleManualConfirm() {
    if (!manualCat) return;
    const sub = (manualCat.subcategories ?? []).find(s => s.id === selectedSubId);
    confirmMatch(
      manualCat.id,
      sub?.id ?? null,
      customType || manualCat.name,
      tags,
      0.1,
    );
  }

  // ── Reset to start over ─────────────────────────────────────
  function reset() {
    setConfirmed(false);
    setPhase(inputText ? "suggest" : "idle");
    setMatchResult(inputText ? matchBusinessType(inputText) : null);
  }

  // ── Styles ──────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 16,
    padding: "14px 16px",
    marginTop: 10,
  };

  const accentCard: React.CSSProperties = {
    ...cardStyle,
    border: "1px solid rgba(255,94,26,0.35)",
    background: "rgba(255,94,26,0.06)",
  };

  const selectedCatObj = categories.find(c => c.id === selectedCatId);

  return (
    <div>
      {/* ── CONFIRMED SUMMARY ──────────────────────────────── */}
      {confirmed && selectedCatObj && (
        <motion.div
          key="confirmed"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          style={accentCard}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 26 }}>{selectedCatObj.icon}</span>
              <div>
                <div style={{ color: "white", fontWeight: 700, fontSize: 14 }}>
                  {selectedCatObj.name}
                </div>
                {selectedSubId && (
                  <div style={{ color: "rgba(255,94,26,0.9)", fontSize: 12, marginTop: 1 }}>
                    ↳ {(selectedCatObj.subcategories ?? []).find(s => s.id === selectedSubId)?.name}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={reset}
              style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", padding: "4px 8px" }}
            >
              Change
            </button>
          </div>

          {/* Tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {tags.map(t => (
              <span key={t} style={{ ...pill, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>
                {t}
                <button onClick={() => removeTag(t)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", padding: 0, fontSize: 13, lineHeight: 1 }}>×</button>
              </span>
            ))}
            <TagAdder onAdd={addTag} />
          </div>

          {/* Custom label */}
          <div style={{ marginTop: 10 }}>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 4 }}>Custom label (optional)</label>
            <input
              value={customType}
              onChange={e => setCustomType(e.target.value)}
              placeholder="e.g. Momos & Chowmein Corner"
              style={{ ...inputStyle(false), padding: "10px 12px", fontSize: 13 }}
            />
          </div>
        </motion.div>
      )}

      {/* ── INPUT ─────────────────────────────────────────── */}
      {!confirmed && (
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--t2)", marginBottom: 8 }}>
            What kind of business? <span style={{ color: "var(--accent)" }}>*</span>
          </label>

          <input
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="Describe your business in a few words…"
            style={inputStyle(inputFocused)}
            autoComplete="off"
          />

          {/* Example chips */}
          {phase === "idle" && (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {EXAMPLE_INPUTS.slice(0, 5).map(ex => (
                <button
                  key={ex}
                  onClick={() => setInputText(ex)}
                  style={{ ...pill, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {ex}
                </button>
              ))}
            </div>
          )}

          {/* Detecting spinner */}
          {phase === "detecting" && (
            <p style={{ fontSize: 12, color: "var(--t3)", marginTop: 8 }}>Detecting…</p>
          )}

          <AnimatePresence mode="wait">

            {/* ── HIGH / MEDIUM confidence: suggestion cards ─ */}
            {phase === "suggest" && matchResult && (
              <motion.div key="suggest" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                {/* HIGH: single confirm card */}
                {matchResult.level === "high" && matchResult.primary && (() => {
                  const cat = catBySlug(matchResult.primary.categorySlug);
                  const sub = cat ? subBySlug(cat, matchResult.primary.subcategorySlug) : undefined;
                  if (!cat) return null;
                  return (
                    <div style={accentCard}>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>
                        We think your business is —
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 28 }}>{cat.icon}</span>
                          <div>
                            <div style={{ color: "white", fontWeight: 700, fontSize: 14 }}>{cat.name}</div>
                            {sub && <div style={{ color: "rgba(255,94,26,0.9)", fontSize: 12, marginTop: 1 }}>↳ {sub.name}</div>}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => setPhase("manual")}
                            style={{ ...pill, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.10)" }}
                          >
                            Change
                          </button>
                          <button
                            onClick={() => {
                              const extraTags = suggestTags(inputText, matchResult.primary!.tags);
                              confirmMatch(cat.id, sub?.id ?? null, matchResult.primary!.customBusinessType, [...matchResult.primary!.tags, ...extraTags], matchResult.primary!.confidence);
                            }}
                            style={{ ...pill, background: "var(--accent)", color: "white" }}
                          >
                            Confirm ✓
                          </button>
                        </div>
                      </div>
                      {/* Tags preview */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
                        {[...matchResult.primary.tags, ...suggestTags(inputText, matchResult.primary.tags)].slice(0, 6).map(t => (
                          <span key={t} style={{ ...pill, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)", cursor: "default" }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* MEDIUM: 3 choices */}
                {matchResult.level === "medium" && (
                  <div style={cardStyle}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>
                      Not sure — which fits best?
                    </div>
                    {[matchResult.primary, ...matchResult.alternatives].filter(Boolean).map((m, i) => {
                      if (!m) return null;
                      const cat = catBySlug(m.categorySlug);
                      const sub = cat ? subBySlug(cat, m.subcategorySlug) : undefined;
                      if (!cat) return null;
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            const extraTags = suggestTags(inputText, m.tags);
                            confirmMatch(cat.id, sub?.id ?? null, m.customBusinessType, [...m.tags, ...extraTags], m.confidence);
                          }}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "10px 12px",
                            borderRadius: 12,
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            marginBottom: 6,
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <span style={{ fontSize: 22, flexShrink: 0 }}>{cat.icon}</span>
                          <div>
                            <div style={{ color: "white", fontSize: 13, fontWeight: 600 }}>{cat.name}</div>
                            {sub && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{sub.name}</div>}
                          </div>
                          <span style={{ marginLeft: "auto", color: "var(--t3)", fontSize: 16 }}>→</span>
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPhase("manual")}
                      style={{ width: "100%", padding: "8px", background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 12, cursor: "pointer", marginTop: 2 }}
                    >
                      None of these — let me pick manually
                    </button>
                  </div>
                )}

                {/* LOW: redirect to manual */}
                {matchResult.level === "low" && (
                  <div style={cardStyle}>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: 0 }}>
                      Couldn&apos;t detect the category automatically.
                    </p>
                    <button
                      onClick={() => setPhase("manual")}
                      style={{ marginTop: 10, padding: "9px 16px", borderRadius: 10, background: "var(--accent)", color: "white", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                    >
                      Pick category manually →
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── MANUAL PICKER ─────────────────────────────── */}
            {phase === "manual" && (
              <motion.div key="manual" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div style={{ ...cardStyle, padding: "14px 12px" }}>

                  {/* Category grid */}
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: "0 0 10px 4px" }}>Choose a category</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => { setManualCat(cat); setSelectedCatId(cat.id); setSelectedSubId(""); }}
                        style={{
                          padding: "10px 6px",
                          borderRadius: 12,
                          textAlign: "center",
                          background: manualCat?.id === cat.id ? "rgba(255,94,26,0.14)" : "rgba(255,255,255,0.04)",
                          border: manualCat?.id === cat.id ? "1.5px solid var(--accent)" : "1px solid rgba(255,255,255,0.07)",
                          color: manualCat?.id === cat.id ? "var(--accent)" : "rgba(255,255,255,0.55)",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        <div style={{ fontSize: 20 }}>{cat.icon}</div>
                        <div style={{ fontSize: 9.5, fontWeight: 600, marginTop: 4, lineHeight: 1.3 }}>{cat.name}</div>
                      </button>
                    ))}
                  </div>

                  {/* Subcategory chips */}
                  {manualCat && (manualCat.subcategories ?? []).length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: "0 0 8px 4px" }}>Subcategory (optional)</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                        {(manualCat.subcategories ?? []).map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => setSelectedSubId(sub.id === selectedSubId ? "" : sub.id)}
                            style={{
                              ...pill,
                              background: selectedSubId === sub.id ? "rgba(255,94,26,0.15)" : "rgba(255,255,255,0.05)",
                              border: selectedSubId === sub.id ? "1px solid rgba(255,94,26,0.5)" : "1px solid rgba(255,255,255,0.08)",
                              color: selectedSubId === sub.id ? "var(--accent)" : "rgba(255,255,255,0.5)",
                            }}
                          >
                            {sub.icon} {sub.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom label */}
                  {manualCat && (
                    <div style={{ marginTop: 12 }}>
                      <label style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 6 }}>Custom label (optional)</label>
                      <input
                        value={customType}
                        onChange={e => setCustomType(e.target.value)}
                        placeholder={`e.g. ${manualCat.name} specialist`}
                        style={{ ...inputStyle(false), padding: "10px 12px", fontSize: 13 }}
                      />
                    </div>
                  )}

                  {/* "Not listed" fallback */}
                  {!manualCat && (
                    <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.10)" }}>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: "0 0 6px" }}>My business is not listed above</p>
                      <input
                        value={customType}
                        onChange={e => setCustomType(e.target.value)}
                        placeholder="Describe your business type"
                        style={{ ...inputStyle(false), padding: "10px 12px", fontSize: 13 }}
                      />
                      {customType.trim() && (
                        <button
                          onClick={() => {
                            // Use "Other / Miscellaneous" category
                            const otherCat = categories.find(c => c.slug === "other-miscellaneous");
                            if (!otherCat) return;
                            confirmMatch(otherCat.id, null, customType.trim(), [], 0.05);
                          }}
                          style={{ marginTop: 8, padding: "9px 16px", borderRadius: 10, background: "rgba(255,94,26,0.8)", color: "white", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                        >
                          Use this →
                        </button>
                      )}
                    </div>
                  )}

                  {/* Confirm button */}
                  {manualCat && (
                    <button
                      onClick={handleManualConfirm}
                      style={{ marginTop: 14, width: "100%", padding: "11px", borderRadius: 12, background: "var(--accent)", color: "white", border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                    >
                      Confirm Category →
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ── Inline tag adder ─────────────────────────────────────────
function TagAdder({ onAdd }: { onAdd: (t: string) => void }) {
  const [val, setVal] = useState("");
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ ...{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }, background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)", border: "1px dashed rgba(255,255,255,0.12)" }}
      >
        + tag
      </button>
    );
  }
  return (
    <input
      autoFocus
      value={val}
      onChange={e => setVal(e.target.value)}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === ",") {
          e.preventDefault();
          onAdd(val);
          setVal("");
          setOpen(false);
        }
        if (e.key === "Escape") setOpen(false);
      }}
      onBlur={() => { if (val) onAdd(val); setOpen(false); }}
      placeholder="tag name"
      style={{ width: 90, padding: "4px 8px", borderRadius: 20, border: "1px solid rgba(255,94,26,0.4)", background: "rgba(255,94,26,0.08)", color: "var(--t1)", fontSize: 12, outline: "none" }}
    />
  );
}
