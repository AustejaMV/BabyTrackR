import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Baby } from "../data/babiesStorage";

interface BabySwitcherProps {
  babies: Baby[];
  activeBaby: Baby | null;
  onSwitch: (id: string) => void;
}

export function BabySwitcher({ babies, activeBaby, onSwitch }: BabySwitcherProps) {
  const touchStartX = useRef(0);
  const [animating, setAnimating] = useState(false);

  if (babies.length === 0) return null;
  if (babies.length === 1) {
    return (
      <div className="py-3 text-center" role="region" aria-label="Current baby">
        <h1
          className="text-xl font-serif truncate max-w-[90vw] mx-auto"
          style={{ color: "var(--tx)" }}
        >
          {activeBaby?.name || "Your baby"}
        </h1>
      </div>
    );
  }

  const currentIndex = activeBaby ? babies.findIndex((b) => b.id === activeBaby.id) : 0;
  const idx = currentIndex >= 0 ? currentIndex : 0;
  const go = (delta: number) => {
    if (animating) return;
    const next = (idx + delta + babies.length) % babies.length;
    onSwitch(babies[next].id);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);
  };

  return (
    <div
      className="py-3 flex flex-col items-center select-none"
      role="region"
      aria-label="Switch baby"
    >
      <div className="flex items-center justify-center gap-2 w-full max-w-[280px]">
        <button
          type="button"
          onClick={() => go(-1)}
          className="p-2 rounded-full border flex-shrink-0"
          style={{ borderColor: "var(--bd)", background: "var(--card)" }}
          aria-label="Previous baby"
        >
          <ChevronLeft className="w-5 h-5" style={{ color: "var(--tx)" }} />
        </button>
        <div
          className="flex-1 min-w-0 flex items-center justify-center"
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            if (Math.abs(dx) > 50) go(dx > 0 ? -1 : 1);
          }}
        >
          <h1
            className="text-xl font-serif truncate"
            style={{ color: "var(--tx)" }}
          >
            {activeBaby?.name || "Your baby"}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          className="p-2 rounded-full border flex-shrink-0"
          style={{ borderColor: "var(--bd)", background: "var(--card)" }}
          aria-label="Next baby"
        >
          <ChevronRight className="w-5 h-5" style={{ color: "var(--tx)" }} />
        </button>
      </div>
      <div className="flex gap-1.5 mt-2" aria-hidden="true">
        {babies.map((b, i) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onSwitch(b.id)}
            className="w-2 h-2 rounded-full transition-all duration-200"
            style={{
              background: i === idx ? "var(--pink)" : "var(--bd)",
              opacity: i === idx ? 1 : 0.5,
            }}
            aria-label={`Switch to ${b.name || "baby " + (i + 1)}`}
          />
        ))}
      </div>
    </div>
  );
}
