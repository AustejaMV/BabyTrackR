import { useThemeStore } from "../../store/themeStore";

export function ThemeToggle() {
  const isDark = useThemeStore((s) => s.isDark);
  const toggle = useThemeStore((s) => s.toggle);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        className="relative h-9 w-[56px] flex-shrink-0 cursor-pointer rounded-[14px] border-[1.5px] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--pink)] focus:ring-offset-2 focus:ring-offset-[var(--bg)] min-h-[44px]"
        style={{
          background: isDark ? "#3d2430" : "var(--pe)",
          borderColor: isDark ? "#5a3040" : "var(--ro)",
        }}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        <span
          className="absolute top-1 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300"
          style={{
            left: isDark ? "28px" : "4px",
            background: isDark ? "var(--pink)" : "var(--coral)",
          }}
        >
          {isDark ? (
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="text-white">
              <path
                d="M10 7.5A4.5 4.5 0 0 1 5.5 3c0-.5.1-1 .2-1.5A5.5 5.5 0 1 0 11.5 7.3c-.5.1-1 .2-1.5.2z"
                stroke="white"
                strokeWidth="1.3"
              />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="text-white">
              <circle cx="6.5" cy="6.5" r="2.5" stroke="white" strokeWidth="1.3" />
              <path
                d="M6.5 1v1.5M6.5 10.5V12M1 6.5h1.5M10.5 6.5H12M2.6 2.6l1 1M9.4 9.4l1 1M9.4 2.6l-1 1M3.6 9.4l-1 1"
                stroke="white"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
          )}
        </span>
      </button>
      <span
        className="text-[13px] font-normal"
        style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}
      >
        {isDark ? "Dark mode — tap to switch" : "Light mode — tap to switch"}
      </span>
    </div>
  );
}
