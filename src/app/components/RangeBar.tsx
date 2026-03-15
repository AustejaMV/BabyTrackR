import { useState } from "react";

/**
 * Range bar matching the example: label, value (pink or custom colour), track with fill segment and dot.
 */
interface RangeBarProps {
  label: string;
  value: string;
  valueColour?: string;
  /** When false, value is only shown above the dot (not in header). Default true. */
  showValueInHeader?: boolean;
  /** 0–100, start of the typical range fill */
  rangeStart: number;
  /** 0–100, width of the typical range fill */
  rangeWidth: number;
  /** 0–100, position of the baby marker */
  babyValue: number;
  barColour: string;
  captionLeft: string;
  captionRight: string;
}

export function RangeBar({
  label,
  value,
  valueColour,
  showValueInHeader = true,
  rangeStart,
  rangeWidth,
  babyValue,
  barColour,
  captionLeft,
  captionRight,
}: RangeBarProps) {
  const [valueTooltipVisible, setValueTooltipVisible] = useState(false);
  const valColor = valueColour ?? "var(--pink)";
  return (
    <div className="mb-3.5 last:mb-0">
      <div className="flex justify-between mb-1.5">
        <span className="text-[11px]" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
          {label}
        </span>
        {showValueInHeader && (
          <span className="text-[11px]" style={{ color: valColor, fontFamily: "system-ui, sans-serif" }}>
            {value}
          </span>
        )}
      </div>
      <div
        className="h-[11px] rounded-md relative cursor-pointer touch-manipulation"
        style={{ background: "var(--rng-track)" }}
        onMouseEnter={() => setValueTooltipVisible(true)}
        onMouseLeave={() => setValueTooltipVisible(false)}
        onTouchEnd={(e) => { e.preventDefault(); setValueTooltipVisible((v) => !v); }}
        role="button"
        tabIndex={0}
        aria-label={`${label}: ${value}`}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setValueTooltipVisible((v) => !v); } }}
      >
        <div
          className="absolute h-[11px] rounded-md"
          style={{
            left: `${rangeStart}%`,
            width: `${rangeWidth}%`,
            background: barColour,
          }}
        />
        <div
          className="absolute top-[-3px] flex flex-col items-center pointer-events-none"
          style={{ left: `calc(${babyValue}% - 8px)` }}
        >
          {valueTooltipVisible && (
            <span
              className="absolute bottom-full mb-0.5 whitespace-nowrap text-[9px] font-medium px-1.5 py-0.5 rounded"
              style={{ color: valColor, background: "var(--card)", border: "1px solid var(--bd)", fontFamily: "system-ui, sans-serif" }}
            >
              {value}
            </span>
          )}
          <div
            className="w-[17px] h-[17px] rounded-full border-[2.5px] box-shadow-sm"
            style={{
              background: valColor,
              borderColor: "var(--card)",
            }}
          />
        </div>
      </div>
      <div
        className="flex justify-between mt-1.5 text-[8px] italic"
        style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}
      >
        <span>{captionLeft}</span>
        <span>{captionRight}</span>
      </div>
    </div>
  );
}
