import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { getLanguage, setLanguage as persistLanguage, type SupportedLocale } from "../utils/languageStorage";

// Minimal translation: keys like "common.close" -> value. Loaded from bundled locale JSON.
import enLocale from "../data/locales/en.json";
import ltLocale from "../data/locales/lt.json";

function flatten(obj: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flatten(v, key));
      else out[key] = String(v);
    }
  }
  return out;
}

const enStrings: Record<string, string> = flatten(enLocale as Record<string, unknown>);
const ltStrings: Record<string, string> = flatten(ltLocale as Record<string, unknown>);

type LanguageContextValue = {
  language: SupportedLocale;
  setLanguage: (locale: SupportedLocale) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function translate(locale: SupportedLocale, key: string): string {
  if (locale === "lt") return ltStrings[key] ?? enStrings[key] ?? key;
  return enStrings[key] ?? key;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLocale>(() => getLanguage());

  const setLanguage = useCallback((locale: SupportedLocale) => {
    persistLanguage(locale);
    setLanguageState(locale);
  }, []);

  const t = useCallback((key: string) => translate(language, key), [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      language: getLanguage(),
      setLanguage: persistLanguage,
      t: (key: string) => enStrings[key] ?? key,
    };
  }
  return ctx;
}
