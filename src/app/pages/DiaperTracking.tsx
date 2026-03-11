import { useState, useEffect } from "react";
import { Navigation } from "../components/Navigation";
import { Button } from "../components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { saveData, loadAllDataFromServer, POLL_MS_IDLE } from "../utils/dataSync";
import { safeFormat } from "../utils/dateUtils";
import type { DiaperRecord } from "../types";

const DIAPER_TYPES: Array<{ value: "pee" | "poop" | "both"; label: string; color: string }> = [
  { value: "pee", label: "💧 Pee", color: "#3b82f6" },
  { value: "poop", label: "💩 Poop", color: "#f59e0b" },
  { value: "both", label: "💧💩 Both", color: "#8b5cf6" },
];

const CHART_COLORS = ["#3b82f6", "#f59e0b"];

export function DiaperTracking() {
  const [diaperHistory, setDiaperHistory] = useState<DiaperRecord[]>([]);
  const { session, familyId } = useAuth();

  useEffect(() => {
    if (!session?.access_token || !familyId) return;
    const refetch = () => {
      loadAllDataFromServer(session.access_token).then(({ ok, data }) => {
        if (!ok || !data) return;
        if (data.diaperHistory != null && Array.isArray(data.diaperHistory)) {
          try {
            localStorage.setItem("diaperHistory", JSON.stringify(data.diaperHistory));
            setDiaperHistory(data.diaperHistory as DiaperRecord[]);
          } catch { /* ignore */ }
        }
      });
    };
    refetch();
    // Diapers have no live timer so idle poll rate is sufficient
    const id = setInterval(refetch, POLL_MS_IDLE);
    return () => clearInterval(id);
  }, [session?.access_token, familyId]);

  useEffect(() => {
    const historyData = localStorage.getItem("diaperHistory");
    if (historyData) {
      try {
        setDiaperHistory(JSON.parse(historyData));
      } catch {
        // ignore
      }
    }
  }, []);

  const addDiaper = (type: "pee" | "poop" | "both") => {
    const newDiaper: DiaperRecord = {
      id: Date.now().toString(),
      type,
      timestamp: Date.now(),
    };

    const updatedHistory = [...diaperHistory, newDiaper];
    setDiaperHistory(updatedHistory);
    localStorage.setItem("diaperHistory", JSON.stringify(updatedHistory));
    if (session?.access_token) {
      saveData("diaperHistory", updatedHistory, session.access_token);
    }
  };

  // Get stats for last 24 hours
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const last24Hours = diaperHistory.filter((d) => d.timestamp > oneDayAgo);
  
  const stats = {
    pee: last24Hours.filter((d) => d.type === "pee" || d.type === "both").length,
    poop: last24Hours.filter((d) => d.type === "poop" || d.type === "both").length,
    total: last24Hours.length,
  };

  // Chart: just Pee and Poop (both counts in each)
  const chartData = [
    { name: "Pee", value: diaperHistory.filter((d) => d.type === "pee" || d.type === "both").length },
    { name: "Poop", value: diaperHistory.filter((d) => d.type === "poop" || d.type === "both").length },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 pb-20">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl dark:text-white">Diaper Tracking</h1>
        </div>

        {/* Stats Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg mb-4 dark:text-white">Last 24 Hours</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl text-blue-600 dark:text-blue-400">{stats.pee}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pee</p>
            </div>
            <div className="text-center">
              <p className="text-3xl text-amber-600 dark:text-amber-400">{stats.poop}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Poop</p>
            </div>
            <div className="text-center">
              <p className="text-3xl text-purple-600 dark:text-purple-400">{stats.total}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
            </div>
          </div>
        </div>

        {/* Quick Add Buttons */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg mb-4 dark:text-white">Log Diaper Change</h2>
          <div className="grid grid-cols-3 gap-3">
            {DIAPER_TYPES.map((type) => (
              <Button
                key={type.value}
                onClick={() => addDiaper(type.value)}
                className="h-20 flex flex-col gap-2"
                style={{ backgroundColor: type.color }}
              >
                <span className="text-2xl">{type.label.split(" ")[0]}</span>
                <span className="text-xs">{type.label.split(" ")[1]}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Chart */}
        {diaperHistory.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6 border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg mb-4 dark:text-white">Distribution</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent History */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg mb-4 dark:text-white">Recent Changes</h2>
          {diaperHistory.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No diaper changes recorded yet</p>
          ) : (
            <div className="space-y-3">
              {diaperHistory.slice(-15).reverse().map((diaper) => {
                const typeInfo = DIAPER_TYPES.find((t) => t.value === diaper.type);
                return (
                  <div key={diaper.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="text-lg dark:text-white">{typeInfo?.label}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {safeFormat(diaper?.timestamp, "MMM d, HH:mm")}
                      </p>
                    </div>
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
