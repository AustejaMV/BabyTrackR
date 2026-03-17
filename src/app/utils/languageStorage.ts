/**
 * Language preference for i18n. Persisted in localStorage.
 */

const KEY = "cradl-language";

export type SupportedLocale = "en" | "lt";

const DEFAULT: SupportedLocale = "en";

export function getLanguage(): SupportedLocale {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "en" || v === "lt") return v;
    return DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function setLanguage(locale: SupportedLocale): void {
  try {
    localStorage.setItem(KEY, locale);
  } catch {}
}

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  lt: "Lietuvių",
};
