import { createContext, useCallback, useContext, useMemo, useState } from "react";

const STORAGE_KEY = "babytrackr-theme";

function applyDark(isDark: boolean) {
  const root = document.documentElement;
  if (isDark) root.classList.add("dark");
  else root.classList.remove("dark");
}

function getStoredDark(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { isDark?: boolean } };
      return parsed?.state?.isDark === true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function setStoredDark(isDark: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { isDark } }));
  } catch {
    /* ignore */
  }
}

type ThemeContextValue = { isDark: boolean; toggle: () => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(getStoredDark);

  const toggle = useCallback(() => {
    const next = !isDark;
    setIsDark(next);
    applyDark(next);
    setStoredDark(next);
  }, [isDark]);

  const value = useMemo(() => ({ isDark, toggle }), [isDark, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeStore(): ThemeContextValue;
export function useThemeStore<T>(selector: (s: ThemeContextValue) => T): T;
export function useThemeStore<T>(selector?: (s: ThemeContextValue) => T): ThemeContextValue | T {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeStore must be used within ThemeProvider");
  if (selector) return selector(ctx);
  return ctx;
}

/** Call before React mounts to prevent theme flash. */
export function initTheme() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const isDark = parsed?.state?.isDark === true;
      applyDark(isDark);
    }
  } catch {
    /* ignore */
  }
}
