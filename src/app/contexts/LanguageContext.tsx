import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { getLanguage, setLanguage as persistLanguage, type SupportedLocale } from "../utils/languageStorage";

import enLocale from "../data/locales/en.json";
import ltLocale from "../data/locales/lt.json";
import deLocale from "../data/locales/de.json";
import frLocale from "../data/locales/fr.json";
import esLocale from "../data/locales/es.json";

// ---------------------------------------------------------------------------
// Flatten nested JSON into dot-notation keys: { common: { close: "X" } } → { "common.close": "X" }
// ---------------------------------------------------------------------------

function flatten(obj: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      if (k.startsWith("_")) continue; // skip comment markers like _medical_content_in_english
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        Object.assign(out, flatten(v, key));
      } else {
        out[key] = String(v);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Flattened string maps per locale, with English as the canonical fallback
// ---------------------------------------------------------------------------

const localeStrings: Record<SupportedLocale, Record<string, string>> = {
  en: flatten(enLocale),
  lt: flatten(ltLocale),
  de: flatten(deLocale),
  fr: flatten(frLocale),
  es: flatten(esLocale),
};

const enStrings = localeStrings.en;

// ---------------------------------------------------------------------------
// CLDR plural rules per locale
// Lithuanian has three forms: one, few, other
// German/French/Spanish/English have two: one, other
// ---------------------------------------------------------------------------

type PluralForm = "one" | "few" | "other";

function getPluralForm(locale: SupportedLocale, count: number): PluralForm {
  const n = Math.abs(count);

  if (locale === "lt") {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && (mod100 < 11 || mod100 > 19)) return "one";
    if (mod10 >= 2 && mod10 <= 9 && (mod100 < 11 || mod100 > 19)) return "few";
    return "other";
  }

  // en, de, fr, es — standard one/other
  return n === 1 ? "one" : "other";
}

// ---------------------------------------------------------------------------
// Interpolation: replaces {{key}} tokens with provided param values
// ---------------------------------------------------------------------------

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = params[key];
    return val != null ? String(val) : `{{${key}}}`;
  });
}

// ---------------------------------------------------------------------------
// Core translate function
// ---------------------------------------------------------------------------

function translate(
  locale: SupportedLocale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const strings = localeStrings[locale];
  const count = params?.count;

  // If `count` is provided, try plural-suffixed keys first
  if (count != null && typeof count === "number") {
    const form = getPluralForm(locale, count);
    const pluralKey = `${key}_${form}`;

    // Try current locale plural → current locale base → English plural → English base → raw key
    const raw =
      strings[pluralKey] ??
      strings[key] ??
      enStrings[pluralKey] ??
      enStrings[key] ??
      key;

    return interpolate(raw, params!);
  }

  const raw = strings[key] ?? enStrings[key] ?? key;
  return params ? interpolate(raw, params) : raw;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

type LanguageContextValue = {
  language: SupportedLocale;
  setLanguage: (locale: SupportedLocale) => void;
  t: TranslateFn;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLocale>(() => getLanguage());

  const setLanguage = useCallback((locale: SupportedLocale) => {
    persistLanguage(locale);
    setLanguageState(locale);
  }, []);

  const t: TranslateFn = useCallback(
    (key, params) => translate(language, key, params),
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      language: getLanguage(),
      setLanguage: persistLanguage,
      t: (key, params) => translate("en", key, params),
    };
  }
  return ctx;
}
