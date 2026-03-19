import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router";
import { getHandoffSessionFromLocal, isHandoffSessionExpired, updateHandoffSessionLogs } from "../utils/handoffGenerator";
import { fetchHandoffSession, addHandoffLog, fetchHandoffLogs } from "../utils/handoffApi";
import { getAgeMonthsWeeks } from "../utils/babyUtils";
import { HandoffLogSheet } from "../components/HandoffLogSheet";
import { CradlLoadingAnimation } from "../components/CradlLoadingAnimation";
import { formatClockTime } from "../utils/dateUtils";
import type { HandoffSession, HandoffLog } from "../types/handoff";

const ACCENT_COLORS: Record<string, string> = {
  feed: "var(--coral)",
  nap: "var(--blue)",
  nappy: "var(--grn)",
  headsup: "var(--notice-amber)",
  summary: "var(--purp)",
};

function InfoCard({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border mb-3 overflow-hidden"
      style={{ background: "var(--card)", borderColor: "var(--bd)" }}
    >
      <div className="flex">
        <div className="w-1 shrink-0 rounded-l-xl" style={{ background: accent }} />
        <div className="p-4 flex-1 min-w-0">
          <div
            className="text-[12px] font-medium mb-1"
            style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}
          >
            {title}
          </div>
          <div
            className="text-[14px]"
            style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function ShimmerBlock({ width, height }: { width: string; height: number }) {
  return (
    <div
      className="rounded-lg mb-3"
      style={{
        width,
        height,
        background: "linear-gradient(90deg, var(--bg2) 25%, var(--bg3) 50%, var(--bg2) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
      }}
    />
  );
}

function formatFeedInfo(session: HandoffSession): string {
  if (!session.lastFeed) return "No feed data yet";
  const { time, side, durationSeconds } = session.lastFeed;
  const mins = Math.floor(durationSeconds / 60);
  const parts = [time];
  if (side) parts.push(side);
  if (mins > 0) parts.push(`${mins}m`);
  return parts.join(" · ");
}

function formatNapInfo(session: HandoffSession): string {
  if (!session.lastNap) return "No nap data yet";
  const mins = Math.floor(session.lastNap.durationSeconds / 60);
  let str = `Ended ${session.lastNap.endTime}`;
  if (mins > 0) str += ` · ${mins}m`;
  return str;
}

function formatNappyInfo(session: HandoffSession): string {
  if (!session.lastDiaper) return "No nappy data yet";
  return `${session.lastDiaper.time} · ${session.lastDiaper.type}`;
}

function buildSummary(session: HandoffSession): string | null {
  const parts: string[] = [];
  if (session.nextFeedEta) {
    try {
      const t = formatClockTime(new Date(session.nextFeedEta).getTime());
      parts.push(`Next feed around ${t}`);
    } catch { /* ignore */ }
  }
  if (session.napWindowStatus !== "unknown") {
    const label = session.napWindowStatus === "open" ? "Nap window open" : session.napWindowStatus === "approaching" ? "Nap window approaching" : "Nap window closed";
    parts.push(label);
  }
  if (session.moodNote) parts.push(`Mood: ${session.moodNote}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function HandoffPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<HandoffSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [logSheet, setLogSheet] = useState<"feed" | "nappy" | "sleep" | null>(null);
  const [isSleeping, setIsSleeping] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const local = getHandoffSessionFromLocal(sessionId);
      if (local) {
        if (!cancelled) setSession(local);
        setLoading(false);
        return;
      }
      const remote = await fetchHandoffSession(sessionId);
      if (!cancelled) {
        setSession(remote ?? null);
        if (remote) {
          const logs = await fetchHandoffLogs(sessionId);
          if (logs.length > 0) setSession((s) => (s ? { ...s, logs } : s));
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  const expired = session ? isHandoffSessionExpired(session) : false;

  const handleLogSaved = useCallback(() => {
    if (!sessionId) return;
    (async () => {
      const remoteLogs = await fetchHandoffLogs(sessionId);
      if (remoteLogs.length > 0) {
        setSession((s) => (s ? { ...s, logs: remoteLogs } : s));
        updateHandoffSessionLogs(sessionId, remoteLogs);
      } else {
        const local = getHandoffSessionFromLocal(sessionId);
        if (local?.logs?.length) {
          setSession((s) => (s ? { ...s, logs: local.logs } : s));
        }
      }
    })();
  }, [sessionId]);

  const handleSleepToggle = useCallback(() => {
    setIsSleeping((prev) => !prev);
    setLogSheet("sleep");
  }, []);

  // LOADING state
  if (loading) {
    return <CradlLoadingAnimation fullScreen label="Loading handoff…" />;
  }

  // NOT FOUND
  if (!session) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: "var(--bg)" }}
      >
        <h1
          className="text-xl mb-2"
          style={{ fontFamily: "Georgia, serif", color: "var(--tx)" }}
        >
          Session not found
        </h1>
        <p className="text-sm" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
          This handoff link may be invalid or expired.
        </p>
        <a href="/" className="mt-4 text-sm underline" style={{ color: "var(--coral)" }}>Get Cradl</a>
      </div>
    );
  }

  // EXPIRED
  if (expired) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: "var(--bg3)" }}
      >
        <div
          className="rounded-2xl border p-8 text-center max-w-sm"
          style={{ background: "var(--card)", borderColor: "var(--bd)" }}
        >
          <div className="mb-3 flex justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
          </div>
          <h1
            className="text-lg mb-2"
            style={{ fontFamily: "Georgia, serif", color: "var(--tx)" }}
          >
            This handoff card has expired.
          </h1>
          <p className="text-sm mb-4" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
            Handoff cards are valid for 24 hours. Ask for a new link.
          </p>
          <a href="/" className="text-sm underline" style={{ color: "var(--coral)" }}>Get Cradl</a>
        </div>
      </div>
    );
  }

  // VALID
  const ageStr = session.birthDate ? getAgeMonthsWeeks(session.birthDate) : null;
  const summary = buildSummary(session);
  const expiryLabel = (() => {
    try {
      const expiresMs = new Date(session.expiresAt).getTime();
      const remainMs = expiresMs - Date.now();
      if (remainMs <= 0) return null;
      const hours = Math.floor(remainMs / (60 * 60 * 1000));
      const mins = Math.floor((remainMs % (60 * 60 * 1000)) / (60 * 1000));
      if (hours >= 1) return `Expires in ${hours}h ${mins}m`;
      return `Expires in ${mins}m`;
    } catch {
      return null;
    }
  })();

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--bg)" }}>
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-5">
          <h1
            className="text-2xl mb-0.5"
            style={{ fontFamily: "Georgia, serif", color: "var(--tx)" }}
          >
            {session.babyName}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            {ageStr && (
              <span className="text-sm" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
                {ageStr}
              </span>
            )}
            {expiryLabel && (
              <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "var(--bg2)", color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
                {expiryLabel}
              </span>
            )}
          </div>
        </div>

        {/* Info cards */}
        <InfoCard title="Feed" accent={ACCENT_COLORS.feed}>
          {formatFeedInfo(session)}
        </InfoCard>

        <InfoCard title="Nap" accent={ACCENT_COLORS.nap}>
          <span>{formatNapInfo(session)}</span>
          {session.napWindowStatus !== "unknown" && (
            <span
              className="ml-2 text-xs px-1.5 py-0.5 rounded"
              style={{
                background: session.napWindowStatus === "open"
                  ? "color-mix(in srgb, var(--grn) 15%, var(--card))"
                  : session.napWindowStatus === "approaching"
                    ? "color-mix(in srgb, var(--notice-amber) 15%, var(--card))"
                    : "color-mix(in srgb, var(--coral) 15%, var(--card))",
                color: session.napWindowStatus === "open"
                  ? "var(--grn)"
                  : session.napWindowStatus === "approaching"
                    ? "var(--notice-amber)"
                    : "var(--coral)",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {session.napWindowStatus}
            </span>
          )}
        </InfoCard>

        <InfoCard title="Nappy" accent={ACCENT_COLORS.nappy}>
          {formatNappyInfo(session)}
        </InfoCard>

        {session.headsUp && (
          <InfoCard title="Heads up" accent={ACCENT_COLORS.headsup}>
            {session.headsUp}
          </InfoCard>
        )}

        {summary && (
          <InfoCard title="Today's summary" accent={ACCENT_COLORS.summary}>
            {summary}
          </InfoCard>
        )}

        {/* Recent logs */}
        {session.logs.length > 0 && (
          <div className="mt-4 mb-2">
            <p className="text-[12px] font-medium mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
              Logged by carer
            </p>
            {session.logs.slice(-5).map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-2 py-1.5 text-[13px]"
                style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}
              >
                <span style={{ color: "var(--mu)" }}>
                  {formatClockTime(new Date(log.loggedAt).getTime())}
                </span>
                <span className="capitalize">{log.type}</span>
                {log.note && <span style={{ color: "var(--mu)" }}>· {log.note}</span>}
                <span style={{ color: "var(--mu)" }}>— {log.loggedByName}</span>
              </div>
            ))}
          </div>
        )}

        {/* Log buttons */}
        <div className="flex flex-col gap-2 mt-6 mb-4">
          <button
            type="button"
            onClick={() => setLogSheet("feed")}
            className="w-full py-3.5 rounded-xl text-[15px] font-medium text-white"
            style={{ background: "var(--coral)", fontFamily: "system-ui, sans-serif" }}
          >
            Log a feed
          </button>
          <button
            type="button"
            onClick={() => setLogSheet("nappy")}
            className="w-full py-3.5 rounded-xl text-[15px] font-medium text-white"
            style={{ background: "var(--grn)", fontFamily: "system-ui, sans-serif" }}
          >
            Log a nappy
          </button>
          <button
            type="button"
            onClick={handleSleepToggle}
            className="w-full py-3.5 rounded-xl text-[15px] font-medium text-white"
            style={{ background: "var(--blue)", fontFamily: "system-ui, sans-serif" }}
          >
            {isSleeping ? "She just woke up" : "Start sleep"}
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-10" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <span className="text-[12px]" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Powered by</span>
          <a href="/">
            <img src="/logo-navbar.png" alt="Cradl" style={{ height: 18, objectFit: "contain" }} />
          </a>
        </div>
      </div>

      {/* Log sheets */}
      {logSheet && sessionId && (
        <HandoffLogSheet
          type={logSheet}
          sessionId={sessionId}
          onSaved={handleLogSaved}
          onClose={() => setLogSheet(null)}
          isSleeping={logSheet === "sleep" ? isSleeping : undefined}
        />
      )}
    </div>
  );
}
