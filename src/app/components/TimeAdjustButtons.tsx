interface Props {
  onAdjust: (minutes: number) => void;
  className?: string;
}

/**
 * Compact time-adjustment buttons: −5m −1m +1m +5m +10m
 * Negative values move startTime forward (shorten); positive move it back (lengthen).
 */
export function TimeAdjustButtons({ onAdjust, className = "" }: Props) {
  return (
    <div className={`flex gap-1 ${className}`}>
      {[5, 1].map((min) => (
        <button
          key={`-${min}`}
          type="button"
          onClick={() => onAdjust(-min)}
          className="text-xs px-2 py-0.5 rounded border border-red-200 dark:border-red-900 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 active:scale-95 transition-all font-mono"
        >
          −{min}m
        </button>
      ))}
      {[1, 5, 10].map((min) => (
        <button
          key={`+${min}`}
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
