import React, { useState, useRef, useEffect } from "react";
import { usePremium } from "../contexts/PremiumContext";
import { IconSun, IconBook, IconVillage, IconHeart } from "./BrandIcons";

const tabIcons: Record<string, (color: string) => React.ReactNode> = {
  "/": (c) => <IconSun size={16} color={c} />,
  "/journey": (c) => <IconBook size={16} color={c} />,
  "/village": (c) => <IconVillage size={16} color={c} />,
  "/more": (c) => <IconHeart size={16} color={c} />,
};

const tabs = [
  { key: "/", label: "Today" },
  { key: "/journey", label: "Story" },
  { key: "/village", label: "Village" },
  { key: "/more", label: "Me" },
] as const;

const SEARCH_DATA_KEYS: { key: string; label: string; parseItem: (item: any) => { text: string; time: number } | null }[] = [
  {
    key: "feedingHistory", label: "Feeds",
    parseItem: (r: any) => {
      const t = r?.startTime ?? r?.timestamp;
      if (!t) return null;
      return { text: `Feed – ${r.type ?? "breast"} ${r.amount ? r.amount + "ml" : ""}`.trim(), time: t };
    },
  },
  {
    key: "sleepHistory", label: "Sleep",
    parseItem: (r: any) => {
      if (!r?.startTime) return null;
      const dur = r.endTime ? Math.round((r.endTime - r.startTime - (r.excludedMs ?? 0)) / 60000) : 0;
      return { text: `Sleep${dur ? " – " + dur + " min" : ""}`, time: r.startTime };
    },
  },
  {
    key: "diaperHistory", label: "Diapers",
    parseItem: (r: any) => r?.timestamp ? { text: `Diaper – ${r.type ?? "wet"}`, time: r.timestamp } : null,
  },
  {
    key: "tummyTimeHistory", label: "Tummy time",
    parseItem: (r: any) => {
      if (!r?.startTime) return null;
      const dur = r.endTime ? Math.round((r.endTime - r.startTime - (r.excludedMs ?? 0)) / 60000) : 0;
      return { text: `Tummy time${dur ? " – " + dur + " min" : ""}`, time: r.startTime };
    },
  },
  {
    key: "pumpHistory", label: "Pump",
    parseItem: (r: any) => {
      if (!r?.timestamp) return null;
      const ml = (r.volumeLeftMl ?? 0) + (r.volumeRightMl ?? 0);
      return { text: `Pump – ${r.side ?? "both"}${ml ? " " + ml + "ml" : ""}`, time: r.timestamp };
    },
  },
  {
    key: "cradl-notes", label: "Notes",
    parseItem: (r: any) => r?.text ? { text: `Note – ${r.text.slice(0, 60)}`, time: r.ts ?? r.createdAt ?? Date.now() } : null,
  },
];

function searchLogs(query: string): { text: string; time: number; category: string }[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const results: { text: string; time: number; category: string }[] = [];
  for (const { key, label, parseItem } of SEARCH_DATA_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) continue;
      for (const item of arr) {
        const parsed = parseItem(item);
        if (parsed && parsed.text.toLowerCase().includes(q)) {
          results.push({ ...parsed, category: label });
        }
      }
    } catch { /* skip */ }
  }
  results.sort((a, b) => b.time - a.time);
  return results.slice(0, 30);
}

function formatSearchTime(ts: number): string {
  try {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 3600000) return `${Math.max(1, Math.round(diffMs / 60000))}m ago`;
    if (diffMs < 86400000) return `${Math.round(diffMs / 3600000)}h ago`;
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  } catch { return ""; }
}

interface DesktopTopBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  babyName?: string;
}

export function DesktopTopBar({ activeTab, onTabChange, babyName }: DesktopTopBarProps) {
  const { isPremium } = usePremium();
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ReturnType<typeof searchLogs>>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchResults(searchLogs(searchQuery));
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <header
      style={{
        height: 56,
        background: "#fff",
        borderBottom: "1.5px solid #ede0d4",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        flexShrink: 0,
        zIndex: 100,
      }}
    >
      <img
        src="/logo-navbar.png"
        alt="Cradl"
        style={{
          height: 30,
          marginRight: 24,
          userSelect: "none",
          objectFit: "contain",
        }}
      />

      <nav role="navigation" aria-label="Main navigation" style={{ display: "flex", gap: 4, flex: 1 }}>
        {tabs.map(({ key, label }) => {
          const isActive = key === "/" ? activeTab === "/" || activeTab === "" : activeTab.startsWith(key);
          const isHovered = hoveredTab === key;

          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              aria-label={`Navigate to ${label} tab`}
              onClick={() => onTabChange(key)}
              onMouseEnter={() => setHoveredTab(key)}
              onMouseLeave={() => setHoveredTab(null)}
              style={{
                padding: "8px 16px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                fontFamily: "system-ui, sans-serif",
                color: isActive ? "#c04030" : "#9a8080",
                background: isActive ? "#feeae4" : isHovered ? "#f8f0e8" : "none",
                transition: "all .15s",
                whiteSpace: "nowrap",
                lineHeight: 1,
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {tabIcons[key]?.(isActive ? "#c04030" : "#9a8080")}
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto", flexShrink: 0 }}>
        {/* Search */}
        <div style={{ position: "relative" }} ref={searchBoxRef}>
          <div
            onClick={() => setSearchOpen((v) => !v)}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              background: searchOpen ? "#feeae4" : "#f8f0e8",
            }}
            aria-label="Search logs"
          >
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
              <circle cx="5.5" cy="5.5" r="4" stroke={searchOpen ? "#c04030" : "#9a8080"} strokeWidth="1.2" />
              <path d="M9 9l3 3" stroke={searchOpen ? "#c04030" : "#9a8080"} strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          {searchOpen && (
            <div
              style={{
                position: "absolute",
                top: 42,
                right: 0,
                width: 360,
                maxHeight: 420,
                background: "#fff",
                border: "1.5px solid #ede0d4",
                borderRadius: 14,
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                overflow: "hidden",
                zIndex: 200,
              }}
            >
              <div style={{ padding: "12px 14px 8px" }}>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search feeds, sleep, diapers, notes…"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #ede0d4",
                    background: "#faf7f2",
                    fontSize: 14,
                    fontFamily: "system-ui, sans-serif",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}
                />
              </div>
              <div style={{ maxHeight: 340, overflowY: "auto", padding: "0 8px 8px" }}>
                {searchQuery.trim() && searchResults.length === 0 && (
                  <div style={{ padding: "20px 14px", textAlign: "center", color: "#9a8080", fontSize: 13 }}>
                    No results for "{searchQuery}"
                  </div>
                )}
                {searchResults.map((r, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setSearchOpen(false);
                      onTabChange("/?ts=" + r.time);
                    }}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#faf0e8")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "#2c1f1f", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.text}</div>
                      <div style={{ fontSize: 11, color: "#9a8080" }}>{r.category}</div>
                    </div>
                    <div style={{ fontSize: 11, color: "#9a8080", whiteSpace: "nowrap", flexShrink: 0 }}>{formatSearchTime(r.time)}</div>
                  </div>
                ))}
                {!searchQuery.trim() && (
                  <div style={{ padding: "20px 14px", textAlign: "center", color: "#9a8080", fontSize: 13 }}>
                    Type to search your logs
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <span
          onClick={() => (window.location.href = "/premium")}
          style={{
            fontSize: 13,
            fontWeight: 600,
            background: isPremium ? "#feeae4" : "#f4f0ec",
            color: isPremium ? "#8a3020" : "#9a8080",
            padding: "5px 12px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          {isPremium ? "PRO" : "Upgrade"}
        </span>

        {/* Settings gear */}
        <div
          onClick={() => (window.location.href = "/settings")}
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            background: "#f8f0e8",
          }}
          aria-label="Settings"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9a8080" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </div>

        <div
          onClick={() => (window.location.href = "/settings")}
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #fde8d8, #e8d4f5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          aria-label="Profile settings"
        >
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="5" r="2.5" fill="#c4a0a0" />
            <path d="M2 13c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="#c4a0a0" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          </svg>
        </div>

        <span style={{ fontSize: 14, fontWeight: 500, color: "#2c1f1f" }}>{babyName || "Baby"}</span>
      </div>
    </header>
  );
}
