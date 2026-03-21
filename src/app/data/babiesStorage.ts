/**
 * Multi-baby: list of babies, active baby id, per-baby data (stored under baby_${id}_key).
 */

export interface Baby {
  id: string;
  name: string;
  birthDate: number;
  /** Parent/caregiver first name (max 40 chars) */
  parentName?: string;
  photoDataUrl?: string;
  /** Emoji or icon key for avatar when no photo */
  icon?: string;
  weight?: number;
  height?: number;
  headCircumference?: number;
  sex?: "girl" | "boy" | "prefer_not_to_say";
  bloodType?: string;
}

const BABIES_KEY = "babytrackr-babies";
const ACTIVE_BABY_KEY = "babytrackr-activeBabyId";
const LEGACY_PROFILE_KEY = "babyProfile";

const PER_BABY_KEYS: string[] = [
  "sleepHistory", "feedingHistory", "diaperHistory", "tummyTimeHistory",
  "bottleHistory", "pumpHistory", "currentSleep", "currentTummyTime",
  "feedingInterval", "feedingActiveSession", "painkillerHistory", "notes",
  "shoppingList", "milestones", "temperatureHistory", "symptomHistory",
  "medicationHistory", "solidFoodHistory", "growthMeasurements", "activityHistory",
  "toothHistory",
];

function storageKey(babyId: string, key: string): string {
  return `baby_${babyId}_${key}`;
}

/** True if JSON looks like an in-progress sleep (id + start, no end). */
function isActiveCurrentSleepJson(raw: string | null): boolean {
  if (!raw || raw === "null") return false;
  try {
    const p = JSON.parse(raw) as { id?: string; startTime?: unknown; endTime?: unknown };
    if (!p?.id || p.startTime == null) return false;
    if (p.endTime != null && Number.isFinite(Number(p.endTime))) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Mirror a main localStorage key into the active baby's slot (so reload doesn't wipe it).
 * Call after writes to PER_BABY_KEYS — e.g. from saveData().
 */
export function persistActiveBabyCopy(mainKey: string): void {
  if (!PER_BABY_KEYS.includes(mainKey)) return;
  const babyId = getActiveBabyId();
  if (!babyId) return;
  try {
    const val = localStorage.getItem(mainKey);
    if (val != null) localStorage.setItem(storageKey(babyId, mainKey), val);
    else localStorage.removeItem(storageKey(babyId, mainKey));
  } catch {
    /* ignore */
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Migrate legacy single babyProfile + flat keys into first baby + per-baby keys. */
function migrateIfNeeded(): void {
  const existing = localStorage.getItem(BABIES_KEY);
  if (existing) return;
  const legacy = localStorage.getItem(LEGACY_PROFILE_KEY);
  if (!legacy) return;
  try {
    const profile = JSON.parse(legacy) as { birthDate?: number; name?: string; photoDataUrl?: string };
    const id = `baby_${Date.now()}`;
    const baby: Baby = {
      id,
      name: profile?.name ?? "",
      birthDate: typeof profile?.birthDate === "number" ? profile.birthDate : 0,
      photoDataUrl: profile?.photoDataUrl,
    };
    localStorage.setItem(BABIES_KEY, JSON.stringify([baby]));
    localStorage.setItem(ACTIVE_BABY_KEY, id);
    for (const key of PER_BABY_KEYS) {
      const val = localStorage.getItem(key);
      if (val != null) localStorage.setItem(storageKey(id, key), val);
    }
  } catch {
    // ignore
  }
}

export function getBabies(): Baby[] {
  migrateIfNeeded();
  return readJson<Baby[]>(BABIES_KEY, []);
}

export function getActiveBabyId(): string | null {
  migrateIfNeeded();
  const id = localStorage.getItem(ACTIVE_BABY_KEY);
  const babies = getBabies();
  if (id && babies.some((b) => b.id === id)) return id;
  if (babies.length > 0) {
    localStorage.setItem(ACTIVE_BABY_KEY, babies[0].id);
    return babies[0].id;
  }
  return null;
}

export function setActiveBabyId(id: string): void {
  localStorage.setItem(ACTIVE_BABY_KEY, id);
}

export function addBaby(baby: Omit<Baby, "id">): Baby {
  const id = `baby_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const full: Baby = { ...baby, id };
  const babies = [...getBabies(), full];
  localStorage.setItem(BABIES_KEY, JSON.stringify(babies));
  return full;
}

export function updateBaby(id: string, updates: Partial<Omit<Baby, "id">>): void {
  const babies = getBabies().map((b) => (b.id === id ? { ...b, ...updates } : b));
  localStorage.setItem(BABIES_KEY, JSON.stringify(babies));
}

/** Save current localStorage (main keys) into the given baby's slot. */
export function saveCurrentDataToBaby(babyId: string): void {
  for (const key of PER_BABY_KEYS) {
    const val = localStorage.getItem(key);
    if (val != null) localStorage.setItem(storageKey(babyId, key), val);
  }
}

/** Load baby's stored data into main localStorage keys. */
export function loadBabyDataIntoCurrent(babyId: string): void {
  for (const key of PER_BABY_KEYS) {
    const val = localStorage.getItem(storageKey(babyId, key));
    if (val != null) {
      localStorage.setItem(key, val);
    } else {
      // Per-baby slot empty: do not wipe in-progress sleep/tummy/session that only lived in
      // main keys (never copied to baby slot). Otherwise reload clears active timers.
      if (key === "currentSleep") {
        const mainVal = localStorage.getItem(key);
        if (isActiveCurrentSleepJson(mainVal)) {
          localStorage.setItem(storageKey(babyId, key), mainVal!);
          continue;
        }
      }
      localStorage.removeItem(key);
    }
  }
  const babies = getBabies();
  const baby = babies.find((b) => b.id === babyId);
  if (baby) {
    const profile = {
      birthDate: baby.birthDate,
      name: baby.name,
      parentName: baby.parentName,
      photoDataUrl: baby.photoDataUrl,
      weight: baby.weight,
      height: baby.height,
      headCircumference: baby.headCircumference,
    };
    localStorage.setItem(LEGACY_PROFILE_KEY, JSON.stringify(profile));
  }
}

export function removeBaby(id: string): void {
  const babies = getBabies().filter((b) => b.id !== id);
  localStorage.setItem(BABIES_KEY, JSON.stringify(babies));
  for (const key of PER_BABY_KEYS) localStorage.removeItem(storageKey(id, key));
  const wasActive = getActiveBabyId() === id;
  if (wasActive && babies.length > 0) {
    setActiveBabyId(babies[0].id);
    loadBabyDataIntoCurrent(babies[0].id);
  } else if (wasActive && babies.length === 0) {
    localStorage.removeItem(ACTIVE_BABY_KEY);
    localStorage.removeItem(LEGACY_PROFILE_KEY);
  }
}
