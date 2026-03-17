/**
 * Premium gate: isPremium from localStorage (for testing; production = server-verified).
 */
import { createContext, useContext, useState, useCallback, useMemo } from "react";

const STORAGE_KEY = "cradl-premium";

function readPremium(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return false;
    return raw === "true" || JSON.parse(raw) === true;
  } catch {
    return false;
  }
}

interface PremiumContextValue {
  isPremium: boolean;
  setPremiumForTesting: (value: boolean) => void;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setPremium] = useState(readPremium);
  const setPremiumForTesting = useCallback((value: boolean) => {
    setPremium(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {}
  }, []);
  const value = useMemo(() => ({ isPremium, setPremiumForTesting }), [isPremium, setPremiumForTesting]);
  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) {
    return {
      isPremium: false,
      setPremiumForTesting: () => {},
    };
  }
  return ctx;
}
