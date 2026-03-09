import { AlertCircle, Baby, Utensils, Droplet, Clock, Pill } from "lucide-react";
import { useEffect, useState } from "react";
import { maybeNotifyForWarning } from "../utils/notifications";

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
  startTime?: number;
  endTime?: number;
  durationMs?: number;
  segments?: { type: string; durationMs: number; amount?: number }[];
}

interface DiaperRecord {
  id: string;
  type: "pee" | "poop" | "both";
  timestamp: number;
}

interface TummyTimeRecord {
  id: string;
  startTime: number;
  endTime?: number;
}

const PAINKILLER_INTERVAL_HOURS = 8;

export function WarningIndicators() {
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    const checkWarnings = () => {
      const newWarnings: string[] = [];

      // Use end time for "last feeding" (timer-based feedings have endTime or timestamp)
      const getLastFeedingEndTime = (f: FeedingRecord) => f.endTime ?? f.timestamp;

      // Check feeding
      const feedingHistory = localStorage.getItem("feedingHistory");
      if (feedingHistory) {
        const feedings: FeedingRecord[] = JSON.parse(feedingHistory);
        if (feedings.length > 0) {
          const lastFeeding = feedings[feedings.length - 1];
          const lastEnd = getLastFeedingEndTime(lastFeeding);
          const hoursSinceFeeding = (Date.now() - lastEnd) / 3600000;
          let feedingInterval = 3;
try {
  const raw = localStorage.getItem("feedingInterval");
  if (raw && raw !== "[]") {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "number" && Number.isFinite(parsed)) feedingInterval = parsed;
    else if (typeof parsed === "string") feedingInterval = parseInt(parsed, 10) || 3;
  }
} catch {
  // keep 3
}

          if (hoursSinceFeeding >= feedingInterval) {
            newWarnings.push("feeding-due");
          } else if (hoursSinceFeeding >= feedingInterval - 0.5) {
            newWarnings.push("feeding-soon");
          }
        }
      }

      // Check sleep position
      const sleepHistory = localStorage.getItem("sleepHistory");
      if (sleepHistory) {
        const sleeps: SleepRecord[] = JSON.parse(sleepHistory);
        if (sleeps.length >= 3) {
          const lastThree = sleeps.slice(-3);
          const allSamePosition = lastThree.every(s => s.position === lastThree[0].position);
          if (allSamePosition && lastThree[0].position !== "Back") {
            newWarnings.push("same-position");
          }
        }
      }

      // Check poops (should have at least 1 in 24 hours for newborns)
      const diaperHistory = localStorage.getItem("diaperHistory");
      if (diaperHistory) {
        const diapers: DiaperRecord[] = JSON.parse(diaperHistory);
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const recentPoops = diapers.filter(
          d => (d.type === "poop" || d.type === "both") && d.timestamp > oneDayAgo
        );
        if (recentPoops.length === 0 && diapers.length > 0) {
          newWarnings.push("no-poop");
        }
      }

      // Check sleep (at least some sleep in last 6 hours)
      if (sleepHistory) {
        const sleeps: SleepRecord[] = JSON.parse(sleepHistory);
        const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
        const recentSleep = sleeps.filter(s => s.startTime > sixHoursAgo);
        if (recentSleep.length === 0 && sleeps.length > 0) {
          newWarnings.push("no-sleep");
        }
      }

      // Check tummy time (should have some each day)
      const tummyTimeHistory = localStorage.getItem("tummyTimeHistory");
      if (tummyTimeHistory) {
        const tummyTimes: TummyTimeRecord[] = JSON.parse(tummyTimeHistory);
        const todayStart = new Date().setHours(0, 0, 0, 0);
        const todayTummyTime = tummyTimes.filter(t => t.startTime > todayStart);
        if (todayTummyTime.length === 0 && tummyTimes.length > 0) {
          newWarnings.push("no-tummy-time");
        }
      }

      // Painkiller: 8h since last dose = safe to take another; show warning so user knows they can take a pill
      const painkillerHistory = localStorage.getItem("painkillerHistory");
      if (painkillerHistory) {
        const doses: { id: string; timestamp: number }[] = JSON.parse(painkillerHistory);
        if (doses.length > 0) {
          const last = doses[doses.length - 1];
          const hoursSince = (Date.now() - last.timestamp) / 3600000;
          if (hoursSince >= PAINKILLER_INTERVAL_HOURS) {
            newWarnings.push("painkiller-due");
          }
        }
      }

      setWarnings(newWarnings);

      // Send at most one notification per warning type per cooldown period
      if (newWarnings.includes("feeding-due")) {
        maybeNotifyForWarning("feeding-due", "Feeding due", "Time for the next feeding.");
      }
      if (newWarnings.includes("feeding-soon")) {
        maybeNotifyForWarning("feeding-soon", "Feeding soon", "Feeding time is coming up soon.");
      }
      if (newWarnings.includes("painkiller-due")) {
        maybeNotifyForWarning("painkiller-due", "Painkiller reminder", "It's been 8+ hours — you can take another dose if needed.");
      }
      if (newWarnings.includes("same-position")) {
        maybeNotifyForWarning("same-position", "Sleep position", "Consider changing baby's sleep position.");
      }
      if (newWarnings.includes("no-poop")) {
        maybeNotifyForWarning("no-poop", "Diaper check", "No poop in 24 hours. Check with your pediatrician if concerned.");
      }
      if (newWarnings.includes("no-sleep")) {
        maybeNotifyForWarning("no-sleep", "Sleep check", "No sleep recorded in the last 6 hours.");
      }
      if (newWarnings.includes("no-tummy-time")) {
        maybeNotifyForWarning("no-tummy-time", "Tummy time", "No tummy time logged today yet.");
      }
    };

    checkWarnings();
    const interval = setInterval(checkWarnings, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  if (warnings.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {warnings.includes("feeding-due") && (
        <div className="flex items-center gap-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 px-3 py-1 rounded-full text-sm">
          <Utensils className="w-4 h-4" />
          <span>Feeding overdue</span>
        </div>
      )}
      {warnings.includes("feeding-soon") && (
        <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 px-3 py-1 rounded-full text-sm">
          <Clock className="w-4 h-4" />
          <span>Feeding soon</span>
        </div>
      )}
      {warnings.includes("same-position") && (
        <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200 px-3 py-1 rounded-full text-sm">
          <Baby className="w-4 h-4" />
          <span>Change sleep position</span>
        </div>
      )}
      {warnings.includes("no-poop") && (
        <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200 px-3 py-1 rounded-full text-sm">
          <Droplet className="w-4 h-4" />
          <span>No poop in 24h</span>
        </div>
      )}
      {warnings.includes("no-sleep") && (
        <div className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 px-3 py-1 rounded-full text-sm">
          <Baby className="w-4 h-4" />
          <span>No sleep in 6h</span>
        </div>
      )}
      {warnings.includes("no-tummy-time") && (
        <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-3 py-1 rounded-full text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>No tummy time today</span>
        </div>
      )}
      {warnings.includes("painkiller-due") && (
        <div className="flex items-center gap-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 px-3 py-1 rounded-full text-sm">
          <Pill className="w-4 h-4" />
          <span>Painkiller: you can take another dose (8h passed)</span>
        </div>
      )}
    </div>
  );
}
