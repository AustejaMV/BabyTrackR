/**
 * Language preference for i18n. Persisted in localStorage.
 * Supports: English, Lithuanian, German, French, Spanish.
 */

const KEY = "cradl-language";

export type SupportedLocale = "en" | "lt" | "de" | "fr" | "es";

const SUPPORTED: SupportedLocale[] = ["en", "lt", "de", "fr", "es"];

function isSupportedLocale(v: unknown): v is SupportedLocale {
  return typeof v === "string" && SUPPORTED.includes(v as SupportedLocale);
}

function detectDeviceLocale(): SupportedLocale {
  try {
    const langs = navigator.languages ?? [navigator.language];
    for (const tag of langs) {
      const code = tag.split("-")[0].toLowerCase();
      if (isSupportedLocale(code)) return code;
    }
  } catch {
    // SSR or restricted environment
  }
  return "en";
}

export function getLanguage(): SupportedLocale {
  try {
    const v = localStorage.getItem(KEY);
    if (isSupportedLocale(v)) return v;
    return detectDeviceLocale();
  } catch {
    return detectDeviceLocale();
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
  de: "Deutsch",
  fr: "Français",
  es: "Español",
};
