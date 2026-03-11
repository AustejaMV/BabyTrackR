import { useState, useEffect, useRef } from "react";
import { Navigation } from "../components/Navigation";
import { Button } from "../components/ui/button";
import { TimeAdjustButtons } from "../components/TimeAdjustButtons";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { ArrowLeft, Play, Square } from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { saveData, loadAllDataFromServer, POLL_MS_ACTIVE, POLL_MS_IDLE } from "../utils/dataSync";
import { safeFormat, formatDurationMs } from "../utils/dateUtils";
import { useGracePeriod } from "../hooks/useGracePeriod";
import { endCurrentSleepIfActive } from "../utils/sleepUtils";
import type { TummyTimeRecord } from "../types";

export function TummyTime() {
  const [currentSession, setCurrentSession] = useState<TummyTimeRecord | null>(null);
  const [tummyTimeHistory, setTummyTimeHistory] = useState<TummyTimeRecord[]>([]);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
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

        if (data.currentTummyTime != null) {
          if (grace.isInStopGrace()) return;
          try {
            localStorage.setItem("currentTummyTime", JSON.stringify(data.currentTummyTime));
            setCurrentSession(data.currentTummyTime as TummyTimeRecord);
          } catch { /* ignore */ }
        } else {
          if (grace.isInStartGrace()) return;
          try {
            localStorage.removeItem("currentTummyTime");
            setCurrentSession(null);
          } catch { /* ignore */ }
        }

        if (data.tummyTimeHistory != null) {
          try {
            localStorage.setItem("tummyTimeHistory", JSON.stringify(data.tummyTimeHistory));
            setTummyTimeHistory(data.tummyTimeHistory as TummyTimeRecord[]);
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

  const startSession = () => {
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
    localStorage.setItem("tummyTimeHistory", JSON.stringify(updatedHistory));
    localStorage.removeItem("currentTummyTime");
    setCurrentSession(null);
    setElapsedTime(0);
    if (session?.access_token) {
      saveData("tummyTimeHistory", updatedHistory, session.access_token);
      saveData("currentTummyTime", null, session.access_token);
    }
  };

  const adjustActiveTime = (mins: number) => {
    if (!currentSession) return;
    const updated = { ...currentSession, startTime: currentSession.startTime - mins * 60_000 };
    setCurrentSession(updated);
    setElapsedTime((t) => t + mins * 60_000);
    localStorage.setItem("currentTummyTime", JSON.stringify(updated));
    if (session?.access_token) saveData("currentTummyTime", updated, session.access_token);
  };

  const adjustHistoryTime = (id: string, mins: number) => {
    const updated = tummyTimeHistory.map((t) =>
      t.id === id ? { ...t, startTime: t.startTime - mins * 60_000 } : t,
    );
    setTummyTimeHistory(updated);
    localStorage.setItem("tummyTimeHistory", JSON.stringify(updated));
    if (session?.access_token) saveData("tummyTimeHistory", updated, session.access_token);
  };

  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todaySessions = tummyTimeHistory.filter((t) => t.startTime > todayStart && t.endTime);
  const todayTotal = todaySessions.reduce((acc, s) => acc + (s.endTime! - s.startTime), 0);

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
      .reduce((acc, t) => acc + (t.endTime! - t.startTime) / 60000, 0);
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
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-lg text-center">
                <p className="text-6xl text-blue-600 dark:text-blue-400 mb-2">
                  {formatDurationMs(elapsedTime)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  Started at {safeFormat(currentSession?.startTime, "h:mm a")}
                </p>
                <TimeAdjustButtons onAdjust={adjustActiveTime} className="justify-center" />
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
              {tummyTimeHistory
                .filter((t) => t.endTime)
                .slice(-10)
                .reverse()
                .map((s) => (
                  <div key={s.id} className="flex justify-between items-start p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="dark:text-white">{safeFormat(s?.startTime, "MMM d")}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{safeFormat(s?.startTime, "h:mm a")}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-blue-600 dark:text-blue-400">
                        {s.endTime && formatDurationMs(s.endTime - s.startTime)}
                      </p>
                      <TimeAdjustButtons onAdjust={(min) => adjustHistoryTime(s.id, min)} />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <Navigation />
    </div>
  );
}
