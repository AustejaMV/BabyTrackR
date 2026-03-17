import React from "react";
import { APP_VERSION } from "../version";

const navPaths = [
  { path: "/", label: "Home" },
  { path: "/journey", label: "Journey" },
  { path: "/village", label: "Village" },
  { path: "/more", label: "More" },
] as const;

export function Navigation() {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";

  return (
    <>
      <span className="fixed bottom-[4.5rem] right-2 text-[10px] select-none z-40" style={{ color: "var(--mu)" }}>
        v{APP_VERSION}
      </span>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto flex justify-around items-center safe-area-pb"
        style={{
          background: "var(--bg)",
          borderTop: "1.5px solid var(--bd)",
          padding: "12px 0 14px",
        }}
      >
        {navPaths.map((item) => {
          const isActive =
            pathname === item.path ||
            (item.path === "/" && pathname === "/") ||
            (item.path === "/village" && pathname.startsWith("/village"));
          return (
            <a
              key={item.path}
              href={item.path}
              className="flex flex-col items-center gap-1 flex-1 font-sans transition-colors cursor-pointer min-h-[52px] justify-center py-1"
              style={{
                color: isActive ? "var(--pink)" : "var(--mu)",
                fontSize: "12px",
                fontFamily: "system-ui, sans-serif",
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {item.path === "/" && (
                <svg viewBox="0 0 20 20" fill="none" className="w-6 h-6 flex-shrink-0" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round">
                  <path d="M3 9.5L10 3l7 6.5V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
                </svg>
              )}
              {item.path === "/journey" && (
                <svg viewBox="0 0 20 20" fill="none" className="w-6 h-6 flex-shrink-0" stroke="currentColor" strokeWidth={1.5}>
                  <circle cx="4" cy="10" r="2" />
                  <circle cx="10" cy="10" r="2" />
                  <circle cx="16" cy="10" r="2" />
                  <path d="M6 10h2M12 10h2" />
                </svg>
              )}
              {item.path === "/village" && (
                <svg viewBox="0 0 20 20" fill="none" className="w-6 h-6 flex-shrink-0" stroke="currentColor" strokeWidth={1.5}>
                  <circle cx="5" cy="8" r="2" />
                  <circle cx="10" cy="6" r="2" />
                  <circle cx="15" cy="8" r="2" />
                  <path d="M7 9v2M10 8v3M13 9v2" strokeLinecap="round" />
                </svg>
              )}
              {item.path === "/more" && (
                <svg viewBox="0 0 20 20" fill="none" className="w-6 h-6 flex-shrink-0">
                  <circle cx="5" cy="10" r="1.5" fill="currentColor" />
                  <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                  <circle cx="15" cy="10" r="1.5" fill="currentColor" />
                </svg>
              )}
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
    </>
  );
}
