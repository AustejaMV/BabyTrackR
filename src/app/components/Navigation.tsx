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
      <span className="fixed bottom-[4.25rem] right-2 text-[9px] text-gray-400 dark:text-gray-500 select-none z-40">
        v{APP_VERSION}
      </span>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto flex justify-around items-center"
        style={{
          background: "var(--bg)",
          borderTop: "1.5px solid var(--bd)",
          padding: "9px 0 7px",
        }}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path === "/" && location.pathname === "/");
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center gap-0.5 flex-1 font-sans transition-colors cursor-pointer"
              style={{
                color: isActive ? "var(--pink)" : "var(--mu)",
                fontSize: "8px",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {item.path === "/" && (
                <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round">
                  <path d="M3 9.5L10 3l7 6.5V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
                </svg>
              )}
              {item.path === "/journey" && (
                <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.5}>
                  <circle cx="4" cy="10" r="2" />
                  <circle cx="10" cy="10" r="2" />
                  <circle cx="16" cy="10" r="2" />
                  <path d="M6 10h2M12 10h2" />
                </svg>
              )}
              {item.path === "/more" && (
                <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
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
