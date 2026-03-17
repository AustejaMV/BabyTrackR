/**
 * Family role: primary (full app) vs partner (simplified caregiver view).
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type FamilyRole = "primary" | "partner";

const STORAGE_KEY = "cradl-family-role";

function loadRole(): FamilyRole {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "partner" || raw === "primary") return raw;
    return "primary";
  } catch {
    return "primary";
  }
}

function saveRole(role: FamilyRole): void {
  try {
    localStorage.setItem(STORAGE_KEY, role);
  } catch {}
}

interface RoleContextValue {
  role: FamilyRole;
  setRole: (role: FamilyRole) => void;
  isPartnerView: boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<FamilyRole>(loadRole);

  useEffect(() => {
    saveRole(role);
  }, [role]);

  const setRole = useCallback((next: FamilyRole) => {
    setRoleState(next);
  }, []);

  const value: RoleContextValue = {
    role,
    setRole,
    isPartnerView: role === "partner",
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    return {
      role: "primary",
      setRole: () => {},
      isPartnerView: false,
    };
  }
  return ctx;
}
