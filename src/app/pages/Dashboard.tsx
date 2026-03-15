import { ShoppingCart, Plus, Trash2, Check, ChevronDown, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Navigation } from "../components/Navigation";
import { WarningIndicators } from "../components/WarningIndicators";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { requestNotificationPermission, scheduleNotification } from "../utils/notifications";
import { useAuth } from "../contexts/AuthContext";
import { loadAllDataFromServer, saveData, clearSyncedDataFromLocalStorage, SYNCED_DATA_KEYS, SYNCED_DATA_DEFAULTS, POLL_MS_ACTIVE, POLL_MS_IDLE } from "../utils/dataSync";
import { getTimeSince } from "../utils/dateUtils";
import { endCurrentSleepIfActive } from "../utils/sleepUtils";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import type { SleepRecord, FeedingRecord, DiaperRecord, PainkillerDose, ActiveFeedingSession, ShoppingItem, BabyProfile } from "../types";
import { getAgeMonthsWeeks } from "../utils/babyUtils";
import { LogDrawer } from "../components/LogDrawer";
import { compressBabyPhoto } from "../utils/imageCompress";
import { TodayTimelineModal } from "../components/TodayTimelineModal";
import { LogEditSheet } from "../components/LogEditSheet";
import { getLastFeedSide } from "../utils/lastFeedSideStorage";
import { WellbeingCard } from "../components/WellbeingCard";
import { LeapsCard } from "../components/LeapsCard";
import type { TimelineEvent } from "../types";

const VISIBILITY_REFETCH_MIN_MS = 2_000;

const QUICK_ADD_ITEMS = [
  { emoji: "🧷", label: "Diapers" },
  { emoji: "🧻", label: "Wipes" },
  { emoji: "🍼", label: "Formula" },
  { emoji: "🧴", label: "Diaper Cream" },
  { emoji: "🧴", label: "Baby Shampoo" },
  { emoji: "🧴", label: "Baby Lotion" },
  { emoji: "🛁", label: "Baby Wash" },
  { emoji: "🧣", label: "Burp Cloths" },
  { emoji: "👕", label: "Onesies" },
  { emoji: "🧦", label: "Baby Socks" },
  { emoji: "🛏️", label: "Swaddle Blankets" },
  { emoji: "😴", label: "Sleep Sack" },
  { emoji: "🤱", label: "Nursing Pads" },
  { emoji: "🍶", label: "Breast Pump Bags" },
  { emoji: "🌡️", label: "Thermometer" },
  { emoji: "💨", label: "Nasal Aspirator" },
  { emoji: "💧", label: "Gripe Water" },
  { emoji: "💊", label: "Gas Drops" },
  { emoji: "☀️", label: "Vitamin D Drops" },
  { emoji: "✂️", label: "Nail Clippers" },
  { emoji: "🧸", label: "Pacifier" },
  { emoji: "🎵", label: "White Noise Machine" },
  { emoji: "🛡️", label: "Changing Pads" },
  { emoji: "🎽", label: "Baby Mittens" },
  { emoji: "🧺", label: "Baby Detergent" },
];

function hasActiveSession(data: Record<string, unknown>): boolean {
  return data?.feedingActiveSession != null || data?.currentSleep != null || data?.currentTummyTime != null;
}

export function Dashboard() {
  const [currentSleep, setCurrentSleep] = useState<SleepRecord | null>(null);
  const [lastFeeding, setLastFeeding] = useState<FeedingRecord | null>(null);
  const [activeFeedingSession, setActiveFeedingSession] = useState<ActiveFeedingSession | null>(null);
  const [recentDiapers, setRecentDiapers] = useState<DiaperRecord[]>([]);
  const [lastPainkiller, setLastPainkiller] = useState<PainkillerDose | null>(null);
  const [lastDataDebug, setLastDataDebug] = useState<{ familyId: string | null; rowsReturned?: number } | null>(null);
  const [, setFeedingTick] = useState(0);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [shoppingInput, setShoppingInput] = useState("");
  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
  const [statsToday, setStatsToday] = useState<{ feeds: number; sleepH: string; diapers: number; tummyM: number; totalMl: number }>({ feeds: 0, sleepH: "0h", diapers: 0, tummyM: 0, totalMl: 0 });
  const [openDrawer, setOpenDrawer] = useState<"feed" | "sleep" | "diaper" | "tummy" | "bottle" | "pump" | null>(null);
  const [addBabyName, setAddBabyName] = useState("");
  const [addBabyBirthDateInput, setAddBabyBirthDateInput] = useState("");
  const [addBabyPhotoDataUrl, setAddBabyPhotoDataUrl] = useState<string | null>(null);
  const [addPhotoCompressing, setAddPhotoCompressing] = useState(false);
  const addBabyPhotoInputRef = useRef<HTMLInputElement>(null);
  const [todayModalOpen, setTodayModalOpen] = useState(false);
  const [todayFilter, setTodayFilter] = useState<"feed" | "sleep" | "diaper" | "tummy" | null>(null);
  const [editEvent, setEditEvent] = useState<TimelineEvent | null>(null);
  const [timelineRefreshKey, setTimelineRefreshKey] = useState(0);
  const [nurseryEssentialsOpen, setNurseryEssentialsOpen] = useState(false);

  const { user, session, loading, familyId } = useAuth();
  const prevFamilyIdRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Live tick for active timers
  useEffect(() => {
    if (!activeFeedingSession && !currentSleep) return;
    const id = setInterval(() => setFeedingTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [activeFeedingSession, currentSleep]);

  // PWA quick actions
  useEffect(() => {
    const action = searchParams.get("action");
    if (action && user) handleQuickAction(action);
  }, [searchParams, user]);

  // ─── Data loading ───────────────────────────────────────────────────────────

  const loadLocalDataRef = useRef<() => void>(() => {});

  const loadLocalData = () => {
    const sleepData = localStorage.getItem("currentSleep");
    try { setCurrentSleep(sleepData ? JSON.parse(sleepData) : null); } catch { setCurrentSleep(null); }

    let activeFeeding: ActiveFeedingSession | null = null;
    try {
      const raw = localStorage.getItem("feedingActiveSession");
      if (raw && raw !== "null") {
        const parsed = JSON.parse(raw);
        const hasStart = parsed?.session?.sessionStartTime != null || parsed?.serverStartTime != null;
        if (hasStart && parsed?.session && Array.isArray(parsed?.session?.segments)) {
          activeFeeding = parsed;
        }
      }
    } catch { /* ignore */ }
    setActiveFeedingSession(activeFeeding);

    try {
      const feedingHistory = localStorage.getItem("feedingHistory");
      if (feedingHistory) {
        const feedings: FeedingRecord[] = JSON.parse(feedingHistory);
        if (feedings.length > 0) setLastFeeding(feedings[feedings.length - 1]);
      }
    } catch { /* corrupt data — skip */ }

    try {
      const diaperHistory = localStorage.getItem("diaperHistory");
      if (diaperHistory) {
        const diapers = JSON.parse(diaperHistory);
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        setRecentDiapers(diapers.filter((d: DiaperRecord) => d.timestamp > oneDayAgo));
      }
    } catch { /* corrupt data — skip */ }

    const shoppingData = localStorage.getItem("shoppingList");
    if (shoppingData) {
      try { setShoppingList(JSON.parse(shoppingData)); } catch { /* ignore */ }
    }
    try {
      const bp = localStorage.getItem("babyProfile");
      setBabyProfile(bp ? JSON.parse(bp) : null);
    } catch { setBabyProfile(null); }

    const todayStart = new Date().setHours(0, 0, 0, 0);
    let feeds = 0,
      sleepMs = 0,
      diapers = 0,
      tummyM = 0,
      totalMl = 0;
    try {
      const fh = localStorage.getItem("feedingHistory");
      if (fh) {
        const arr: { endTime?: number; timestamp?: number }[] = JSON.parse(fh);
        feeds = arr.filter((r) => (r.endTime ?? r.timestamp ?? 0) >= todayStart).length;
      }
    } catch {}
    try {
      const bh = localStorage.getItem("bottleHistory");
      if (bh) {
        const arr: { timestamp?: number; volumeMl?: number }[] = JSON.parse(bh);
        totalMl = arr.filter((r) => (r.timestamp ?? 0) >= todayStart).reduce((s, r) => s + (r.volumeMl ?? 0), 0);
      }
    } catch {}
    try {
      const sh = localStorage.getItem("sleepHistory");
      if (sh) {
        const arr: { startTime?: number; endTime?: number }[] = JSON.parse(sh);
        arr.forEach((s) => {
          const start = s.startTime ?? 0;
          const end = s.endTime ?? 0;
          if (end >= todayStart && start < todayStart + 24 * 60 * 60 * 1000) {
            sleepMs += Math.max(0, end - Math.max(start, todayStart));
          } else if (start >= todayStart && end) {
            sleepMs += end - start;
          }
        });
      }
    } catch {}
    try {
      const dh = localStorage.getItem("diaperHistory");
      if (dh) {
        const arr: { timestamp?: number }[] = JSON.parse(dh);
        diapers = arr.filter((r) => (r.timestamp ?? 0) >= todayStart).length;
      }
    } catch {}
    try {
      const th = localStorage.getItem("tummyTimeHistory");
      if (th) {
        const arr: { startTime?: number; endTime?: number }[] = JSON.parse(th);
        arr.forEach((t) => {
          const start = t.startTime ?? 0;
          const end = t.endTime ?? 0;
          if (start >= todayStart && end) tummyM += Math.round((end - start) / 60000);
        });
      }
    } catch {}
    const sleepH = sleepMs >= 3600000 ? `${Math.round(sleepMs / 3600000)}h` : sleepMs >= 60000 ? `${Math.round(sleepMs / 60000)}m` : "0m";
    setStatsToday({ feeds, sleepH, diapers, tummyM, totalMl });

    try {
      const painkillerHistory = localStorage.getItem("painkillerHistory");
      if (painkillerHistory) {
        const doses: PainkillerDose[] = JSON.parse(painkillerHistory);
        if (doses.length > 0) {
          const last = doses[doses.length - 1];
          setLastPainkiller(last);
          const remaining = 8 * 60 * 60 * 1000 - (Date.now() - last.timestamp);
          if (remaining > 0) {
            scheduleNotification("Painkiller reminder", "It has been 8 hours since your last painkiller dose.", remaining);
          }
        }
      }
    } catch { /* corrupt data — skip */ }
  };
  loadLocalDataRef.current = loadLocalData;

  const hasBabyProfile = babyProfile && babyProfile.birthDate;

  const saveAddBaby = () => {
    const dateStr = addBabyBirthDateInput.trim();
    if (!dateStr) {
      toast.error("Please enter birth date");
      return;
    }
    const ms = new Date(dateStr).setHours(0, 0, 0, 0);
    if (Number.isNaN(ms)) {
      toast.error("Invalid date");
      return;
    }
    const profile: BabyProfile = {
      birthDate: ms,
      ...(addBabyName.trim() ? { name: addBabyName.trim().slice(0, 200) } : {}),
      ...(addBabyPhotoDataUrl ? { photoDataUrl: addBabyPhotoDataUrl } : {}),
    };
    setBabyProfile(profile);
    try {
      localStorage.setItem("babyProfile", JSON.stringify(profile));
    } catch { /* ignore */ }
    if (session?.access_token) saveData("babyProfile", profile, session.access_token);
    setAddBabyName("");
    setAddBabyBirthDateInput("");
    setAddBabyPhotoDataUrl(null);
    toast.success("Baby profile saved");
  };

  const handleAddBabyPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    setAddPhotoCompressing(true);
    try {
      const dataUrl = await compressBabyPhoto(file);
      setAddBabyPhotoDataUrl(dataUrl);
    } catch {
      toast.error("Could not process photo");
    } finally {
      setAddPhotoCompressing(false);
    }
  };

  const applyServerData = (serverData: Record<string, unknown>, _debug?: { familyId: string | null; rowsReturned?: number }) => {
    const keyCount = Object.keys(serverData).length;
    if (keyCount === 0) {
      if (_debug) {
        console.warn("[BabyTracker] Server returned 0 keys. familyId =", _debug.familyId, "| DB rowsReturned =", _debug.rowsReturned);
        setLastDataDebug({ familyId: _debug.familyId ?? null, rowsReturned: _debug.rowsReturned });
      }
      loadLocalDataRef.current();
      return;
    }
    setLastDataDebug(null);
    clearSyncedDataFromLocalStorage();
    Object.entries(serverData).forEach(([key, value]) => {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
    });
    for (const key of SYNCED_DATA_KEYS) {
      if (!(key in serverData)) {
        try { localStorage.setItem(key, JSON.stringify(SYNCED_DATA_DEFAULTS[key])); } catch { /* ignore */ }
      }
    }
    loadLocalDataRef.current();
  };

  // ─── Auth / initial load ────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) { navigate("/login"); return; }
    if (!user || !session) { loadLocalData(); return; }

    if (familyId && (prevFamilyIdRef.current == null || prevFamilyIdRef.current !== familyId)) {
      clearSyncedDataFromLocalStorage();
    }
    if (familyId) prevFamilyIdRef.current = familyId;

    console.log("[BabyTracker] Dashboard: initial fetch", { familyId: familyId ?? "none" });
    loadAllDataFromServer(session.access_token).then(({ ok, data: serverData, _debug }) => {
      if (!ok) {
        console.warn("[BabyTracker] Dashboard: initial fetch failed — keeping local data");
        loadLocalDataRef.current();
        return;
      }
      applyServerData(serverData, _debug);
    });

    requestNotificationPermission();
  }, [user, loading, session, navigate, familyId]);

  // ─── Polling interval (separate from initial load — avoids double-fire) ────
  useEffect(() => {
    if (!user || !session?.access_token || !familyId) return;

    const pollMsRef = { current: POLL_MS_IDLE };
    const timerRef = { current: 0 as unknown as ReturnType<typeof setInterval> };
    const lastRefetchAt = { current: 0 };

    const reschedule = () => {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(refetchAndApply, pollMsRef.current);
    };

    const refetchAndApply = () => {
      loadAllDataFromServer(session!.access_token!).then(({ ok, data: serverData }) => {
        if (!ok || Object.keys(serverData).length === 0) return;
        const next = hasActiveSession(serverData) ? POLL_MS_ACTIVE : POLL_MS_IDLE;
        if (next !== pollMsRef.current) { pollMsRef.current = next; reschedule(); }
        applyServerData(serverData);
        lastRefetchAt.current = Date.now();
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (Date.now() - lastRefetchAt.current >= VISIBILITY_REFETCH_MIN_MS) refetchAndApply();
        clearInterval(timerRef.current);
        timerRef.current = setInterval(refetchAndApply, pollMsRef.current);
      } else {
        clearInterval(timerRef.current);
      }
    };

    // Start interval but do NOT fire immediately — initial load effect handles first fetch
    timerRef.current = setInterval(refetchAndApply, pollMsRef.current);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [user, session?.access_token, familyId]);

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const persistShoppingList = (list: ShoppingItem[]) => {
    localStorage.setItem("shoppingList", JSON.stringify(list));
    if (session?.access_token) saveData("shoppingList", list, session.access_token);
  };

  const addShoppingItem = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const updated = [...shoppingList, { id: Date.now().toString(), name: trimmed, checked: false }];
    setShoppingList(updated);
    persistShoppingList(updated);
  };

  const toggleShoppingItem = (id: string) => {
    const updated = shoppingList.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setShoppingList(updated);
    persistShoppingList(updated);
  };

  const removeShoppingItem = (id: string) => {
    const updated = shoppingList.filter((item) => item.id !== id);
    setShoppingList(updated);
    persistShoppingList(updated);
  };

  const handleShoppingInputAdd = () => {
    addShoppingItem(shoppingInput);
    setShoppingInput("");
  };

  const logPainkiller = () => {
    let history: PainkillerDose[] = [];
    try { history = JSON.parse(localStorage.getItem("painkillerHistory") || "[]"); } catch { /* start fresh */ }
    const now = Date.now();
    const newDose: PainkillerDose = { id: now.toString(), timestamp: now };
    history.push(newDose);
    localStorage.setItem("painkillerHistory", JSON.stringify(history));
    if (session?.access_token) saveData("painkillerHistory", history, session.access_token);
    setLastPainkiller(newDose);
    scheduleNotification("Painkiller reminder", "It has been 8 hours since your last painkiller dose.", 8 * 60 * 60 * 1000);
    toast.success("Painkiller dose logged. We'll remind you in 8 hours.");
  };

  const logDiaper = (type: "pee" | "poop") => {
    endCurrentSleepIfActive((sleepHistory) => {
      if (session?.access_token) {
        saveData("sleepHistory", sleepHistory, session.access_token);
        saveData("currentSleep", null, session.access_token);
      }
    });
    let diaperHistory: DiaperRecord[] = [];
    try { diaperHistory = JSON.parse(localStorage.getItem("diaperHistory") || "[]"); } catch { /* start fresh */ }
    const newDiaper: DiaperRecord = { id: Date.now().toString(), type, timestamp: Date.now() };
    diaperHistory.push(newDiaper);
    localStorage.setItem("diaperHistory", JSON.stringify(diaperHistory));
    if (session?.access_token) saveData("diaperHistory", diaperHistory, session.access_token);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} logged!`);
    loadLocalData();
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "pee": logDiaper("pee"); break;
      case "poop": logDiaper("poop"); break;
      case "feed": setOpenDrawer("feed"); break;
      case "sleep": setOpenDrawer("sleep"); break;
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Baby profile at top: greeting card when profile exists, add-baby form when not */}
        <div className="mb-2.5">
          {hasBabyProfile ? (
            <Link to="/settings" className="block">
              <div
                className="rounded-[22px] p-4 flex gap-4 items-center border min-h-[100px]"
                style={{
                  background: "linear-gradient(135deg, var(--hello1), var(--hello2))",
                  borderColor: "var(--ro)",
                }}
              >
                <div
                  className="w-[64px] h-[64px] rounded-full border-[2.5px] flex flex-col items-center justify-center overflow-hidden flex-shrink-0"
                  style={{ borderColor: "rgba(255,255,255,0.8)", background: "var(--bg2)" }}
                >
                  {babyProfile?.photoDataUrl ? (
                    <img src={babyProfile.photoDataUrl} alt="" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--mu)" strokeWidth="1.5" className="opacity-70">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                      <span className="text-[10px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Add photo</span>
                    </>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[20px] leading-tight font-serif" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
                    {babyProfile?.name ? (
                      <>Good morning,<br />little {babyProfile.name}</>
                    ) : (
                      "Your baby"
                    )}
                  </div>
                  <div className="text-[13px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
                    {babyProfile?.birthDate ? `${getAgeMonthsWeeks(babyProfile.birthDate)} · tap photo to change` : "Tap to add birth date"}
                  </div>
                  {(babyProfile?.weight != null || babyProfile?.height != null) && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {babyProfile?.weight != null && (
                        <span className="rounded-[10px] px-2.5 py-1 text-[11px]" style={{ background: "rgba(255,255,255,0.7)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
                          {babyProfile.weight} kg
                        </span>
                      )}
                      {babyProfile?.height != null && (
                        <span className="rounded-[10px] px-2.5 py-1 text-[11px]" style={{ background: "rgba(255,255,255,0.7)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
                          {babyProfile.height} cm
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ) : (
            <div
              className="rounded-[22px] p-5 border"
              style={{ background: "var(--card)", borderColor: "var(--bd)" }}
            >
              <h2 className="text-[18px] font-medium mb-3" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
                Add your baby
              </h2>
              <p className="text-[14px] mb-4" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
                Name and photo are optional. Birth date is needed for age and milestones.
              </p>
              <div className="flex gap-3 items-start mb-3">
                <div
                  className="w-[54px] h-[54px] rounded-full border-2 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer"
                  style={{ borderColor: "var(--bd)" }}
                  onClick={() => addBabyPhotoInputRef.current?.click()}
                >
                  {addBabyPhotoDataUrl ? (
                    <img src={addBabyPhotoDataUrl} alt="" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--mu)" }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  )}
                </div>
                <input
                  ref={addBabyPhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAddBabyPhotoSelect}
                  disabled={addPhotoCompressing}
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <Input
                    type="text"
                    placeholder="Baby's name (optional)"
                    value={addBabyName}
                    onChange={(e) => setAddBabyName(e.target.value)}
                    className="text-[16px] min-h-[44px]"
                    style={{ fontFamily: "system-ui, sans-serif" }}
                  />
                  <Input
                    type="date"
                    placeholder="Birth date"
                    value={addBabyBirthDateInput}
                    onChange={(e) => setAddBabyBirthDateInput(e.target.value)}
                    className="text-[16px] min-h-[44px]"
                    style={{ fontFamily: "system-ui, sans-serif" }}
                  />
                </div>
              </div>
              <Button
                type="button"
                onClick={saveAddBaby}
                disabled={!addBabyBirthDateInput.trim() || addPhotoCompressing}
                className="w-full min-h-[48px] text-base"
                style={{ fontFamily: "system-ui, sans-serif" }}
              >
                {addPhotoCompressing ? "Processing photo…" : "Save"}
              </Button>
            </div>
          )}
        </div>

        {/* Alert pills: horizontal scroll below greeting (Prompt 3) */}
        <WarningIndicators />

        {/* Reminder card (example style) */}
        <div
          className="rounded-2xl border py-3.5 px-4 mb-3 flex items-center gap-3"
          style={{ background: "var(--rem-bg)", borderColor: "var(--bd)" }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--pe)" }}>
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v3M5.5 3.5A3.5 3.5 0 0 0 8 11a3.5 3.5 0 0 0 2.5-7.5" stroke="var(--coral)" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M6.5 5.5h3" stroke="var(--coral)" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-medium" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
              {lastFeeding ? "Next feed due soon" : "Log a feed when ready"}
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
              {lastFeeding ? `${getTimeSince(lastFeeding.endTime ?? lastFeeding.timestamp)} · usually every 3h` : "Tap Feed below to start"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setTodayFilter(null); setTodayModalOpen(true); }}
            className="flex-shrink-0 py-2.5 px-4 rounded-[20px] text-[13px] font-medium border min-h-[44px]"
            style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--pink)", fontFamily: "system-ui, sans-serif" }}
          >
            See today
          </button>
        </div>

        {/* What to expect — Wonder Weeks (Prompt 8) */}
        {hasBabyProfile && babyProfile?.birthDate && <LeapsCard birthDateMs={babyProfile.birthDate} />}

        {/* 3×2 log buttons — feed, sleep, diaper, tummy, bottle, pump (Prompt 4) */}
        <div
          className="grid gap-2 mb-2.5 transition-[grid-template-columns] duration-200"
          style={{ gridTemplateColumns: openDrawer ? "1fr" : "1fr 1fr 1fr" }}
        >
          {(["feed", "sleep", "diaper", "tummy", "bottle", "pump"] as const).map((drawerType) => {
            const isOpen = openDrawer === drawerType;
            const isHidden = openDrawer != null && !isOpen;
            const labels = {
              feed: { title: "Log a feed", sub: lastFeeding ? getTimeSince(lastFeeding.endTime ?? lastFeeding.timestamp) : "No feed yet", dot: "var(--coral)", iconBg: "var(--pe)", icon: <><path d="M8 3v2.5M6 3.5A3 3 0 0 0 8 10a3 3 0 0 0 2-6.5" stroke="var(--coral)" strokeWidth="1.4" strokeLinecap="round" /><path d="M6.5 5.5h3" stroke="var(--coral)" strokeWidth="1.4" strokeLinecap="round" /></> },
              sleep: { title: "Log sleep", sub: currentSleep ? getTimeSince(currentSleep.startTime ?? 0) : "Awake", dot: "var(--blue)", iconBg: "var(--sk)", icon: <><path d="M8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3z" stroke="var(--blue)" strokeWidth="1.4" /><path d="M8 6v3l1.5 1" stroke="var(--blue)" strokeWidth="1.4" strokeLinecap="round" /></> },
              diaper: { title: "Diaper change", sub: recentDiapers.length > 0 ? getTimeSince(recentDiapers[recentDiapers.length - 1].timestamp) + " ago" : "No changes yet", dot: "var(--grn)", iconBg: "var(--sa)", icon: <><path d="M4 8c0-2 8-2 8 0s-.5 4.5-4 4.5S4 10 4 8z" stroke="var(--grn)" strokeWidth="1.4" /><path d="M8 8V5.5" stroke="var(--grn)" strokeWidth="1.4" strokeLinecap="round" /></> },
              tummy: { title: "Tummy time", sub: statsToday.tummyM > 0 ? `${statsToday.tummyM} min today` : "No session today", dot: "var(--purp)", iconBg: "var(--la)", icon: <><rect x="3" y="8" width="10" height="5.5" rx="2" stroke="var(--purp)" strokeWidth="1.4" /><path d="M6 8V6.5a2 2 0 0 1 4 0V8" stroke="var(--purp)" strokeWidth="1.4" /></> },
              bottle: { title: "Bottle feed", sub: statsToday.totalMl > 0 ? `${statsToday.totalMl} ml today` : "No bottle yet", dot: "var(--coral)", iconBg: "var(--pe)", icon: <><path d="M5 4v6a3 3 0 0 0 6 0V4M6 3h2" stroke="var(--coral)" strokeWidth="1.4" strokeLinecap="round" /></> },
              pump: { title: "Pump", sub: "Log session", dot: "var(--pink)", iconBg: "var(--med-bg)", icon: <><rect x="7" y="2" width="4" height="14" rx="2" stroke="var(--pink)" strokeWidth="1.5" /><rect x="2" y="7" width="14" height="4" rx="2" stroke="var(--pink)" strokeWidth="1.5" /></> },
            };
            const L = labels[drawerType];
            const headerClass = "w-full rounded-[18px] p-4 pt-3.5 pb-3.5 text-center border relative transition-colors";
            const headerStyle = {
              background: isOpen ? "var(--card2)" : "var(--card)",
              borderColor: "var(--bd)",
              borderWidth: "1.5px",
              borderBottomLeftRadius: isOpen ? 0 : 18,
              borderBottomRightRadius: isOpen ? 0 : 18,
              borderBottomStyle: isOpen ? "none" : "solid",
            };
            const headerContent = (
              <>
                {isOpen ? (
                  <button
                    type="button"
                    onClick={() => setOpenDrawer(null)}
                    className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full flex items-center justify-center border transition-colors hover:opacity-90"
                    style={{ background: "var(--bg2)", borderColor: "var(--bd)", color: "var(--tx)" }}
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" strokeWidth="2" />
                  </button>
                ) : (
                  <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full" style={{ background: L.dot }} aria-hidden />
                )}
                <div className="w-9 h-9 mx-auto mb-1.5 rounded-full flex items-center justify-center" style={{ background: L.iconBg }}>
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="none">{L.icon}</svg>
                </div>
                <div className="text-[14px] font-medium" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>{L.title}</div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>{L.sub}</div>
              </>
            );
            return (
              <div
                key={drawerType}
                className="transition-all duration-200 overflow-hidden"
                style={{
                  opacity: isHidden ? 0 : 1,
                  height: isHidden ? 0 : undefined,
                  minHeight: isHidden ? 0 : undefined,
                  gridColumn: isOpen ? "1 / -1" : undefined,
                }}
              >
                {isOpen ? (
                  <div className={headerClass} style={headerStyle}>{headerContent}</div>
                ) : (
                  <button type="button" onClick={() => setOpenDrawer(drawerType)} className={headerClass} style={headerStyle}>{headerContent}</button>
                )}
                {isOpen && (
                  <LogDrawer
                    type={drawerType}
                    onClose={() => setOpenDrawer(null)}
                    onSaved={() => { loadLocalDataRef.current(); setOpenDrawer(null); }}
                    session={session}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Mum's wellbeing (Prompt 6) */}
        <WellbeingCard />

        {/* Pain relief card (example med-card style) */}
        <div
          className="rounded-2xl border p-4 mb-3 flex items-center gap-4"
          style={{ background: "var(--card)", borderColor: "var(--bd)" }}
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--med-bg)" }}>
            <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
              <rect x="7" y="2" width="4" height="14" rx="2" stroke="var(--pink)" strokeWidth="1.5" />
              <rect x="2" y="7" width="14" height="4" rx="2" stroke="var(--pink)" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-medium" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>Pain relief</div>
            <div className="text-[12px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
              {lastPainkiller
                ? `Last taken: ${format(new Date(lastPainkiller.timestamp), "dd/MM/yyyy")} at ${format(new Date(lastPainkiller.timestamp), "HH:mm")}`
                : "No doses logged yet"}
            </div>
          </div>
          <button
            type="button"
            onClick={logPainkiller}
            className="py-2.5 px-4 rounded-[20px] text-[13px] font-medium border-none cursor-pointer flex-shrink-0 min-h-[44px]"
            style={{ background: "var(--med-bg)", color: "var(--med-col)", fontFamily: "system-ui, sans-serif" }}
          >
            Log it
          </button>
        </div>

        {/* Stats bar: 5 pills, tap opens Today timeline filtered (Prompt 9) */}
        <div
          className="sticky bottom-[72px] z-10 flex gap-2 mb-4 py-3 -mx-4 px-4 border-t"
          style={{ background: "var(--bg)", borderColor: "var(--bd)" }}
        >
          <button type="button" onClick={() => { setTodayFilter("feed"); setTodayModalOpen(true); }} className="flex-1 rounded-xl border flex flex-col items-center justify-center min-h-[76px] py-2" style={{ background: "color-mix(in srgb, var(--coral) 12%, var(--card))", borderColor: "var(--bd)" }}>
            <span className="text-[26px] font-serif" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>{statsToday.feeds}</span>
            <span className="text-[12px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>feeds</span>
            {statsToday.totalMl > 0 && <span className="text-[11px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>{statsToday.totalMl} ml</span>}
          </button>
          <button type="button" onClick={() => { setTodayFilter("sleep"); setTodayModalOpen(true); }} className="flex-1 rounded-xl border flex flex-col items-center justify-center min-h-[76px] py-2" style={{ background: "color-mix(in srgb, var(--blue) 12%, var(--card))", borderColor: "var(--bd)" }}>
            <span className="text-[26px] font-serif" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>{statsToday.sleepH}</span>
            <span className="text-[12px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>sleep</span>
          </button>
          <button type="button" onClick={() => { setTodayFilter("diaper"); setTodayModalOpen(true); }} className="flex-1 rounded-xl border flex flex-col items-center justify-center min-h-[76px] py-2" style={{ background: "color-mix(in srgb, var(--grn) 12%, var(--card))", borderColor: "var(--bd)" }}>
            <span className="text-[26px] font-serif" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>{statsToday.diapers}</span>
            <span className="text-[12px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>diapers</span>
          </button>
          <button type="button" onClick={() => { setTodayFilter("tummy"); setTodayModalOpen(true); }} className="flex-1 rounded-xl border flex flex-col items-center justify-center min-h-[76px] py-2" style={{ background: "color-mix(in srgb, var(--purp) 12%, var(--card))", borderColor: "var(--bd)" }}>
            <span className="text-[26px] font-serif" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>{statsToday.tummyM}m</span>
            <span className="text-[12px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>tummy</span>
          </button>
          <button type="button" onClick={() => { setTodayFilter("feed"); setTodayModalOpen(true); }} className="flex-1 rounded-xl border flex flex-col items-center justify-center min-h-[76px] py-2" style={{ background: "var(--stat-bg)", borderColor: "var(--bd)" }} title="Last feed side">
            <span className="text-[26px] font-serif flex items-center gap-0.5" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
              {getLastFeedSide() === "left" ? "L" : getLastFeedSide() === "right" ? "R" : "—"}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-80"><path d="M8 3v2.5M6 3.5A3 3 0 0 0 8 10a3 3 0 0 0 2-6.5" stroke="var(--coral)" strokeWidth="1.4" strokeLinecap="round" /><path d="M6.5 5.5h3" stroke="var(--coral)" strokeWidth="1.4" strokeLinecap="round" /></svg>
            </span>
            <span className="text-[12px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>last side</span>
          </button>
        </div>

        {familyId && !activeFeedingSession && !lastFeeding && recentDiapers.length === 0 && !currentSleep && !lastPainkiller && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm space-y-1">
            <p>No shared logs yet. Ask the inviter to open Settings and tap &quot;Sync my data to family&quot;.</p>
            {lastDataDebug?.familyId != null && (
              <p className="text-xs opacity-90 mt-1">Your familyId: <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">{lastDataDebug.familyId}</code></p>
            )}
            {lastDataDebug?.rowsReturned === 0 && (
              <p className="text-xs opacity-90">Server has 0 rows for this family — inviter must sync first.</p>
            )}
          </div>
        )}

        {/* Nursery Essentials Shopping List (accordion, closed by default) */}
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <button
            type="button"
            onClick={() => setNurseryEssentialsOpen((o) => !o)}
            className="w-full flex items-center gap-2 p-4 sm:p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <ShoppingCart className="w-5 h-5 text-pink-500 dark:text-pink-400 shrink-0" />
            <h2 className="text-base sm:text-lg font-medium dark:text-white flex-1">Nursery Essentials</h2>
            {shoppingList.filter((i) => !i.checked).length > 0 && (
              <span className="text-xs bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300 rounded-full px-2 py-0.5">
                {shoppingList.filter((i) => !i.checked).length} left
              </span>
            )}
            <span className={`shrink-0 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${nurseryEssentialsOpen ? "rotate-180" : ""}`}>
              <ChevronDown className="w-5 h-5" />
            </span>
          </button>

          {nurseryEssentialsOpen && (
            <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 border-t border-gray-100 dark:border-gray-700">
              {/* Quick-add chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
            {QUICK_ADD_ITEMS.map(({ emoji, label }) => (
              <button
                key={label}
                type="button"
                onClick={() => addShoppingItem(label)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:border-pink-400 hover:bg-pink-50 dark:hover:border-pink-500 dark:hover:bg-pink-900/30 transition-colors"
              >
                <span>{emoji}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Custom input */}
          <div className="flex gap-2 mb-4">
            <Input
              value={shoppingInput}
              onChange={(e) => setShoppingInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleShoppingInputAdd(); }}
              placeholder="Add a custom item…"
              className="flex-1"
            />
            <Button
              onClick={handleShoppingInputAdd}
              size="icon"
              variant="outline"
              className="shrink-0 border-pink-300 text-pink-600 hover:bg-pink-50 dark:border-pink-700 dark:text-pink-400 dark:hover:bg-pink-900/30"
              disabled={!shoppingInput.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* List */}
          {shoppingList.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-3">
              Tap a chip above or type a custom item to start your list.
            </p>
          ) : (
            <ul className="space-y-1">
              {shoppingList.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleShoppingItem(item.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      item.checked
                        ? "bg-pink-500 border-pink-500"
                        : "border-gray-300 dark:border-gray-500 hover:border-pink-400"
                    }`}
                  >
                    {item.checked && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <span
                    className={`flex-1 text-sm transition-colors ${
                      item.checked
                        ? "line-through text-gray-400 dark:text-gray-500"
                        : "text-gray-800 dark:text-gray-200"
                    }`}
                  >
                    {item.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeShoppingItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all p-0.5 rounded"
                    aria-label="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {shoppingList.some((i) => i.checked) && (
            <button
              type="button"
              onClick={() => {
                const updated = shoppingList.filter((i) => !i.checked);
                setShoppingList(updated);
                persistShoppingList(updated);
              }}
              className="mt-3 text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              Clear checked items
            </button>
          )}
            </div>
          )}
        </div>

        {hasBabyProfile && (
          <Link to="/journey" className="block mt-4">
            <div
              className="rounded-2xl p-5 border flex items-center justify-between min-h-[72px]"
              style={{ background: "var(--card)", borderColor: "var(--bd)" }}
            >
              <div>
                <h2 className="text-lg font-medium" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
                  {babyProfile?.name ? `${babyProfile.name}'s story` : "Journey"}
                </h2>
                <p className="text-sm mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
                  Milestones & how they&apos;re doing
                </p>
              </div>
              <span className="text-base font-medium" style={{ color: "var(--pink)" }}>View →</span>
            </div>
          </Link>
        )}
      </div>

      <TodayTimelineModal
        open={todayModalOpen}
        onClose={() => { setTodayModalOpen(false); setTodayFilter(null); }}
        filter={todayFilter}
        onEdit={(ev) => setEditEvent(ev)}
        refreshKey={timelineRefreshKey}
      />

      <LogEditSheet
        event={editEvent}
        onClose={() => setEditEvent(null)}
        onSaved={() => { loadLocalDataRef.current(); setTimelineRefreshKey((k) => k + 1); }}
        session={session}
      />

      <Navigation />
    </div>
  );
}
