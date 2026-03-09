import { Baby, Utensils, Droplet, Clock, Pill } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Navigation } from "../components/Navigation";
import { WarningIndicators } from "../components/WarningIndicators";
import { ThemeToggle } from "../components/ThemeToggle";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { requestNotificationPermission, scheduleNotification } from "../utils/notifications";
import { useAuth } from "../contexts/AuthContext";
import { loadAllDataFromServer, saveData, clearSyncedDataFromLocalStorage, SYNCED_DATA_KEYS } from "../utils/dataSync";

// Server-cost friendly: poll less often, only when tab is visible, throttle visibility refetch
const FAMILY_DATA_POLL_INTERVAL_MS = 60 * 1000; // 60s when visible
const VISIBILITY_REFETCH_MIN_MS = 20 * 1000;   // don't refetch on tab focus if we did <20s ago
import { toast } from "sonner";
import { Button } from "../components/ui/button";

interface SleepRecord {
  id: string;
  position: string;
  startTime: number;
  endTime?: number;
}

interface FeedingRecord {
  id: string;
  type?: string;
  timestamp: number;
  amount?: number;
  endTime?: number;
  durationMs?: number;
  segments?: { type: string; durationMs: number; amount?: number }[];
}

interface DiaperRecord {
  id: string;
  type: "pee" | "poop" | "both";
  timestamp: number;
}

interface PainkillerDose {
  id: string;
  timestamp: number;
}

export function Dashboard() {
  const [currentSleep, setCurrentSleep] = useState<SleepRecord | null>(null);
  const [lastFeeding, setLastFeeding] = useState<FeedingRecord | null>(null);
  const [recentDiapers, setRecentDiapers] = useState<DiaperRecord[]>([]);
  const [lastPainkiller, setLastPainkiller] = useState<PainkillerDose | null>(null);
  const [lastDataDebug, setLastDataDebug] = useState<{ familyId: string | null; rowsReturned?: number } | null>(null);
  const { user, session, loading, familyId } = useAuth();
  const prevFamilyIdRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Handle PWA quick actions
    const action = searchParams.get('action');
    if (action && user) {
      handleQuickAction(action);
    }
  }, [searchParams, user]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }

    if (user && session) {
      // When family switched (had another family before), or when we now have a family (e.g. invitee just joined), clear local synced data so we don't show stale/previous data
      if (familyId && (prevFamilyIdRef.current == null || prevFamilyIdRef.current !== familyId)) {
        clearSyncedDataFromLocalStorage();
      }
      if (familyId) prevFamilyIdRef.current = familyId;
      console.log('[BabyTracker] Dashboard: fetching family data', { familyId: familyId ?? 'none' });
      loadAllDataFromServer(session.access_token).then(({ ok, data: serverData, _debug }) => {
        if (!ok) {
          console.warn('[BabyTracker] Dashboard: GET /data/all failed, not applying (keeping current local data)');
          return;
        }
        const keyCount = Object.keys(serverData).length;
        if (keyCount === 0) {
          if (_debug) {
            console.warn('[BabyTracker] Server returned 0 keys. Your familyId =', _debug.familyId, '| DB rowsReturned =', _debug.rowsReturned, '- If inviter has data, ask them to sync and compare familyId in their console.');
            setLastDataDebug({ familyId: _debug.familyId ?? null, rowsReturned: _debug.rowsReturned });
          }
          // Don't clear or overwrite local data when server has nothing — avoids wiping inviter's unsynced data on refresh
          loadLocalDataRef.current();
          return;
        }
        setLastDataDebug(null);
        console.log('[BabyTracker] Dashboard: applying server data', { keys: keyCount });
        clearSyncedDataFromLocalStorage();
        Object.entries(serverData).forEach(([key, value]) => {
          try {
            localStorage.setItem(key, JSON.stringify(value));
          } catch {
            // ignore
          }
        });
        // Ensure any synced key not returned by server is set to empty so we never show stale local data (e.g. invitee's old data)
        for (const key of SYNCED_DATA_KEYS) {
          if (!(key in serverData)) {
            try {
              localStorage.setItem(key, JSON.stringify([]));
            } catch {
              // ignore
            }
          }
        }
        loadLocalDataRef.current();
      });
    } else {
      loadLocalData();
    }

    // Request notification permission on first load
    requestNotificationPermission();
  }, [user, loading, session, navigate, familyId]);

  // Poll for family data only when tab is visible (saves server cost when user has tab in background)
  useEffect(() => {
    if (!user || !session?.access_token || !familyId) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;
    const lastRefetchAt = { current: 0 };

    const refetchAndApply = () => {
      loadAllDataFromServer(session!.access_token!).then(({ ok, data: serverData }) => {
        if (!ok || Object.keys(serverData).length === 0) return;
        clearSyncedDataFromLocalStorage();
        Object.entries(serverData).forEach(([key, value]) => {
          try {
            localStorage.setItem(key, JSON.stringify(value));
          } catch {
            // ignore
          }
        });
        for (const key of SYNCED_DATA_KEYS) {
          if (!(key in serverData)) {
            try {
              localStorage.setItem(key, JSON.stringify([]));
            } catch {
              // ignore
            }
          }
        }
        loadLocalDataRef.current();
        lastRefetchAt.current = Date.now();
      });
    };

    const startPolling = (immediateRefetch: boolean) => {
      if (intervalId != null) return;
      if (immediateRefetch) refetchAndApply();
      intervalId = setInterval(refetchAndApply, FAMILY_DATA_POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (intervalId != null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        const shouldRefetchNow = now - lastRefetchAt.current >= VISIBILITY_REFETCH_MIN_MS;
        startPolling(shouldRefetchNow);
      } else {
        stopPolling();
      }
    };

    if (document.visibilityState === "visible") startPolling(true);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [user, session?.access_token, familyId]);

  const loadLocalDataRef = useRef<() => void>(() => {});
  const loadLocalData = () => {
    // Load current sleep session
    const sleepData = localStorage.getItem("currentSleep");
    if (sleepData) {
      setCurrentSleep(JSON.parse(sleepData));
    }

    // Load last feeding (use endTime ?? timestamp for "when it ended")
    const feedingHistory = localStorage.getItem("feedingHistory");
    if (feedingHistory) {
      const feedings: FeedingRecord[] = JSON.parse(feedingHistory);
      if (feedings.length > 0) {
        setLastFeeding(feedings[feedings.length - 1]);
      }
    }

    // Load recent diapers (last 24 hours)
    const diaperHistory = localStorage.getItem("diaperHistory");
    if (diaperHistory) {
      const diapers = JSON.parse(diaperHistory);
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      setRecentDiapers(diapers.filter((d: DiaperRecord) => d.timestamp > oneDayAgo));
    }

    // Load last painkiller dose
    const painkillerHistory = localStorage.getItem("painkillerHistory");
    if (painkillerHistory) {
      const doses: PainkillerDose[] = JSON.parse(painkillerHistory);
      if (doses.length > 0) {
        const last = doses[doses.length - 1];
        setLastPainkiller(last);

        const eightHoursMs = 8 * 60 * 60 * 1000;
        const elapsed = Date.now() - last.timestamp;
        const remaining = eightHoursMs - elapsed;

        if (remaining > 0) {
          scheduleNotification(
            "Painkiller reminder",
            "It has been 8 hours since your last painkiller dose.",
            remaining,
          );
        }
      }
    }
  };
  loadLocalDataRef.current = loadLocalData;

  const logPainkiller = () => {
    const history: PainkillerDose[] = JSON.parse(localStorage.getItem("painkillerHistory") || "[]");
    const now = Date.now();
    const newDose: PainkillerDose = {
      id: now.toString(),
      timestamp: now,
    };
    history.push(newDose);
    localStorage.setItem("painkillerHistory", JSON.stringify(history));
    if (session?.access_token) {
      saveData("painkillerHistory", history, session.access_token);
    }
    setLastPainkiller(newDose);

    const eightHoursMs = 8 * 60 * 60 * 1000;
    scheduleNotification(
      "Painkiller reminder",
      "It has been 8 hours since your last painkiller dose.",
      eightHoursMs,
    );

    toast.success("Painkiller dose logged. We'll remind you in 8 hours.");
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'pee':
        logDiaper('pee');
        break;
      case 'poop':
        logDiaper('poop');
        break;
      case 'feed':
        navigate('/feeding');
        break;
      case 'sleep':
        navigate('/sleep');
        break;
    }
  };

  const logDiaper = (type: 'pee' | 'poop') => {
    const diaperHistory = JSON.parse(localStorage.getItem('diaperHistory') || '[]');
    const newDiaper: DiaperRecord = {
      id: Date.now().toString(),
      type,
      timestamp: Date.now(),
    };
    diaperHistory.push(newDiaper);
    localStorage.setItem('diaperHistory', JSON.stringify(diaperHistory));
    if (session?.access_token) {
      saveData('diaperHistory', diaperHistory, session.access_token);
    }
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} logged!`);
    loadLocalData();
  };

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

  const getTimeSince = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl mb-2 dark:text-white">Baby Care Tracker</h1>
            <p className="text-gray-600 dark:text-gray-400">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
          </div>
          <ThemeToggle />
        </div>

        <WarningIndicators />

        {familyId && !lastFeeding && recentDiapers.length === 0 && !currentSleep && !lastPainkiller && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm space-y-1">
            <p>No shared logs yet. Ask the inviter to open Settings and tap &quot;Sync my data to family&quot;.</p>
            {lastDataDebug?.familyId != null && (
              <p className="text-xs opacity-90 mt-1">Your familyId: <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">{lastDataDebug.familyId}</code> (compare with inviter&apos;s console; if different, re-accept the invite.)</p>
            )}
            {lastDataDebug?.rowsReturned === 0 && (
              <p className="text-xs opacity-90">Server has 0 rows for this family — inviter must sync first.</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Sleep Status tile */}
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
                      <p className="text-base sm:text-lg text-blue-600 dark:text-blue-400 truncate">{currentSleep.position}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{getTimeSince(currentSleep.startTime)}</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Not tracking</p>
                  )}
                </div>
              </div>
            </div>
          </Link>

          {/* Feeding Status tile */}
          <Link to="/feeding" className="block">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all h-full min-h-[120px] flex flex-col justify-center border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center shrink-0">
                  <Utensils className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm sm:text-base font-medium dark:text-white truncate">Feeding</h2>
                  {lastFeeding ? (
                    <>
                      <p className="text-base sm:text-lg text-green-600 dark:text-green-400 truncate">
                        {lastFeeding.segments?.length
                          ? `${Math.round((lastFeeding.durationMs ?? 0) / 60000)}m total`
                          : (lastFeeding.type ?? "Feeding")}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {getTimeSince(lastFeeding.endTime ?? lastFeeding.timestamp)}
                        {lastFeeding.durationMs != null && ` · ${Math.round(lastFeeding.durationMs / 60000)}m`}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No feedings yet</p>
                  )}
                </div>
              </div>
            </div>
          </Link>

          {/* Diaper Status tile */}
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

          {/* Painkiller Tracker - full width tile */}
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
      </div>

      <Navigation />
    </div>
  );
}