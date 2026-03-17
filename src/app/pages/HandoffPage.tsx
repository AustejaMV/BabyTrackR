import { useState, useEffect } from "react";
import { useParams } from "react-router";
import { getHandoffSessionFromLocal, isHandoffSessionExpired, updateHandoffSessionLogs } from "../utils/handoffGenerator";
import { fetchHandoffSession, addHandoffLog, fetchHandoffLogs } from "../utils/handoffApi";
import { getAgeMonthsWeeks } from "../utils/babyUtils";
import type { HandoffSession, HandoffLog } from "../types/handoff";
import { toast } from "sonner";

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-4 mb-3" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
      <div className="text-[12px] font-medium mb-1" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>{title}</div>
      <div className="text-[14px]" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>{children}</div>
    </div>
  );
}

export function HandoffPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<HandoffSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [logSheet, setLogSheet] = useState<"feed" | "sleep" | "diaper" | null>(null);
  const [logName, setLogName] = useState("");
  const [logNote, setLogNote] = useState("");
  const [logFeedSide, setLogFeedSide] = useState<"left" | "right" | "both">("left");
  const [logDiaperType, setLogDiaperType] = useState<"pee" | "poop" | "both">("pee");
  const [saving, setSaving] = useState(false);

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

  const handleSaveLog = async () => {
    if (!session || expired || !sessionId) return;
    const name = (logName || "Caregiver").trim();
    setSaving(true);
    try {
      if (logSheet === "feed") {
        const log = await addHandoffLog(sessionId, { type: "feed", loggedByName: name, note: logNote.trim() || null });
        if (log) {
          setSession((s) => (s ? { ...s, logs: [...s.logs, log] } : s));
          updateHandoffSessionLogs(sessionId, [...session.logs, log]);
          toast.success("Feed logged");
        } else toast.error("Could not save");
      } else if (logSheet === "sleep") {
        const log = await addHandoffLog(sessionId, { type: "sleep", loggedByName: name, note: logNote.trim() || null });
        if (log) {
          setSession((s) => (s ? { ...s, logs: [...s.logs, log] } : s));
          updateHandoffSessionLogs(sessionId, [...session.logs, log]);
          toast.success("Sleep logged");
        } else toast.error("Could not save");
      } else if (logSheet === "diaper") {
        const log = await addHandoffLog(sessionId, { type: "diaper", loggedByName: name, note: logNote.trim() || null });
        if (log) {
          setSession((s) => (s ? { ...s, logs: [...s.logs, log] } : s));
          updateHandoffSessionLogs(sessionId, [...session.logs, log]);
          toast.success("Diaper change logged");
        } else toast.error("Could not save");
      }
      setLogSheet(null);
      setLogNote("");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <p style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Loading…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "var(--bg)" }}>
        <h1 className="text-xl font-serif mb-2" style={{ color: "var(--tx)" }}>Session not found</h1>
        <p className="text-sm" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>This handoff link may be invalid or expired.</p>
        <a href="/" className="mt-4 text-sm underline" style={{ color: "var(--pink)" }}>Get Cradl</a>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "var(--bg)" }}>
        <h1 className="text-xl font-serif mb-2" style={{ color: "var(--tx)" }}>Session expired</h1>
        <p className="text-sm text-center" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>This handoff link has expired. Ask for a new link.</p>
        <a href="/" className="mt-4 text-sm underline" style={{ color: "var(--pink)" }}>Get Cradl</a>
      </div>
    );
  }

  const ageStr = session.birthDate ? getAgeMonthsWeeks(session.birthDate) : null;

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--bg)" }}>
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-2xl font-serif mb-0.5" style={{ color: "var(--tx)" }}>{session.babyName}</h1>
        {ageStr && <p className="text-sm mb-4" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>{ageStr}</p>}

        <InfoCard title="Last feed">{session.lastFeed ? `${session.lastFeed.time}${session.lastFeed.side ? ` · ${session.lastFeed.side}` : ""} · ${session.lastFeed.durationSeconds}s` : "—"}</InfoCard>
        <InfoCard title="Next feed (around)">{session.nextFeedEta ? new Date(session.nextFeedEta).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</InfoCard>
        <InfoCard title="Last nap">
          {session.lastNap ? `${session.lastNap.endTime} · ${Math.floor(session.lastNap.durationSeconds / 60)}m` : "—"}
          {session.napWindowStatus !== "unknown" && <span className="ml-2 text-xs" style={{ color: "var(--mu)" }}>(Nap window: {session.napWindowStatus})</span>}
        </InfoCard>
        <InfoCard title="Last diaper">{session.lastDiaper ? `${session.lastDiaper.time} · ${session.lastDiaper.type}` : "—"}</InfoCard>
        {session.headsUp && <InfoCard title="Heads up">{session.headsUp}</InfoCard>}

        <div className="grid grid-cols-3 gap-2 mt-6 mb-4">
          <button type="button" onClick={() => setLogSheet("feed")} className="rounded-xl border py-4 flex flex-col items-center justify-center" style={{ background: "color-mix(in srgb, var(--coral) 15%, var(--card))", borderColor: "var(--bd)" }}>
            <span className="text-[13px] font-medium" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>Feed</span>
          </button>
          <button type="button" onClick={() => setLogSheet("sleep")} className="rounded-xl border py-4 flex flex-col items-center justify-center" style={{ background: "color-mix(in srgb, var(--blue) 15%, var(--card))", borderColor: "var(--bd)" }}>
            <span className="text-[13px] font-medium" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>Sleep</span>
          </button>
          <button type="button" onClick={() => setLogSheet("diaper")} className="rounded-xl border py-4 flex flex-col items-center justify-center" style={{ background: "color-mix(in srgb, var(--grn) 15%, var(--card))", borderColor: "var(--bd)" }}>
            <span className="text-[13px] font-medium" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>Diaper</span>
          </button>
        </div>

        {logSheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setLogSheet(null)}>
            <div className="w-full max-w-lg rounded-t-2xl p-6 pb-10 border-t" style={{ background: "var(--card)", borderColor: "var(--bd)" }} onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-medium mb-4" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>Log {logSheet}</h3>
              <label className="block text-[13px] mb-1" style={{ color: "var(--mu)" }}>Your name</label>
              <input type="text" value={logName} onChange={(e) => setLogName(e.target.value)} placeholder="Caregiver's name" className="w-full rounded-lg border px-3 py-2.5 mb-3 text-[15px]" style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }} />
              {logSheet === "feed" && (
                <>
                  <label className="block text-[13px] mb-1" style={{ color: "var(--mu)" }}>Side</label>
                  <div className="flex gap-2 mb-3">
                    {(["left", "right", "both"] as const).map((s) => (
                      <button key={s} type="button" onClick={() => setLogFeedSide(s)} className={`flex-1 py-2 rounded-lg border text-sm ${logFeedSide === s ? "border-[var(--coral)] bg-[color-mix(in_srgb,var(--coral)_15%,var(--card))]" : ""}`} style={{ borderColor: "var(--bd)", color: "var(--tx)" }}>{s}</button>
                    ))}
                  </div>
                </>
              )}
              {logSheet === "diaper" && (
                <>
                  <label className="block text-[13px] mb-1" style={{ color: "var(--mu)" }}>Type</label>
                  <div className="flex gap-2 mb-3">
                    {(["pee", "poop", "both"] as const).map((t) => (
                      <button key={t} type="button" onClick={() => setLogDiaperType(t)} className={`flex-1 py-2 rounded-lg border text-sm ${logDiaperType === t ? "border-[var(--grn)] bg-[color-mix(in_srgb,var(--grn)_15%,var(--card))]" : ""}`} style={{ borderColor: "var(--bd)", color: "var(--tx)" }}>{t}</button>
                    ))}
                  </div>
                </>
              )}
              <label className="block text-[13px] mb-1" style={{ color: "var(--mu)" }}>Note (optional)</label>
              <input type="text" value={logNote} onChange={(e) => setLogNote(e.target.value)} placeholder="Optional note" className="w-full rounded-lg border px-3 py-2.5 mb-4 text-[15px]" style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }} />
              <div className="flex gap-2">
                <button type="button" onClick={() => setLogSheet(null)} className="flex-1 py-2.5 rounded-xl border" style={{ borderColor: "var(--bd)", color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>Cancel</button>
                <button type="button" onClick={handleSaveLog} disabled={saving} className="flex-1 py-2.5 rounded-xl border-none text-white" style={{ background: "var(--coral)", fontFamily: "system-ui, sans-serif" }}>{saving ? "Saving…" : "Save"}</button>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-[12px] mt-8" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Get Cradl — the app for tracking your baby.</p>
      </div>
    </div>
  );
}
