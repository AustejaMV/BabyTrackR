import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getBabies,
  getActiveBabyId,
  setActiveBabyId as setActiveBabyIdStorage,
  addBaby as addBabyStorage,
  updateBaby,
  removeBaby as removeBabyStorage,
  saveCurrentDataToBaby,
  loadBabyDataIntoCurrent,
  type Baby,
} from "../data/babiesStorage";

interface BabyContextValue {
  babies: Baby[];
  activeBaby: Baby | null;
  activeBabyId: string | null;
  setActiveBabyId: (id: string) => void;
  addBaby: (baby: Omit<Baby, "id">) => Baby;
  updateActiveBaby: (updates: Partial<Omit<Baby, "id">>) => void;
  removeBaby: (id: string) => void;
  refresh: () => void;
}

const BabyContext = createContext<BabyContextValue | null>(null);

export function BabyProvider({ children }: { children: ReactNode }) {
  const [babies, setBabies] = useState<Baby[]>(() => getBabies());
  const [activeId, setActiveId] = useState<string | null>(() => getActiveBabyId());

  const refresh = useCallback(() => {
    setBabies(getBabies());
    setActiveId(getActiveBabyId());
  }, []);

  useEffect(() => {
    const id = getActiveBabyId();
    if (id) loadBabyDataIntoCurrent(id);
  }, []);

  const setActiveBabyId = useCallback((id: string) => {
    const current = getActiveBabyId();
    if (current === id) return;
    if (current) saveCurrentDataToBaby(current);
    setActiveBabyIdStorage(id);
    loadBabyDataIntoCurrent(id);
    setActiveId(id);
    setBabies(getBabies());
  }, []);

  const addBaby = useCallback((baby: Omit<Baby, "id">): Baby => {
    const created = addBabyStorage(baby);
    setBabies(getBabies());
    return created;
  }, []);

  const removeBaby = useCallback((id: string) => {
    const wasActive = activeId === id;
    removeBabyStorage(id);
    setBabies(getBabies());
    const nextActiveId = getActiveBabyId();
    setActiveId(nextActiveId);
    if (wasActive && nextActiveId) loadBabyDataIntoCurrent(nextActiveId);
  }, [activeId]);

  const updateActiveBaby = useCallback((updates: Partial<Omit<Baby, "id">>) => {
    const id = getActiveBabyId();
    if (!id) return;
    updateBaby(id, updates);
    setBabies(getBabies());
    const babiesList = getBabies();
    const active = babiesList.find((b) => b.id === id) ?? null;
    if (active) loadBabyDataIntoCurrent(id);
  }, []);

  const activeBaby = useMemo(
    () => babies.find((b) => b.id === activeId) ?? null,
    [babies, activeId]
  );

  const value = useMemo<BabyContextValue>(
    () => ({
      babies,
      activeBaby,
      activeBabyId: activeId,
      setActiveBabyId,
      addBaby,
      updateActiveBaby,
      removeBaby,
      refresh,
    }),
    [babies, activeBaby, activeId, setActiveBabyId, addBaby, updateActiveBaby, removeBaby, refresh]
  );

  return <BabyContext.Provider value={value}>{children}</BabyContext.Provider>;
}

export function useBaby() {
  const ctx = useContext(BabyContext);
  if (!ctx) throw new Error("useBaby must be used within BabyProvider");
  return ctx;
}
