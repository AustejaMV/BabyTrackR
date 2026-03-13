import { useState, useEffect, useRef } from "react";
import { Navigation } from "../components/Navigation";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { ArrowLeft, Play, Square } from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { saveData, loadAllDataFromServer, POLL_MS_ACTIVE, POLL_MS_IDLE } from "../utils/dataSync";
import { safeFormat } from "../utils/dateUtils";
import { buildTimestamp, buildDurationMs, isManualEntryValid } from "../utils/manualEntryUtils";
import { adjustActiveTummyItem, adjustTummyHistoryItem, setActiveTummyDisplayedDuration, setTummyHistoryDisplayedDuration, tummyDisplayedDurationMs } from "../utils/tummyUtils";
import { DurationPicker, MAX_DURATION_HISTORY_MS } from "../components/DurationPicker";
import { useGracePeriod } from "../hooks/useGracePeriod";
import { endCurrentSleepIfActive } from "../utils/sleepUtils";
import type { TummyTimeRecord } from "../types";

function TummyManualEntry({ onSave }: { onSave: (record: TummyTimeRecord) => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [timeH, setTimeH] = useState("");
  const [timeM, setTimeM] = useState("0");
  const [durH, setDurH] = useState("0");
  const [durM, setDurM] = useState("");

  const save = () => {
    if (!isManualEntryValid(date, timeH, durH, durM)) return;
    const startTime = buildTimestamp(date, timeH, timeM);
    const durationMs = buildDurationMs(durH, durM);
    onSave({ id: `manual-${Date.now()}`, startTime, endTime: startTime + durationMs });
    setOpen(false);
    setDate(""); setTimeH(""); setTimeM("0"); setDurH("0"); setDurM("");
  };

  if (!open) return (
    <button type="button" onClick={() => setOpen(true)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
      + Log a past session
    </button>
  );

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium dark:text-white">Log past tummy time</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Start time (24h)</label>
          <div className="flex items-center gap-1">
            <Input type="number" min={0} max={23} placeholder="HH" value={timeH} onChange={(e) => setTimeH(e.target.value)} className="text-center" />
            <span className="text-gray-400">:</span>
            <Input type="number" min={0} max={59} placeholder="MM" value={timeM} onChange={(e) => setTimeM(e.target.value)} className="text-center" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Duration hours</label>
          <Input type="number" value={durH} onChange={(e) => setDurH(e.target.value)} min={0} placeholder="0" />
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Duration min (optional)</label>
          <Input type="number" value={durM} onChange={(e) => setDurM(e.target.value)} min={0} max={59} placeholder="0" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={!isManualEntryValid(date, timeH, durH, durM)}>Save</Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

export function TummyTime() {
  const [currentSession, setCurrentSession] = useState<TummyTimeRecord | null>(null);
  const [tummyTimeHistory, setTummyTimeHistory] = useState<TummyTimeRecord[]>([]);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const currentTimerRef = useRef<HTMLDivElement>(null);
  const { session, familyId } = useAuth();
  const grace = useGracePeriod();

  // Poll for family data with dynamic rate
  useEffect(() => {
    if (!session?.access_token || !familyId) return;

    const pollMsRef = { current: POLL_MS_IDLE };
    const timerRef = { current: 0 as unknown as ReturnType<typeof setInterval> };

    const reschedule = () => {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(refetch, pollMsRef.current);
    };

    const refetch = () => {
      loadAllDataFromServer(session.access_token).then(({ ok, data }) => {
        if (!ok || !data) return;

        // History: guard against overwriting a recent local adjustment
        if (data.tummyTimeHistory != null && !grace.isInActionGrace()) {
          try {
            localStorage.setItem("tummyTimeHistory", JSON.stringify(data.tummyTimeHistory));
            setTummyTimeHistory(data.tummyTimeHistory as TummyTimeRecord[]);
          } catch { /* ignore */ }
        }

        if (data.currentTummyTime != null) {
          if (grace.isInStopGrace() || grace.isInActionGrace()) return;
          try {
            localStorage.setItem("currentTummyTime", JSON.stringify(data.currentTummyTime));
            setCurrentSession(data.currentTummyTime as TummyTimeRecord);
          } catch { /* ignore */ }
        } else {
          if (grace.isInStartGrace() || grace.isInActionGrace()) return;
          try {
            localStorage.removeItem("currentTummyTime");
            setCurrentSession(null);
          } catch { /* ignore */ }
        }

        const next = data.currentTummyTime != null ? POLL_MS_ACTIVE : POLL_MS_IDLE;
        if (next !== pollMsRef.current) { pollMsRef.current = next; reschedule(); }
      });
    };

    refetch();
    timerRef.current = setInterval(refetch, pollMsRef.current);
    return () => clearInterval(timerRef.current);
  }, [session?.access_token, familyId]);

  // Load from localStorage on mount
  useEffect(() => {
    const currentData = localStorage.getItem("currentTummyTime");
    if (currentData) {
      try { setCurrentSession(JSON.parse(currentData)); } catch { /* ignore */ }
    }
    const historyData = localStorage.getItem("tummyTimeHistory");
    if (historyData) {
      try { setTummyTimeHistory(JSON.parse(historyData)); } catch { /* ignore */ }
    }
  }, []);

  // Live elapsed timer
  useEffect(() => {
    if (!currentSession) return;
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - currentSession.startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [currentSession]);

  // When there's an active tummy time session, scroll the duration picker into view
  useEffect(() => {
    if (!currentSession || !currentTimerRef.current) return;
    currentTimerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentSession]);

  const startSession = () => {
    // Guard: ignore double-taps while already running
    if (currentSession) return;
    endCurrentSleepIfActive((sleepHistory) => {
      if (session?.access_token) {
        saveData("sleepHistory", sleepHistory, session.access_token);
        saveData("currentSleep", null, session.access_token);
      }
    });
    const newSession: TummyTimeRecord = { id: Date.now().toString(), startTime: Date.now() };
    grace.markStarted();
    setCurrentSession(newSession);
    localStorage.setItem("currentTummyTime", JSON.stringify(newSession));
    if (session?.access_token) saveData("currentTummyTime", newSession, session.access_token);
  };

  const stopSession = () => {
    if (!currentSession) return;
    const completedSession = { ...currentSession, endTime: Date.now() };
    const updatedHistory = [...tummyTimeHistory, completedSession];
    grace.markStopped();
    setTummyTimeHistory(updatedHistory);
    try { localStorage.setItem("tummyTimeHistory", JSON.stringify(updatedHistory)); } catch { /* quota/security */ }
    try { localStorage.removeItem("currentTummyTime"); } catch { /* ignore */ }
    setCurrentSession(null);
    setElapsedTime(0);
    if (session?.access_token) {
      saveData("tummyTimeHistory", updatedHistory, session.access_token);
      saveData("currentTummyTime", null, session.access_token);
    }
  };

  const adjustActiveTime = (mins: number) => {
    if (!currentSession) return;
    grace.markAction();
    const updated = adjustActiveTummyItem(currentSession, mins);
    setCurrentSession(updated);
    // Immediately reflect the new elapsed time before the next tick
    setElapsedTime(Math.max(0, Date.now() - updated.startTime));
    try { localStorage.setItem("currentTummyTime", JSON.stringify(updated)); } catch { /* quota/security */ }
    if (session?.access_token) saveData("currentTummyTime", updated, session.access_token);
  };

  const adjustHistoryTime = (id: string, mins: number) => {
    grace.markAction();
    const updated = tummyTimeHistory.map((t) => t.id === id ? adjustTummyHistoryItem(t, mins) : t);
    setTummyTimeHistory(updated);
    try { localStorage.setItem("tummyTimeHistory", JSON.stringify(updated)); } catch { /* quota/security */ }
    if (session?.access_token) saveData("tummyTimeHistory", updated, session.access_token);
  };

  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todaySessions = tummyTimeHistory.filter((t) => t.startTime > todayStart && t.endTime);
  const todayTotal = todaySessions.reduce((acc, s) => acc + tummyDisplayedDurationMs(s), 0);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const chartData = last7Days.map((date) => {
    const dayStart = date.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const totalMinutes = tummyTimeHistory
      .filter((t) => t.startTime >= dayStart && t.startTime < dayEnd && t.endTime)
      .reduce((acc, t) => acc + tummyDisplayedDurationMs(t) / 60000, 0);
    return { date: format(date, "EEE"), minutes: Math.round(totalMinutes) };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 pb-20">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl dark:text-white">Tummy Time</h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-lg mb-2 dark:text-white">Today's Total</h2>
          <p className="text-4xl text-blue-600 dark:text-blue-400 mb-1">
            {Math.floor(todayTotal / 60000)} min
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Goal: 15-30 minutes per day</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-lg mb-4 dark:text-white">Current Session</h2>
          {currentSession ? (
            <div ref={currentTimerRef} className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                  Started at {safeFormat(currentSession?.startTime, "HH:mm")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current · set duration below</p>
                <DurationPicker
                  valueMs={Math.max(0, elapsedTime - (currentSession?.excludedMs ?? 0))}
                  maxMs={Math.max(elapsedTime, 60 * 1000)}
                  showSeconds
                  onChange={(ms) => {
                    if (!currentSession) return;
                    grace.markAction();
                    const updated = setActiveTummyDisplayedDuration(currentSession, ms);
                    setCurrentSession(updated);
                    try { localStorage.setItem("currentTummyTime", JSON.stringify(updated)); } catch { /* ignore */ }
                    if (session?.access_token) saveData("currentTummyTime", updated, session.access_token);
                  }}
                  className="min-h-[96px] flex-1"
                />
              </div>
              <Button onClick={stopSession} className="w-full" variant="destructive" size="lg">
                <Square className="w-5 h-5 mr-2" />
                Stop Session
              </Button>
            </div>
          ) : (
            <Button onClick={startSession} className="w-full" size="lg">
              <Play className="w-5 h-5 mr-2" />
              Start Tummy Time
            </Button>
          )}
        </div>

        {tummyTimeHistory.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6">
            <h2 className="text-lg mb-4 dark:text-white">Last 7 Days</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="minutes" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg mb-4 dark:text-white">Recent Sessions</h2>
          {tummyTimeHistory.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No tummy time sessions yet</p>
          ) : (
            <div className="space-y-3">
              {[...new Map(tummyTimeHistory.map((t) => [t.id, t])).values()]
                .filter((t) => t.endTime)
                .slice(-10)
                .reverse()
                .map((s) => {
                  const start = s.startTime || parseInt(s.id) || 0;
                  const displayedMs = tummyDisplayedDurationMs(s);
                  return (
                    <div key={s.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2">
                      <p className="text-xs font-mono text-gray-500 dark:text-gray-400">
                        {safeFormat(start, "d MMM")}
                        {"  "}
                        {safeFormat(start, "HH:mm")}
                        {s.endTime && ` → ${safeFormat(s.endTime, "HH:mm")}`}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Duration:</span>
                        <DurationPicker
                          valueMs={displayedMs}
                          maxMs={MAX_DURATION_HISTORY_MS}
                          onChange={(ms) => {
                            grace.markAction();
                            const updated = tummyTimeHistory.map((t) => t.id === s.id ? setTummyHistoryDisplayedDuration(t, ms) : t);
                            setTummyTimeHistory(updated);
                            try { localStorage.setItem("tummyTimeHistory", JSON.stringify(updated)); } catch { /* ignore */ }
                            if (session?.access_token) saveData("tummyTimeHistory", updated, session.access_token);
                          }}
                          className="min-h-[96px] flex-1 max-w-[160px]"
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
            <TummyManualEntry
              onSave={(record) => {
                const updated = [...tummyTimeHistory, record].sort((a, b) => a.startTime - b.startTime);
                setTummyTimeHistory(updated);
                localStorage.setItem("tummyTimeHistory", JSON.stringify(updated));
                if (session?.access_token) saveData("tummyTimeHistory", updated, session.access_token);
              }}
            />
          </div>
        </div>
      </div>

      <Navigation />
    </div>
  );
}
