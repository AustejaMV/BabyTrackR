import { useState, useEffect } from "react";
import { Navigation } from "../components/Navigation";
import { Button } from "../components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { saveData } from "../utils/dataSync";

interface SleepRecord {
  id: string;
  position: string;
  startTime: number;
  endTime?: number;
}

const POSITIONS = ["Back", "Left Side", "Right Side", "Tummy"];

export function SleepTracking() {
  const [currentSleep, setCurrentSleep] = useState<SleepRecord | null>(null);
  const [sleepHistory, setSleepHistory] = useState<SleepRecord[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<string>("Back");
  const { session } = useAuth();

  useEffect(() => {
    // Load current sleep session
    const currentData = localStorage.getItem("currentSleep");
    if (currentData) {
      setCurrentSleep(JSON.parse(currentData));
      const saved = JSON.parse(currentData);
      setSelectedPosition(saved.position);
    }

    // Load sleep history
    const historyData = localStorage.getItem("sleepHistory");
    if (historyData) {
      setSleepHistory(JSON.parse(historyData));
    }
  }, []);

  const startTracking = () => {
    const newSleep: SleepRecord = {
      id: Date.now().toString(),
      position: selectedPosition,
      startTime: Date.now(),
    };
    setCurrentSleep(newSleep);
    localStorage.setItem("currentSleep", JSON.stringify(newSleep));
  };

  const stopTracking = () => {
    if (!currentSleep) return;

    const completedSleep = {
      ...currentSleep,
      endTime: Date.now(),
    };

    const updatedHistory = [...sleepHistory, completedSleep];
    setSleepHistory(updatedHistory);
    localStorage.setItem("sleepHistory", JSON.stringify(updatedHistory));
    localStorage.removeItem("currentSleep");
    setCurrentSleep(null);

    // Save data to cloud
    if (session?.access_token) {
      saveData("sleepHistory", updatedHistory, session.access_token);
    }
  };

  const getDuration = (start: number, end?: number) => {
    const duration = (end || Date.now()) - start;
    const minutes = Math.floor(duration / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  // Prepare chart data - count by position
  const chartData = POSITIONS.map((position) => ({
    position,
    count: sleepHistory.filter((s) => s.position === position).length,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl">Sleep Position Tracking</h1>
        </div>

        {/* Current Position Tracker */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-lg mb-4">Current Position</h2>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            {POSITIONS.map((position) => (
              <button
                key={position}
                onClick={() => !currentSleep && setSelectedPosition(position)}
                disabled={currentSleep !== null}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedPosition === position
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 bg-white"
                } ${currentSleep ? "opacity-50 cursor-not-allowed" : "hover:border-blue-400"}`}
              >
                {position}
              </button>
            ))}
          </div>

          {currentSleep ? (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Tracking</p>
                <p className="text-2xl text-blue-600">{currentSleep.position}</p>
                <p className="text-sm text-gray-500">
                  Duration: {getDuration(currentSleep.startTime)}
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
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <h2 className="text-lg mb-4">Position History</h2>
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
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg mb-4">Recent Sessions</h2>
          {sleepHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No sleep sessions recorded yet</p>
          ) : (
            <div className="space-y-3">
              {sleepHistory.slice(-10).reverse().map((sleep) => (
                <div key={sleep.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p>{sleep.position}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(sleep.startTime), "MMM d, h:mm a")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-600">
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