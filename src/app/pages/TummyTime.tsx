import { useState, useEffect, useRef } from "react";
import { Navigation } from "../components/Navigation";
import { Button } from "../components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { ArrowLeft, Play, Square } from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { saveData, loadAllDataFromServer } from "../utils/dataSync";
import { safeFormat } from "../utils/dateUtils";
import { endCurrentSleepIfActive } from "../utils/sleepUtils";

const TUMMY_POLL_MS = 4 * 1000;

interface TummyTimeRecord {
  id: string;
  startTime: number;
  endTime?: number;
}

export function TummyTime() {
  const [currentSession, setCurrentSession] = useState<TummyTimeRecord | null>(null);
  const [tummyTimeHistory, setTummyTimeHistory] = useState<TummyTimeRecord[]>([]);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const { session, familyId } = useAuth();
  const currentSessionRef = useRef<TummyTimeRecord | null>(null);
  currentSessionRef.current = currentSession;
  // true only when THIS device started the session (not when received from server)
  const isLocallyTrackingRef = useRef(false);

  useEffect(() => {
    if (!session?.access_token || !familyId) return;
    const refetch = () => {
      loadAllDataFromServer(session.access_token).then(({ ok, data }) => {
        if (!ok || !data) return;
        if (document.visibilityState !== "visible") return;
        if (isLocallyTrackingRef.current) return;
        if (data.currentTummyTime != null) {
          try {
            localStorage.setItem("currentTummyTime", JSON.stringify(data.currentTummyTime));
            localStorage.removeItem("tummyStartedLocally"); // server data, not ours
            setCurrentSession(data.currentTummyTime as TummyTimeRecord);
          } catch {
            // ignore
          }
        } else {
          try {
            localStorage.removeItem("currentTummyTime");
            localStorage.removeItem("tummyStartedLocally");
            setCurrentSession(null);
          } catch {
            // ignore
          }
        }
        if (data.tummyTimeHistory != null) {
          try {
            localStorage.setItem("tummyTimeHistory", JSON.stringify(data.tummyTimeHistory));
            setTummyTimeHistory(data.tummyTimeHistory as TummyTimeRecord[]);
          } catch {
            // ignore
          }
        }
      });
    };
    refetch();
    const id = setInterval(refetch, TUMMY_POLL_MS);
    return () => clearInterval(id);
  }, [session?.access_token, familyId]);

  useEffect(() => {
    // Load current session — only reclaim local ownership if THIS device started it
    const currentData = localStorage.getItem("currentTummyTime");
    if (currentData) {
      if (localStorage.getItem("tummyStartedLocally") === "1") {
        isLocallyTrackingRef.current = true;
      }
      setCurrentSession(JSON.parse(currentData));
    }

    // Load history
    const historyData = localStorage.getItem("tummyTimeHistory");
    if (historyData) {
      setTummyTimeHistory(JSON.parse(historyData));
    }
  }, []);

  // Update elapsed time every second when session is active
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
    const newSession: TummyTimeRecord = {
      id: Date.now().toString(),
      startTime: Date.now(),
    };
    isLocallyTrackingRef.current = true;
    setCurrentSession(newSession);
    localStorage.setItem("currentTummyTime", JSON.stringify(newSession));
    localStorage.setItem("tummyStartedLocally", "1");
    if (session?.access_token) {
      saveData("currentTummyTime", newSession, session.access_token);
    }
  };

  const stopSession = () => {
    if (!currentSession) return;

    const completedSession = {
      ...currentSession,
      endTime: Date.now(),
    };

    const updatedHistory = [...tummyTimeHistory, completedSession];
    isLocallyTrackingRef.current = false;
    setTummyTimeHistory(updatedHistory);
    localStorage.setItem("tummyTimeHistory", JSON.stringify(updatedHistory));
    localStorage.removeItem("currentTummyTime");
    localStorage.removeItem("tummyStartedLocally");
    setCurrentSession(null);
    setElapsedTime(0);
    if (session?.access_token) {
      saveData("tummyTimeHistory", updatedHistory, session.access_token);
      saveData("currentTummyTime", null, session.access_token);
    }
  };

  const getDuration = (start: number, end?: number) => {
    const duration = (end || Date.now()) - start;
    const totalSeconds = Math.floor(duration / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Get today's total tummy time
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todaySessions = tummyTimeHistory.filter(t => t.startTime > todayStart && t.endTime);
  const todayTotal = todaySessions.reduce((acc, session) => {
    return acc + (session.endTime! - session.startTime);
  }, 0);

  // Prepare chart data - last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const chartData = last7Days.map((date) => {
    const dayStart = date.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const daySessions = tummyTimeHistory.filter(
      t => t.startTime >= dayStart && t.startTime < dayEnd && t.endTime
    );
    const totalMinutes = daySessions.reduce((acc, session) => {
      return acc + (session.endTime! - session.startTime) / 60000;
    }, 0);

    return {
      date: format(date, "EEE"),
      minutes: Math.round(totalMinutes),
    };
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

        {/* Daily Goal */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-lg mb-2 dark:text-white">Today's Total</h2>
          <p className="text-4xl text-blue-600 dark:text-blue-400 mb-1">
            {Math.floor(todayTotal / 60000)} min
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Goal: 15-30 minutes per day
          </p>
        </div>

        {/* Active Session */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-lg mb-4 dark:text-white">Current Session</h2>

          {currentSession ? (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-lg text-center">
                <p className="text-6xl text-blue-600 dark:text-blue-400 mb-2">
                  {formatDuration(elapsedTime)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Started at {safeFormat(currentSession?.startTime, "h:mm a")}
                </p>
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

        {/* Chart */}
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

        {/* Recent History */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg mb-4 dark:text-white">Recent Sessions</h2>
          {tummyTimeHistory.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              No tummy time sessions yet
            </p>
          ) : (
            <div className="space-y-3">
              {tummyTimeHistory
                .filter(t => t.endTime)
                .slice(-10)
                .reverse()
                .map((session) => (
                  <div
                    key={session.id}
                    className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <p className="dark:text-white">
                        {safeFormat(session?.startTime, "MMM d")}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {safeFormat(session?.startTime, "h:mm a")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-600 dark:text-blue-400">
                        {session.endTime && getDuration(session.startTime, session.endTime)}
                      </p>
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
