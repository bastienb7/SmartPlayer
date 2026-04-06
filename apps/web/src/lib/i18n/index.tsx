"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { en, type TranslationKey } from "./en";
import { fr } from "./fr";

type Locale = "en" | "fr";
type Translations = Record<TranslationKey, string>;

const translations: Record<Locale, Translations> = { en: en as Translations, fr: fr as unknown as Translations };

interface I18nContextType {
  locale: Locale;
  t: (key: TranslationKey) => string;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  t: (key) => en[key],
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = localStorage.getItem("sp_lang") as Locale | null;
    if (stored && (stored === "en" || stored === "fr")) {
      setLocaleState(stored);
    } else {
      // Auto-detect from browser
      const browserLang = navigator.language.slice(0, 2);
      if (browserLang === "fr") setLocaleState("fr");
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("sp_lang", l);
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    return translations[locale][key] || translations.en[key] || key;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="flex items-center gap-1 px-3 py-1.5">
      <button
        onClick={() => setLocale("en")}
        className={`text-xs px-2 py-1 rounded transition-colors ${locale === "en" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
      >
        EN
      </button>
      <button
        onClick={() => setLocale("fr")}
        className={`text-xs px-2 py-1 rounded transition-colors ${locale === "fr" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
      >
        FR
      </button>
    </div>
  );
}
