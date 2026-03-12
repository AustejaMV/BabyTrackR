import { AlertCircle, Baby, Utensils, Droplet, Clock, Pill } from "lucide-react";
import { useEffect, useState } from "react";
import { maybeNotifyForWarning } from "../utils/notifications";
import { computeWarnings, readStoredArray, readFeedingInterval } from "../utils/warningUtils";
import type { WarningKey } from "../utils/warningUtils";
import type { FeedingRecord, SleepRecord, DiaperRecord, TummyTimeRecord } from "../types";

export function WarningIndicators() {
  const [warnings, setWarnings] = useState<WarningKey[]>([]);

  useEffect(() => {
    const checkWarnings = () => {
      // Each readStoredArray call returns [] on corrupt/missing data — never throws
      const activeWarnings = computeWarnings({
        feedingHistory:    readStoredArray<FeedingRecord>('feedingHistory'),
        sleepHistory:      readStoredArray<SleepRecord>('sleepHistory'),
        diaperHistory:     readStoredArray<DiaperRecord>('diaperHistory'),
        tummyTimeHistory:  readStoredArray<TummyTimeRecord>('tummyTimeHistory'),
        painkillerHistory: readStoredArray('painkillerHistory'),
        feedingIntervalHours: readFeedingInterval(),
      });

      setWarnings(activeWarnings);

      // Throttled notifications (4 h cooldown per key — enforced in maybeNotifyForWarning)
      if (activeWarnings.includes('feeding-due'))
        maybeNotifyForWarning('feeding-due', 'Feeding due', 'Time for the next feeding.');
      if (activeWarnings.includes('feeding-soon'))
        maybeNotifyForWarning('feeding-soon', 'Feeding soon', 'Feeding time is coming up soon.');
      if (activeWarnings.includes('painkiller-due'))
        maybeNotifyForWarning('painkiller-due', 'Painkiller reminder', "It's been 8+ hours — you can take another dose if needed.");
      if (activeWarnings.includes('same-position'))
        maybeNotifyForWarning('same-position', 'Sleep position', "Consider changing baby's sleep position.");
      if (activeWarnings.includes('no-poop'))
        maybeNotifyForWarning('no-poop', 'Diaper check', 'No poop in 24 hours. Check with your pediatrician if concerned.');
      if (activeWarnings.includes('no-sleep'))
        maybeNotifyForWarning('no-sleep', 'Sleep check', 'No sleep recorded in the last 6 hours.');
      if (activeWarnings.includes('no-tummy-time'))
        maybeNotifyForWarning('no-tummy-time', 'Tummy time', 'No tummy time logged today yet.');
    };

    checkWarnings();
    const interval = setInterval(checkWarnings, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (warnings.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {warnings.includes('feeding-due') && (
        <div className="flex items-center gap-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 px-3 py-1 rounded-full text-sm">
          <Utensils className="w-4 h-4" />
          <span>Feeding overdue</span>
        </div>
      )}
      {warnings.includes('feeding-soon') && (
        <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 px-3 py-1 rounded-full text-sm">
          <Clock className="w-4 h-4" />
          <span>Feeding soon</span>
        </div>
      )}
      {warnings.includes('same-position') && (
        <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200 px-3 py-1 rounded-full text-sm">
          <Baby className="w-4 h-4" />
          <span>Change sleep position</span>
        </div>
      )}
      {warnings.includes('no-poop') && (
        <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200 px-3 py-1 rounded-full text-sm">
          <Droplet className="w-4 h-4" />
          <span>No poop in 24h</span>
        </div>
      )}
      {warnings.includes('no-sleep') && (
        <div className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 px-3 py-1 rounded-full text-sm">
          <Baby className="w-4 h-4" />
          <span>No sleep in 6h</span>
        </div>
      )}
      {warnings.includes('no-tummy-time') && (
        <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-3 py-1 rounded-full text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>No tummy time today</span>
        </div>
      )}
      {warnings.includes('painkiller-due') && (
        <div className="flex items-center gap-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 px-3 py-1 rounded-full text-sm">
          <Pill className="w-4 h-4" />
          <span>Painkiller: you can take another dose (8h passed)</span>
        </div>
      )}
    </div>
  );
}
