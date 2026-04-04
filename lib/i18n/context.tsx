"use client";

/**
 * Lightweight i18n context — no external library.
 *
 * Usage:
 *   // Wrap your app (or a subtree) in <I18nProvider>:
 *   <I18nProvider><App /></I18nProvider>
 *
 *   // In any client component:
 *   const { t, lang, setLang } = useI18n();
 *   <p>{t("openNow")}</p>
 */

import {
  createContext, useContext, useState, useEffect,
  type ReactNode,
} from "react";
import { translations, type Lang, type TranslationKey } from "./translations";

const STORAGE_KEY = "apnamap_lang";

interface I18nCtx {
  lang:    Lang;
  setLang: (l: Lang) => void;
  t:       (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nCtx>({
  lang:    "en",
  setLang: () => {},
  t:       (k) => translations.en[k],
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved === "en" || saved === "hi") setLangState(saved);
    } catch {}
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  }

  function t(key: TranslationKey): string {
    return translations[lang][key] ?? translations.en[key] ?? key;
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nCtx {
  return useContext(I18nContext);
}
