import { useState, useEffect } from "react";
import { Navigation } from "../components/Navigation";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, addHours } from "date-fns";
import { ArrowLeft, Clock } from "lucide-react";
import { Link } from "react-router";

interface FeedingRecord {
  id: string;
  type: string;
  timestamp: number;
  amount?: number;
}

const FEEDING_TYPES = ["Breast (Left)", "Breast (Right)", "Bottle", "Solid Food"];

export function FeedingTracking() {
  const [feedingHistory, setFeedingHistory] = useState<FeedingRecord[]>([]);
  const [selectedType, setSelectedType] = useState<string>("Breast (Left)");
  const [amount, setAmount] = useState<string>("");
  const [feedingInterval, setFeedingInterval] = useState<string>("3"); // hours

  useEffect(() => {
    // Load feeding history
    const historyData = localStorage.getItem("feedingHistory");
    if (historyData) {
      setFeedingHistory(JSON.parse(historyData));
    }

    // Load feeding interval preference
    const intervalData = localStorage.getItem("feedingInterval");
    if (intervalData) {
      setFeedingInterval(intervalData);
    }
  }, []);

  const addFeeding = () => {
    const newFeeding: FeedingRecord = {
      id: Date.now().toString(),
      type: selectedType,
      timestamp: Date.now(),
      amount: amount ? parseFloat(amount) : undefined,
    };

    const updatedHistory = [...feedingHistory, newFeeding];
    setFeedingHistory(updatedHistory);
    localStorage.setItem("feedingHistory", JSON.stringify(updatedHistory));
    setAmount("");
  };

  const getNextFeedingTime = () => {
    if (feedingHistory.length === 0) return null;
    const lastFeeding = feedingHistory[feedingHistory.length - 1];
    const interval = parseInt(feedingInterval) || 3;
    return addHours(new Date(lastFeeding.timestamp), interval);
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

  // Prepare chart data - last 7 days
  const chartData = feedingHistory
    .slice(-20)
    .map((feeding, index) => ({
      index: index + 1,
      time: format(new Date(feeding.timestamp), "HH:mm"),
      amount: feeding.amount || 0,
    }));

  const nextFeedingTime = getNextFeedingTime();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl">Feeding Tracking</h1>
        </div>

        {/* Next Feeding Reminder */}
        {feedingHistory.length > 0 && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl p-6 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5" />
              <h2 className="text-lg">Next Feeding</h2>
            </div>
            <p className="text-3xl mb-1">
              {nextFeedingTime && format(nextFeedingTime, "h:mm a")}
            </p>
            <p className="text-green-100">in {getTimeUntilNext()}</p>
            <div className="mt-3 flex items-center gap-2">
              <label className="text-sm">Feeding every</label>
              <Input
                type="number"
                value={feedingInterval}
                onChange={(e) => setFeedingInterval(e.target.value)}
                onBlur={(e) => {
                  const val = parseInt(e.target.value);
                  if (!val || val < 1) {
                    setFeedingInterval("1");
                    localStorage.setItem("feedingInterval", "1");
                  } else {
                    localStorage.setItem("feedingInterval", e.target.value);
                  }
                }}
                className="w-16 bg-white text-black"
                min="1"
                max="12"
              />
              <span className="text-sm">hours</span>
            </div>
          </div>
        )}

        {/* Add Feeding */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-lg mb-4">Log Feeding</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 mb-2 block">Feeding Type</label>
              <div className="grid grid-cols-2 gap-2">
                {FEEDING_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`p-3 rounded-lg border-2 transition-all text-sm ${
                      selectedType === type
                        ? "border-green-600 bg-green-50"
                        : "border-gray-200 bg-white hover:border-green-400"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                Amount (oz) - Optional
              </label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={(e) => {
                  if (e.target.value === "") {
                    setAmount("1");
                  }
                }}
                placeholder="Enter amount"
                step="0.5"
              />
            </div>

            <Button onClick={addFeeding} className="w-full">
              Log Feeding
            </Button>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 && chartData.some(d => d.amount > 0) && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <h2 className="text-lg mb-4">Feeding Amounts</h2>
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

        {/* Recent History */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg mb-4">Recent Feedings</h2>
          {feedingHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No feedings recorded yet</p>
          ) : (
            <div className="space-y-3">
              {feedingHistory.slice(-10).reverse().map((feeding) => (
                <div key={feeding.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p>{feeding.type}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(feeding.timestamp), "MMM d, h:mm a")}
                    </p>
                  </div>
                  {feeding.amount && (
                    <div className="text-right">
                      <p className="text-green-600">{feeding.amount} oz</p>
                    </div>
                  )}
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