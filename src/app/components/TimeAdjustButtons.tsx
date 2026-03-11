interface Props {
  onAdjust: (minutes: number) => void;
  className?: string;
}

const STEPS = [1, 5, 10] as const;

/**
 * Compact "+1m / +5m / +10m" row.
 * Pressing a button calls `onAdjust(minutes)`.
 * The caller is responsible for backdating startTime by that many minutes.
 */
export function TimeAdjustButtons({ onAdjust, className = "" }: Props) {
  return (
    <div className={`flex gap-1 ${className}`}>
      {STEPS.map((min) => (
        <button
          key={min}
          type="button"
          onClick={() => onAdjust(min)}
          className="text-xs px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 active:scale-95 transition-all font-mono"
        >
          +{min}m
        </button>
      ))}
    </div>
  );
}
