import { useState, useEffect } from "react";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ResponsiveContainer } from "recharts";
import type { GrowthMeasurement } from "../types";
import { getWhoWeight, getWeightPercentile, type Sex } from "../data/whoGrowth";
import { getAgeInDays } from "../utils/babyUtils";

/** Parse yyyy-MM-dd (date picker) to epoch ms (start of day). */
function parseDatePicker(s: string): number | null {
  const parts = s.trim().split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [y, m, d] = parts;
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? null : date.setHours(0, 0, 0, 0);
}

const STORAGE_KEY = "growthMeasurements";

function loadMeasurements(): GrowthMeasurement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.sort((a, b) => a.date - b.date) : [];
  } catch {
    return [];
  }
}

function saveMeasurements(data: GrowthMeasurement[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

interface GrowthChartSectionProps {
  birthDateMs: number;
  sex?: Sex;
  onSaveToServer?: (data: GrowthMeasurement[]) => void;
}

export function GrowthChartSection({ birthDateMs, sex = "girls", onSaveToServer }: GrowthChartSectionProps) {
  const [measurements, setMeasurements] = useState<GrowthMeasurement[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [newHeight, setNewHeight] = useState("");
  const [newHead, setNewHead] = useState("");

  useEffect(() => {
    setMeasurements(loadMeasurements());
  }, []);

  const whoData = getWhoWeight(sex);
  const whoPoints = whoData.map((p) => ({
    month: p.month,
    p5: p.p5,
    p50: p.p50,
    p95: p.p95,
    weight: null as number | null,
  }));
  const babyPoints = measurements
    .filter((m) => m.weightKg != null)
    .map((m) => ({
      month: getAgeInDays(birthDateMs, m.date) / 30,
      p5: null as number | null,
      p50: null as number | null,
      p95: null as number | null,
      weight: m.weightKg as number,
    }));
  const chartData = [...whoPoints, ...babyPoints].sort((a, b) => a.month - b.month);

  const latestWithWeight = [...measurements].filter((m) => m.weightKg != null).sort((a, b) => b.date - a.date)[0];
  const ageMonthsLatest = latestWithWeight && birthDateMs ? getAgeInDays(birthDateMs, latestWithWeight.date) / 30 : 0;
  const percentile = latestWithWeight?.weightKg != null ? getWeightPercentile(sex, ageMonthsLatest, latestWithWeight.weightKg) : null;

  const handleAdd = () => {
    if (!newDate.trim()) return;
    const dateMs = parseDatePicker(newDate);
    if (dateMs == null) return;
    const record: GrowthMeasurement = {
      id: Date.now().toString(),
      date: dateMs,
      weightKg: newWeight ? parseFloat(newWeight) : undefined,
      heightCm: newHeight ? parseFloat(newHeight) : undefined,
      headCircumferenceCm: newHead ? parseFloat(newHead) : undefined,
    };
    const next = [...measurements, record].sort((a, b) => a.date - b.date);
    setMeasurements(next);
    saveMeasurements(next);
    onSaveToServer?.(next);
    setShowAdd(false);
    setNewDate("");
    setNewWeight("");
    setNewHeight("");
    setNewHead("");
  };

  return (
    <div className="border rounded-2xl p-3 mb-4" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[13px] font-medium" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
          Growth
        </h2>
        <button
          type="button"
          onClick={() => { setShowAdd(true); setNewDate(format(new Date(), "yyyy-MM-dd")); }}
          className="w-8 h-8 rounded-full flex items-center justify-center border text-lg leading-none"
          style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--pink)", fontFamily: "system-ui, sans-serif" }}
        >
          +
        </button>
      </div>
      {measurements.length === 0 && !showAdd && (
        <p className="text-[11px] mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
          No measurements yet. Tap + to add weight, height, or head circumference.
        </p>
      )}
      {percentile != null && (
        <p className="text-[10px] mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
          Your baby is around the <strong style={{ color: "var(--pink)" }}>{Math.round(percentile)}th percentile</strong> for weight.
        </p>
      )}
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" opacity={0.5} />
            <ReferenceArea x1={0} x2={24} y1={0} y2={20} fill="var(--rng-track)" fillOpacity={0.3} />
            <XAxis dataKey="month" tick={{ fontSize: 9 }} stroke="var(--mu)" />
            <YAxis domain={[2, 16]} tick={{ fontSize: 9 }} stroke="var(--mu)" />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--bd)", borderRadius: 8, fontSize: 10 }}
              formatter={(value: number) => [`${value} kg`, "Weight"]}
              labelFormatter={(m) => `Month ${m}`}
            />
            <Line type="monotone" dataKey="p5" stroke="var(--mu)" strokeWidth={1} strokeDasharray="2 2" dot={false} name="5th" />
            <Line type="monotone" dataKey="p50" stroke="var(--mu)" strokeWidth={1} strokeDasharray="2 2" dot={false} name="50th" />
            <Line type="monotone" dataKey="p95" stroke="var(--mu)" strokeWidth={1} strokeDasharray="2 2" dot={false} name="95th" />
            <Line type="monotone" dataKey="weight" stroke="var(--pink)" strokeWidth={2} dot={{ r: 4 }} name="Baby" connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[8px] mt-1" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
        X: age (months). Bands: WHO 5th–95th. Pink: your measurements.
      </p>

      {showAdd && (
        <div className="mt-3 pt-3 border-t border-[var(--bd)] space-y-2">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-full rounded-lg border px-2 py-1.5 text-[11px] min-h-[36px]"
            style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
          />
          <div className="flex gap-2">
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="Weight (kg)"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              className="flex-1 rounded-lg border px-2 py-1.5 text-[11px]"
              style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
            />
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="Height (cm)"
              value={newHeight}
              onChange={(e) => setNewHeight(e.target.value)}
              className="flex-1 rounded-lg border px-2 py-1.5 text-[11px]"
              style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
            />
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="Head (cm)"
              value={newHead}
              onChange={(e) => setNewHead(e.target.value)}
              className="flex-1 rounded-lg border px-2 py-1.5 text-[11px]"
              style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-1.5 rounded-lg border text-[11px]" style={{ borderColor: "var(--bd)", color: "var(--mu)" }}>Cancel</button>
            <button type="button" onClick={handleAdd} className="flex-1 py-1.5 rounded-lg text-[11px] text-white" style={{ background: "var(--pink)" }}>Add</button>
          </div>
        </div>
      )}
    </div>
  );
}
