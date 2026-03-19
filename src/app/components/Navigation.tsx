import React from "react";

const navItems = [
  { path: "/", label: "Today" },
  { path: "/journey", label: "Story" },
  { path: "/village", label: "Village" },
  { path: "/more", label: "Me" },
] as const;

export function Navigation() {
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
      {navItems.map((item) => {
        const isActive =
          item.path === "/"
            ? pathname === "/" || pathname === ""
            : pathname.startsWith(item.path);

        const color = isActive ? "#d4604a" : "var(--mu)";

        return (
          <a
            key={item.path}
            href={item.path}
            aria-label={`Navigate to ${item.label} tab`}
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
              {item.label}
            </span>
          </a>
        );
      })}
    </nav>
  );
}
