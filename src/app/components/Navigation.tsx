import React from "react";
import { Link, useLocation } from "react-router";
import { VoiceControl } from "./VoiceControl";
import { APP_VERSION } from "../version";

const navItems: { path: string; label: string }[] = [
  { path: "/", label: "Home" },
  { path: "/journey", label: "Journey" },
  { path: "/more", label: "More" },
];

export function Navigation() {
  const location = useLocation();

  return (
    <>
      <VoiceControl />
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
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path === "/" && location.pathname === "/");
          return (
            <Link
              key={item.path}
              to={item.path}
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
              {item.path === "/more" && (
                <svg viewBox="0 0 20 20" fill="none" className="w-6 h-6 flex-shrink-0">
                  <circle cx="5" cy="10" r="1.5" fill="currentColor" />
                  <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                  <circle cx="15" cy="10" r="1.5" fill="currentColor" />
                </svg>
              )}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
