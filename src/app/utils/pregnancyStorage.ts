const KICK_KEY = "cradl-kick-counts";
const BAG_KEY = "cradl-hospital-bag";
const BIRTH_PLAN_KEY = "cradl-birth-plan";

export interface KickSession {
  id: string;
  date: string;
  startTime: number;
  kicks: number;
  durationMs: number;
}

export function getKickSessions(): KickSession[] {
  try { return JSON.parse(localStorage.getItem(KICK_KEY) || "[]"); } catch { return []; }
}

export function addKickSession(session: Omit<KickSession, "id">): KickSession {
  const list = getKickSessions();
  const entry: KickSession = { ...session, id: `kick_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
  list.push(entry);
  localStorage.setItem(KICK_KEY, JSON.stringify(list));
  return entry;
}

export interface BagItem {
  id: string;
  label: string;
  category: "mum" | "baby" | "partner" | "documents";
  packed: boolean;
}

const DEFAULT_BAG: Omit<BagItem, "id" | "packed">[] = [
  { label: "Birth plan copies", category: "documents" },
  { label: "Hospital notes / maternity records", category: "documents" },
  { label: "Photo ID", category: "documents" },
  { label: "Insurance / NHS card", category: "documents" },
  { label: "Nightgown or old t-shirt for labour", category: "mum" },
  { label: "Dressing gown and slippers", category: "mum" },
  { label: "Nursing bra and breast pads", category: "mum" },
  { label: "Comfortable underwear (dark colours)", category: "mum" },
  { label: "Maternity pads", category: "mum" },
  { label: "Toiletries (lip balm, hair ties, toothbrush)", category: "mum" },
  { label: "Phone charger — long cable", category: "mum" },
  { label: "Snacks and drinks", category: "mum" },
  { label: "Going-home outfit", category: "mum" },
  { label: "Newborn nappies", category: "baby" },
  { label: "Baby vest and sleepsuit (2–3)", category: "baby" },
  { label: "Baby hat and socks", category: "baby" },
  { label: "Muslin cloths (2–3)", category: "baby" },
  { label: "Blanket for going home", category: "baby" },
  { label: "Car seat (fitted and checked)", category: "baby" },
  { label: "Snacks and drinks for partner", category: "partner" },
  { label: "Change of clothes", category: "partner" },
  { label: "Phone charger", category: "partner" },
  { label: "Camera", category: "partner" },
  { label: "Pillow for overnight", category: "partner" },
];

export function getHospitalBag(): BagItem[] {
  try {
    const raw = localStorage.getItem(BAG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const items: BagItem[] = DEFAULT_BAG.map((b, i) => ({
    ...b,
    id: `bag_${i}`,
    packed: false,
  }));
  localStorage.setItem(BAG_KEY, JSON.stringify(items));
  return items;
}

export function toggleBagItem(id: string): BagItem[] {
  const items = getHospitalBag();
  const idx = items.findIndex((i) => i.id === id);
  if (idx >= 0) items[idx] = { ...items[idx], packed: !items[idx].packed };
  localStorage.setItem(BAG_KEY, JSON.stringify(items));
  return items;
}

export function addBagItem(label: string, category: BagItem["category"]): BagItem[] {
  const items = getHospitalBag();
  items.push({ id: `bag_${Date.now()}`, label, category, packed: false });
  localStorage.setItem(BAG_KEY, JSON.stringify(items));
  return items;
}

export interface BirthPlanEntry {
  key: string;
  value: string;
}

export function getBirthPlan(): BirthPlanEntry[] {
  try { return JSON.parse(localStorage.getItem(BIRTH_PLAN_KEY) || "[]"); } catch { return []; }
}

export function saveBirthPlan(entries: BirthPlanEntry[]): void {
  localStorage.setItem(BIRTH_PLAN_KEY, JSON.stringify(entries));
}
