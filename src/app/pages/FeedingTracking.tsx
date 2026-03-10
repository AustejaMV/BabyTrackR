import { useState, useEffect, useRef } from "react";
import { Navigation } from "../components/Navigation";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { addHours } from "date-fns";
import { ArrowLeft, Clock, Pause, Play, Square } from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { saveData, syncDataToServer, loadAllDataFromServer } from "../utils/dataSync";
import { safeFormat } from "../utils/dateUtils";
import { endCurrentSleepIfActive } from "../utils/sleepUtils";
import { toast } from "sonner";

export interface FeedingSegment {
  type: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  amount?: number;
}

export interface FeedingRecord {
  id: string;
  /** Single type for backward compat when no segments (legacy or simple feed). */
  type?: string;
  timestamp: number;
  amount?: number;
  startTime?: number;
  endTime?: number;
  durationMs?: number;
  /** When present, one feeding session with multiple segments (e.g. 30m left, 10m right, 20m formula 60ml). */
  segments?: FeedingSegment[];
}

const FEEDING_TYPES = ["Left breast", "Right breast", "Formula", "Solids"];

const ACTIVE_SESSION_KEY = "feedingActiveSession";
const FEEDING_POLL_MS = 4 * 1000; // same as Dashboard so we see them start/stop while on this tab

function getLastFeedingEndTime(f: FeedingRecord): number {
  return f.endTime ?? f.timestamp;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatDurationShort(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

interface ActiveSession {
  sessionStartTime: number;
  segments: { type: string; startTime: number; endTime?: number; amount?: number }[];
}

export function FeedingTracking() {
  const [feedingHistory, setFeedingHistory] = useState<FeedingRecord[]>([]);
  const [selectedType, setSelectedType] = useState<string>(FEEDING_TYPES[0]);
  const [formulaAmount, setFormulaAmount] = useState<string>("");
  const [feedingInterval, setFeedingInterval] = useState<string>("3");
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [totalElapsedMs, setTotalElapsedMs] = useState(0);
  const [currentSegmentElapsedMs, setCurrentSegmentElapsedMs] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [totalPausedMs, setTotalPausedMs] = useState(0);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const { session: authSession, familyId } = useAuth();
  // After a local action (start/stop/pause/resume/switch), skip one poll cycle so the server
  // has time to receive our change before we apply server state (prevents race condition).
  const wasLocalActionRef = useRef(false);

  // Poll when on this tab so we see the other person start/stop feeding (like same screen)
  useEffect(() => {
    if (!authSession?.access_token || !familyId) return;
    const refetch = () => {
      loadAllDataFromServer(authSession.access_token).then(({ ok, data: serverData }) => {
        if (!ok || !serverData) return;
        const remote = serverData.feedingActiveSession as typeof session | null | undefined;
        // Always persist history
        if (serverData.feedingHistory != null) {
          try {
            localStorage.setItem("feedingHistory", JSON.stringify(serverData.feedingHistory));
          } catch {
            // ignore
          }
        }
        // Skip one cycle after a local action so the server has time to receive it
        if (wasLocalActionRef.current) {
          wasLocalActionRef.current = false;
          // Still update localStorage so state survives tab navigation
          if (remote != null) {
            try { localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(remote)); } catch { /* ignore */ }
          } else {
            try { localStorage.removeItem(ACTIVE_SESSION_KEY); } catch { /* ignore */ }
          }
          return;
        }
        if (document.visibilityState !== "visible") return;
        // Persist server session to localStorage (survives tab navigation)
        if (remote != null) {
          try { localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(remote)); } catch { /* ignore */ }
        } else {
          try { localStorage.removeItem(ACTIVE_SESSION_KEY); } catch { /* ignore */ }
        }
        if (remote != null && remote.session?.segments) {
          const now = Date.now();
          const r = remote as { session: ActiveSession; isPaused?: boolean; totalPausedMs?: number; pausedAt?: number | null };
          let totalPaused = r.totalPausedMs ?? 0;
          if (r.isPaused && r.pausedAt != null) totalPaused += now - r.pausedAt;
          const start = (r as { serverStartTime?: number }).serverStartTime ?? r.session.sessionStartTime;
          setSession({ ...r.session, sessionStartTime: start });
          setIsPaused(!!r.isPaused);
          setTotalPausedMs(totalPaused);
          setPausedAt(r.isPaused ? now : null);
          setTotalElapsedMs(now - start - totalPaused);
          const last = r.session.segments[r.session.segments.length - 1];
          setCurrentSegmentElapsedMs(last ? now - (last.endTime ?? last.startTime) : 0);
          setFeedingHistory(JSON.parse(localStorage.getItem("feedingHistory") || "[]"));
        } else {
          setSession(null);
          setIsPaused(false);
          setTotalPausedMs(0);
          setPausedAt(null);
          setFeedingHistory(JSON.parse(localStorage.getItem("feedingHistory") || "[]"));
        }
      });
    };
    refetch();
    const id = setInterval(refetch, FEEDING_POLL_MS);
    return () => clearInterval(id);
  }, [authSession?.access_token, familyId]);

  // Persist active session so it survives leaving the tab (no cancel/pause on navigate away)
  const persistActiveSession = (s: ActiveSession | null, paused: boolean, pausedMs: number, pausedAtVal: number | null) => {
    if (!s) {
      try {
        localStorage.removeItem(ACTIVE_SESSION_KEY);
      } catch {
        // ignore
      }
      return;
    }
    try {
      localStorage.setItem(
        ACTIVE_SESSION_KEY,
        JSON.stringify({ session: s, isPaused: paused, totalPausedMs: pausedMs, pausedAt: pausedAtVal })
      );
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const historyData = localStorage.getItem("feedingHistory");
    if (historyData) {
      setFeedingHistory(JSON.parse(historyData));
    }
    const intervalData = localStorage.getItem("feedingInterval");
    if (intervalData && intervalData !== "[]") {
      try {
        const parsed = JSON.parse(intervalData);
        if (typeof parsed === "string" && parsed !== "") setFeedingInterval(parsed);
        else if (typeof parsed === "number" && !Number.isNaN(parsed)) setFeedingInterval(String(parsed));
      } catch {
        setFeedingInterval(intervalData);
      }
    }
    // Restore active feeding session if user left the tab and came back
    const saved = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const { session: savedSession, isPaused: savedPaused, totalPausedMs: savedTotalPausedMs, pausedAt: savedPausedAt, serverStartTime } = parsed;
        if (savedSession?.sessionStartTime != null && Array.isArray(savedSession?.segments)) {
          const now = Date.now();
          let totalPaused = savedTotalPausedMs ?? 0;
          if (savedPaused && savedPausedAt != null) {
            totalPaused += now - savedPausedAt;
          }
          const canonicalStart = typeof serverStartTime === "number" ? serverStartTime : savedSession.sessionStartTime;
          setSession({ ...savedSession, sessionStartTime: canonicalStart });
          setIsPaused(!!savedPaused);
          setTotalPausedMs(totalPaused);
          setPausedAt(savedPaused ? now : null); // "paused since" we returned to the tab
          setTotalElapsedMs(now - canonicalStart - totalPaused);
          const last = savedSession.segments[savedSession.segments.length - 1];
          setCurrentSegmentElapsedMs(last ? now - (last.endTime ?? last.startTime) : 0);
        }
      } catch {
        localStorage.removeItem(ACTIVE_SESSION_KEY);
      }
    }
  }, []);

  // Timers: total session + current segment (paused time excluded)
  useEffect(() => {
    if (!session || isPaused) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setTotalElapsedMs(now - session.sessionStartTime - totalPausedMs);
      const last = session.segments[session.segments.length - 1];
      if (last && last.startTime != null) {
        setCurrentSegmentElapsedMs(now - (last.endTime ?? last.startTime));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [session, isPaused, totalPausedMs]);

  useEffect(() => {
    persistActiveSession(session, isPaused, totalPausedMs, pausedAt);
    // Only sync when the state change came from a local action (start/stop/pause/resume/switch).
    // If wasLocalActionRef is false the change came from a poll — don't write it back or we'd
    // resurrect a stopped session on the server.
    if (!wasLocalActionRef.current) return;
    if (authSession?.access_token && session) {
      syncDataToServer(
        "feedingActiveSession",
        { session, isPaused, totalPausedMs, pausedAt },
        authSession.access_token
      );
    }
  }, [session, isPaused, totalPausedMs, pausedAt, authSession?.access_token]);

  const startFeeding = () => {
    const now = Date.now();
    const amount = selectedType === "Formula" && formulaAmount ? parseFloat(formulaAmount) : undefined;
    wasLocalActionRef.current = true;
    setSession({
      sessionStartTime: now,
      segments: [{ type: selectedType, startTime: now, amount }],
    });
    setTotalElapsedMs(0);
    setCurrentSegmentElapsedMs(0);
    setIsPaused(false);
    setTotalPausedMs(0);
    setPausedAt(null);
    // End sleep only when user actually starts feeding (not when just visiting the tab)
    const ended = endCurrentSleepIfActive((sleepHistory) => {
      if (authSession?.access_token) {
        saveData("sleepHistory", sleepHistory, authSession.access_token);
        saveData("currentSleep", null, authSession.access_token);
      }
    });
    if (ended) toast.info("Sleep session ended (baby is feeding).");
  };

  const switchType = (type: string) => {
    if (!session || session.segments.length === 0) return;
    const now = Date.now();
    const segs = [...session.segments];
    const last = segs[segs.length - 1];
    segs[segs.length - 1] = { ...last, endTime: now };
    const amount = type === "Formula" && formulaAmount ? parseFloat(formulaAmount) : undefined;
    segs.push({ type, startTime: now, amount });
    wasLocalActionRef.current = true;
    setSession({ ...session, segments: segs });
    setCurrentSegmentElapsedMs(0);
    if (type === "Formula") setFormulaAmount("");
  };

  const setCurrentSegmentAmount = (ml: number | undefined) => {
    if (!session || session.segments.length === 0) return;
    const segs = [...session.segments];
    segs[segs.length - 1].amount = ml;
    wasLocalActionRef.current = true;
    setSession({ ...session, segments: segs });
  };

  const pauseFeeding = () => {
    if (!session || isPaused) return;
    wasLocalActionRef.current = true;
    setPausedAt(Date.now());
    setIsPaused(true);
  };

  const resumeFeeding = () => {
    if (!session || !isPaused || pausedAt == null) return;
    wasLocalActionRef.current = true;
    setTotalPausedMs((prev) => prev + (Date.now() - pausedAt));
    setPausedAt(null);
    setIsPaused(false);
  };

  const endFeeding = () => {
    if (!session || session.segments.length === 0) return;
    const now = Date.now();
    const segs = session.segments.map((s, i) => ({
      ...s,
      endTime: s.endTime ?? now,
    }));
    if (segs.length > 0) segs[segs.length - 1] = { ...segs[segs.length - 1], endTime: now };
    const segments: FeedingSegment[] = segs.map((s) => ({
      type: s.type,
      startTime: s.startTime,
      endTime: s.endTime!,
      durationMs: s.endTime! - s.startTime,
      amount: s.amount,
    }));
    const totalDurationMs = now - session.sessionStartTime - totalPausedMs;
    const newFeeding: FeedingRecord = {
      id: now.toString(),
      timestamp: now,
      startTime: session.sessionStartTime,
      endTime: now,
      durationMs: totalDurationMs,
      segments,
    };
    const updated = [...feedingHistory, newFeeding];
    wasLocalActionRef.current = true;
    setFeedingHistory(updated);
    localStorage.setItem("feedingHistory", JSON.stringify(updated));
    setSession(null);
    setFormulaAmount("");
    setIsPaused(false);
    setTotalPausedMs(0);
    setPausedAt(null);
    try {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch {
      // ignore
    }
    if (authSession?.access_token) {
      syncDataToServer("feedingActiveSession", null, authSession.access_token);
      saveData("feedingHistory", updated, authSession.access_token);
    }
    const totalMins = Math.round(totalDurationMs / 60000);
    toast.success(`Feeding logged: ${totalMins} min total (${segments.length} segment${segments.length === 1 ? "" : "s"}).`);
  };

  const getNextFeedingTime = () => {
    if (feedingHistory.length === 0) return null;
    const lastFeeding = feedingHistory[feedingHistory.length - 1];
    const lastEnd = getLastFeedingEndTime(lastFeeding);
    const interval = parseInt(feedingInterval, 10) || 3;
    return addHours(new Date(lastEnd), interval);
  };

  const getTimeUntilNext = () => {
    const nextTime = getNextFeedingTime();
    if (!nextTime) return null;
    const diff = nextTime.getTime() - Date.now();
    if (diff < 0) return "Overdue";
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  // Chart: total ml per feeding (sum of segment amounts)
  const chartData = feedingHistory
    .slice(-20)
    .map((feeding, index) => {
      const totalMl = feeding.segments
        ? feeding.segments.reduce((sum, s) => sum + (s.amount ?? 0), 0)
        : feeding.amount ?? 0;
      return {
        index: index + 1,
        time: safeFormat(getLastFeedingEndTime(feeding), "HH:mm", ""),
        amount: totalMl,
      };
    });

  const nextFeedingTime = getNextFeedingTime();
  const currentSegment = session?.segments[session.segments.length - 1];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 pb-20">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl dark:text-white">Feeding Tracking</h1>
        </div>

        {feedingHistory.length > 0 && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl p-6 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5" />
              <h2 className="text-lg">Next Feeding</h2>
            </div>
            <p className="text-3xl mb-1">
              {nextFeedingTime && safeFormat(nextFeedingTime.getTime(), "h:mm a")}
            </p>
            <p className="text-green-100">in {getTimeUntilNext()}</p>
            <div className="mt-3 flex items-center gap-2">
              <label className="text-sm">Feeding every</label>
              <Input
                type="number"
                value={feedingInterval}
                onChange={(e) => setFeedingInterval(e.target.value)}
                onBlur={(e) => {
                  const val = parseInt(e.target.value, 10);
                  const valueToSave = (!val || val < 1) ? "1" : e.target.value;
                  setFeedingInterval(valueToSave);
                  localStorage.setItem("feedingInterval", valueToSave);
                  if (authSession?.access_token) {
                    saveData("feedingInterval", valueToSave, authSession.access_token);
                  }
                }}
                className="w-16 bg-white dark:bg-gray-800 text-black dark:text-white border dark:border-gray-600"
                min={1}
                max={12}
              />
              <span className="text-sm">hours</span>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg mb-4 dark:text-white">
            {session ? "Feeding in progress" : "Start feeding"}
          </h2>

          {!session ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose the first type, then tap Start. You can switch types during the session; one feeding is saved when you tap Feeding ended.
              </p>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">First type</label>
                <div className="grid grid-cols-2 gap-2">
                  {FEEDING_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedType(type)}
                      className={`p-3 rounded-lg border-2 transition-all text-sm ${
                        selectedType === type
                          ? "border-green-600 bg-green-50 dark:border-green-500 dark:bg-green-900/40 dark:text-white"
                          : "border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 hover:border-green-400 dark:hover:border-green-500"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              {selectedType === "Formula" && (
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Amount (ml) – optional</label>
                  <Input
                    type="number"
                    value={formulaAmount}
                    onChange={(e) => setFormulaAmount(e.target.value)}
                    placeholder="e.g. 60"
                    step="10"
                    min={0}
                  />
                </div>
              )}
              <Button onClick={startFeeding} className="w-full" size="lg">
                <Play className="w-5 h-5 mr-2" />
                Start feeding
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total time {isPaused && "(paused)"}</p>
                <p className="text-3xl font-mono text-green-600 dark:text-green-400">
                  {formatDuration(totalElapsedMs)}
                </p>
              </div>
              {session.segments.length > 1 && (
                <div className="text-sm">
                  <p className="text-gray-600 dark:text-gray-400 mb-1">So far:</p>
                  <ul className="space-y-0.5">
                    {session.segments.slice(0, -1).map((seg, i) => (
                      <li key={i} className="dark:text-gray-300">
                        {seg.type}
                        {seg.endTime != null && ` ${formatDurationShort(seg.endTime - seg.startTime)}`}
                        {seg.amount != null && seg.amount > 0 && ` · ${seg.amount} ml`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Current</p>
                <p className="text-xl font-medium dark:text-white">{currentSegment?.type}</p>
                <p className="text-2xl font-mono text-green-600 dark:text-green-400 mt-1">
                  {formatDuration(currentSegmentElapsedMs)}
                </p>
                {currentSegment?.type === "Formula" && (
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400">ml:</label>
                    <Input
                      type="number"
                      value={currentSegment.amount ?? ""}
                      onChange={(e) => {
                        const v = e.target.value === "" ? undefined : parseFloat(e.target.value);
                        setCurrentSegmentAmount(v);
                      }}
                      placeholder="e.g. 60"
                      className="w-24"
                      step="10"
                      min={0}
                    />
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Switch to</p>
                <div className="grid grid-cols-2 gap-2">
                  {FEEDING_TYPES.filter((t) => t !== currentSegment?.type).map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => switchType(type)}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
                {currentSegment?.type !== "Formula" && (
                  <div className="mt-2">
                    <label className="text-xs text-gray-500 dark:text-gray-400">Formula amount (ml) for next switch:</label>
                    <Input
                      type="number"
                      value={formulaAmount}
                      onChange={(e) => setFormulaAmount(e.target.value)}
                      placeholder="e.g. 60"
                      className="w-24 mt-1"
                      step="10"
                      min={0}
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {isPaused ? (
                  <Button onClick={resumeFeeding} className="flex-1" size="lg" variant="outline">
                    <Play className="w-5 h-5 mr-2" />
                    Resume
                  </Button>
                ) : (
                  <Button onClick={pauseFeeding} className="flex-1" size="lg" variant="outline">
                    <Pause className="w-5 h-5 mr-2" />
                    Pause
                  </Button>
                )}
                <Button onClick={endFeeding} className="flex-1" size="lg" variant="default">
                  <Square className="w-5 h-5 mr-2" />
                  Feeding ended
                </Button>
              </div>
            </div>
          )}
        </div>

        {chartData.length > 0 && chartData.some((d) => d.amount > 0) && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6 border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg mb-4 dark:text-white">Feeding amounts (ml)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg mb-4 dark:text-white">Recent feedings</h2>
          {feedingHistory.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No feedings recorded yet</p>
          ) : (
            <div className="space-y-3">
              {feedingHistory
                .slice(-10)
                .reverse()
                .map((feeding) => {
                  const endTime = getLastFeedingEndTime(feeding);
                  const duration = feeding.durationMs != null ? formatDuration(feeding.durationMs) : null;
                  const hasSegments = feeding.segments && feeding.segments.length > 0;
                  const totalMl = hasSegments
                    ? feeding.segments!.reduce((s, seg) => s + (seg.amount ?? 0), 0)
                    : feeding.amount ?? 0;
                  return (
                    <div
                      key={feeding.id}
                      className="flex flex-col gap-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          {hasSegments ? (
                            <p className="dark:text-white font-medium">
                              {formatDurationShort(feeding.durationMs ?? 0)} total
                            </p>
                          ) : (
                            <p className="dark:text-white font-medium">{feeding.type ?? "Feeding"}</p>
                          )}
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {safeFormat(endTime, "MMM d, h:mm a")}
                            {duration != null && ` · ${duration}`}
                          </p>
                        </div>
                        {totalMl > 0 && (
                          <p className="text-green-600 dark:text-green-400 font-medium">{totalMl} ml</p>
                        )}
                      </div>
                      {hasSegments && feeding.segments!.length > 0 && (
                        <ul className="text-xs text-gray-600 dark:text-gray-400 mt-1 space-y-0.5">
                          {feeding.segments!.map((seg, i) => (
                            <li key={i}>
                              {seg.type}: {formatDurationShort(seg.durationMs)}
                              {seg.amount != null && seg.amount > 0 && ` · ${seg.amount} ml`}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      <Navigation />
    </div>
  );
}
