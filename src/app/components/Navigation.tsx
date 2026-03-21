import React from "react";
import { hasCustomTrackerReminderDue } from "../utils/customTrackerStorage";
import { useLanguage } from "../contexts/LanguageContext";

const navConfig = [
  { path: "/", labelKey: "common.nav.today" },
  { path: "/journey", labelKey: "common.nav.journey" },
  { path: "/health", labelKey: "common.nav.health" },
  { path: "/village", labelKey: "common.nav.village" },
  { path: "/more", labelKey: "common.nav.me" },
] as const;

export function Navigation() {
  const { t } = useLanguage();
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "/";

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        maxWidth: "32rem",
        margin: "0 auto",
        background: "#fff",
        borderTop: "1px solid var(--bd)",
        display: "flex",
        alignItems: "stretch",
        height: 68,
      }}
    >
      {navConfig.map((item) => {
        const label = t(item.labelKey);
        const isActive =
          item.path === "/"
            ? pathname === "/" || pathname === ""
            : pathname.startsWith(item.path);

        const color = isActive ? "#d4604a" : "var(--mu)";

        return (
          <a
            key={item.path}
            href={item.path}
            aria-label={`Navigate to ${label} tab`}
            aria-current={isActive ? "page" : undefined}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              cursor: "pointer",
              border: "none",
              background: "none",
              padding: 0,
              textDecoration: "none",
              transition: "opacity .15s",
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {item.path === "/" && (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle
                    cx="10"
                    cy="10"
                    r="8"
                    stroke={color}
                    strokeWidth="1.5"
                  />
                  <path
                    d="M10 6v4l3 2"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              {item.path === "/journey" && (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M4 4h12v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                    stroke={color}
                    strokeWidth="1.5"
                  />
                  <path
                    d="M7 8h6M7 11h4"
                    stroke={color}
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              {item.path === "/health" && (
                <span style={{ position: "relative", display: "inline-flex" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 6.7l-1.1-1.1a5.5 5.5 0 00-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 000-7.8z" />
                    <path d="M2 12h2l2-3 2 6 2-4 2 1" />
                  </svg>
                  {hasCustomTrackerReminderDue() && (
                    <span
                      style={{
                        position: "absolute",
                        top: -2,
                        right: -2,
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#d4604a",
                        border: "1.5px solid #fff",
                      }}
                      aria-hidden
                    />
                  )}
                </span>
              )}
              {item.path === "/village" && (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="7" cy="8" r="3" stroke={color} strokeWidth="1.5" />
                  <circle
                    cx="14"
                    cy="6"
                    r="2.5"
                    stroke={color}
                    strokeWidth="1.3"
                  />
                  <path
                    d="M2 17c0-2.8 2.2-5 5-5s5 2.2 5 5"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M14 10c1.7 0 3 1.3 3 3"
                    stroke={color}
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              )}
              {item.path === "/more" && (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 3a4 4 0 100 8 4 4 0 000-8z"
                    stroke={color}
                    strokeWidth="1.5"
                  />
                  <path
                    d="M3 18c0-3.9 3.1-7 7-7s7 3.1 7 7"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              )}
            </div>
            <span
              style={{
                fontSize: 9,
                color,
                fontWeight: 500,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {label}
            </span>
          </a>
        );
      })}
    </nav>
  );
}
