import { useState, useEffect, useRef } from "react";
import { Navigation } from "../components/Navigation";
import { Button } from "../components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { saveData, loadAllDataFromServer } from "../utils/dataSync";
import { safeFormat } from "../utils/dateUtils";

const SLEEP_POLL_MS = 4 * 1000;

interface SleepRecord {
  id: string;
  position: string;
  startTime: number;
  endTime?: number;
}

const POSITIONS = ["Back", "Left Side", "Right Side"];

export function SleepTracking() {
  const [currentSleep, setCurrentSleep] = useState<SleepRecord | null>(null);
  const [sleepHistory, setSleepHistory] = useState<SleepRecord[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<string>("Back");
  const [, setTick] = useState(0);
  const { session, familyId } = useAuth();
  // After a local start/stop, skip one poll cycle so the server has time to receive our change
  // before we apply server state (prevents race where poll fires before save completes).
  const wasLocalActionRef = useRef(false);

  // Tick every second while a sleep session is active so the duration updates live
  useEffect(() => {
    if (!currentSleep) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [currentSleep]);

  useEffect(() => {
    if (!session?.access_token || !familyId) return;
    const refetch = () => {
      loadAllDataFromServer(session.access_token).then(({ ok, data }) => {
        if (!ok || !data) return;
        if (document.visibilityState !== "visible") return;
        // Skip one cycle after a local action so the server has time to receive it
        if (wasLocalActionRef.current) {
          wasLocalActionRef.current = false;
          return;
        }
        if (data.currentSleep != null) {
          try {
            const s = data.currentSleep as SleepRecord;
            if (s?.position != null) {
              localStorage.setItem("currentSleep", JSON.stringify(s));
              setCurrentSleep(s);
            }
          } catch {
            // ignore
          }
        } else {
          try {
            localStorage.removeItem("currentSleep");
            setCurrentSleep(null);
          } catch {
            // ignore
          }
        }
        if (data.sleepHistory != null) {
          try {
            localStorage.setItem("sleepHistory", JSON.stringify(data.sleepHistory));
            setSleepHistory(data.sleepHistory as SleepRecord[]);
          } catch {
            // ignore
          }
        }
      });
    };
    refetch();
    const id = setInterval(refetch, SLEEP_POLL_MS);
    return () => clearInterval(id);
  }, [session?.access_token, familyId]);

  useEffect(() => {
    const currentData = localStorage.getItem("currentSleep");
    if (currentData) {
      try {
        const saved = JSON.parse(currentData);
        if (saved && typeof saved.position === "string") {
          setCurrentSleep(saved);
          setSelectedPosition(saved.position);
        }
      } catch {
        // ignore
      }
    }
    const historyData = localStorage.getItem("sleepHistory");
    if (historyData) {
      try {
        setSleepHistory(JSON.parse(historyData));
      } catch {
        // ignore
      }
    }
  }, []);

  const startTracking = () => {
    const newSleep: SleepRecord = {
      id: Date.now().toString(),
      position: selectedPosition,
      startTime: Date.now(),
    };
    wasLocalActionRef.current = true;
    setCurrentSleep(newSleep);
    localStorage.setItem("currentSleep", JSON.stringify(newSleep));
    if (session?.access_token) {
      saveData("currentSleep", newSleep, session.access_token);
    }
  };

  const stopTracking = () => {
    if (!currentSleep) return;

    const completedSleep = { ...currentSleep, endTime: Date.now() };
    const updatedHistory = [...sleepHistory, completedSleep];
    wasLocalActionRef.current = true;
    setSleepHistory(updatedHistory);
    localStorage.setItem("sleepHistory", JSON.stringify(updatedHistory));
    localStorage.removeItem("currentSleep");
    setCurrentSleep(null);

    if (session?.access_token) {
      saveData("sleepHistory", updatedHistory, session.access_token);
      saveData("currentSleep", null, session.access_token);
    }
  };

  const getDuration = (start: number, end?: number) => {
    const duration = (end ?? Date.now()) - start;
    const totalSeconds = Math.floor(duration / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (end != null) {
      // Completed session — no seconds needed
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    }
    // Ongoing — show seconds
    if (hours > 0) return `${hours}h ${minutes}m ${seconds.toString().padStart(2, "0")}s`;
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  };

  // Prepare chart data - count by position
  const chartData = POSITIONS.map((position) => ({
    position,
    count: sleepHistory.filter((s) => s.position === position).length,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 pb-20">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl dark:text-white">Sleep Position Tracking</h1>
        </div>

        {/* Current Position Tracker */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg mb-4 dark:text-white">Current Position</h2>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            {POSITIONS.map((position) => (
              <button
                key={position}
                onClick={() => !currentSleep && setSelectedPosition(position)}
                disabled={currentSleep !== null}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedPosition === position
                    ? "border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/40 dark:text-white"
                    : "border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                } ${currentSleep ? "opacity-50 cursor-not-allowed" : "hover:border-blue-400 dark:hover:border-blue-500"}`}
              >
                {position}
              </button>
            ))}
          </div>

          {currentSleep ? (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Tracking</p>
                <p className="text-2xl text-blue-600 dark:text-blue-400">{currentSleep?.position ?? "Sleep"}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Duration: {getDuration(currentSleep?.startTime ?? 0)}
                </p>
              </div>
              <Button onClick={stopTracking} className="w-full" variant="destructive">
                Stop Tracking
              </Button>
            </div>
          ) : (
            <Button onClick={startTracking} className="w-full">
              Start Tracking
            </Button>
          )}
        </div>

        {/* Chart */}
        {sleepHistory.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6 border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg mb-4 dark:text-white">Position History</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="position" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent History */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg mb-4 dark:text-white">Recent Sessions</h2>
          {sleepHistory.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No sleep sessions recorded yet</p>
          ) : (
            <div className="space-y-3">
              {sleepHistory.slice(-10).reverse().map((sleep, i) => (
                <div key={sleep?.id ?? `sleep-${i}`} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="dark:text-white">{sleep?.position ?? "—"}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {safeFormat(sleep?.startTime, "MMM d, h:mm a")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-600 dark:text-blue-400">
                      {sleep.endTime && getDuration(sleep.startTime, sleep.endTime)}
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