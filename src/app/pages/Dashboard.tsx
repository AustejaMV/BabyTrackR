import { Baby, Utensils, Droplet, Clock, Pill, ShoppingCart, Plus, Trash2, Check, Settings } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Navigation } from "../components/Navigation";
import { WarningIndicators } from "../components/WarningIndicators";
import { ThemeToggle } from "../components/ThemeToggle";
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
import { displayedDurationMs } from "../utils/feedingUtils";

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
      case "feed": navigate("/feeding"); break;
      case "sleep": navigate("/sleep"); break;
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl mb-2 dark:text-white">Baby Care Tracker</h1>
            <p className="text-gray-600 dark:text-gray-400">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/settings" className="rounded-lg p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Settings">
              <Settings className="w-5 h-5" />
            </Link>
            <ThemeToggle />
          </div>
        </div>

        <WarningIndicators />

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

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Sleep tile */}
          <Link to="/sleep" className="block">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all h-full min-h-[120px] flex flex-col justify-center border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center shrink-0">
                  <Baby className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm sm:text-base font-medium dark:text-white truncate">Sleep</h2>
                  {currentSleep ? (
                    <>
                      <p className="text-base sm:text-lg text-blue-600 dark:text-blue-400 truncate">{currentSleep?.position ?? "Sleep"}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {getTimeSince(currentSleep?.startTime ?? 0)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Not tracking</p>
                  )}
                </div>
              </div>
            </div>
          </Link>

          {/* Feeding tile */}
          <Link to="/feeding" className="block">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all h-full min-h-[120px] flex flex-col justify-center border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center shrink-0">
                  <Utensils className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm sm:text-base font-medium dark:text-white truncate">Feeding</h2>
                  {activeFeedingSession ? (
                    <>
                      <p className="text-base sm:text-lg text-green-600 dark:text-green-400 truncate">
                        In progress{activeFeedingSession.isPaused ? " (paused)" : ""}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(() => {
                          const { session: s, isPaused, totalPausedMs, pausedAt } = activeFeedingSession;
                          // Use session.sessionStartTime (client-set), not serverStartTime (server-set on first receive)
                          const start = s.sessionStartTime;
                          const elapsed = Math.max(0, isPaused && pausedAt != null
                            ? pausedAt - start - totalPausedMs
                            : Date.now() - start - totalPausedMs);
                          const totalSec = Math.floor(elapsed / 1000);
                          const mins = Math.floor(totalSec / 60);
                          const secs = totalSec % 60;
                          return `${mins}:${secs.toString().padStart(2, "0")}`;
                        })()}
                      </p>
                    </>
                  ) : lastFeeding ? (
                    <>
                      <p className="text-base sm:text-lg text-green-600 dark:text-green-400 truncate">
                        {lastFeeding.segments?.length
                          ? `${Math.round(displayedDurationMs(lastFeeding) / 60000)}m total`
                          : (lastFeeding.type ?? "Feeding")}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {getTimeSince(lastFeeding.endTime ?? lastFeeding.timestamp)}
                        {` · ${Math.round(displayedDurationMs(lastFeeding) / 60000)}m`}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No feedings yet</p>
                  )}
                </div>
              </div>
            </div>
          </Link>

          {/* Diapers tile */}
          <Link to="/diapers" className="block">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all h-full min-h-[120px] flex flex-col justify-center border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 dark:bg-amber-900 rounded-xl flex items-center justify-center shrink-0">
                  <Droplet className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm sm:text-base font-medium dark:text-white truncate">Diapers</h2>
                  <p className="text-base sm:text-lg text-amber-600 dark:text-amber-400">{recentDiapers.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Last 24h</p>
                </div>
              </div>
            </div>
          </Link>

          {/* Tummy Time tile */}
          <Link to="/tummy-time" className="block">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all h-full min-h-[120px] flex flex-col justify-center border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm sm:text-base font-medium dark:text-white truncate">Tummy Time</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Track sessions</p>
                </div>
              </div>
            </div>
          </Link>

          {/* Painkiller tile */}
          <div className="col-span-2 bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 dark:bg-red-900 rounded-xl flex items-center justify-center shrink-0">
                  <Pill className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-medium dark:text-white">Painkiller (Mom)</h2>
                  {lastPainkiller ? (
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      Last: {getTimeSince(lastPainkiller.timestamp)} · Reminder in 8h
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No doses logged yet</p>
                  )}
                </div>
              </div>
              <Button onClick={logPainkiller} variant="outline" size="sm" className="shrink-0">
                Log Dose
              </Button>
            </div>
          </div>
        </div>

        {/* Nursery Essentials Shopping List */}
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-5 h-5 text-pink-500 dark:text-pink-400" />
            <h2 className="text-base sm:text-lg font-medium dark:text-white">Nursery Essentials</h2>
            {shoppingList.filter((i) => !i.checked).length > 0 && (
              <span className="ml-auto text-xs bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300 rounded-full px-2 py-0.5">
                {shoppingList.filter((i) => !i.checked).length} left
              </span>
            )}
          </div>

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

        {babyProfile?.birthDate && (
          <Link to="/tracking" className="block mt-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium dark:text-white">
                  {babyProfile.name ? `${babyProfile.name}'s tracking` : "Tracking"}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Targets, feeds normalcy chart, milestones
                </p>
              </div>
              <span className="text-blue-600 dark:text-blue-400 text-sm">View →</span>
            </div>
          </Link>
        )}
      </div>

      <Navigation />
    </div>
  );
}
