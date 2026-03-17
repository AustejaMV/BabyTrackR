import { useState, useEffect } from "react";
import { Link } from "react-router";
import { format } from "date-fns";
import {
  getWoundCareHistory,
  saveWoundCareEntry,
  getPelvicFloorHistory,
  getPelvicFloorForDate,
  savePelvicFloorEntry,
  getBreastPainHistory,
  saveBreastPainEntry,
  getEPDSResponses,
  saveEPDSResponse,
  getLastEPDSResponse,
} from "../utils/mumHealthStorage";
import { scoreEPDS } from "../utils/epdsScoring";

const EPDS_REVERSE_QUESTIONS = new Set([3, 5, 6, 7, 8, 9, 10]);
import type { WoundCareEntry, PelvicFloorEntry, BreastPainEntry } from "../types/mumHealth";
import { toast } from "sonner";
import { useBaby } from "../contexts/BabyContext";
import { MumSleepHistory } from "../components/MumSleepHistory";
import { getTimeCapsules, deleteTimeCapsule } from "../utils/timeCapsuleStorage";

const EPDS_QUESTIONS = [
  "I have been able to laugh and see the funny side of things",
  "I have looked forward with enjoyment to things",
  "I have blamed myself unnecessarily when things went wrong",
  "I have been anxious or worried for no good reason",
  "I have felt scared or panicky for no good reason",
  "Things have been getting on top of me",
  "I have been so unhappy that I have had difficulty sleeping",
  "I have felt sad or miserable",
  "I have been so unhappy that I have been crying",
  "The thought of harming myself has occurred to me",
];

const EPDS_OPTIONS = [
  "Yes, most of the time",
  "Yes, quite often",
  "Not very often",
  "No, never",
];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function MumWellbeingScreen() {
  const [tab, setTab] = useState<"pain" | "recovery" | "pelvic" | "sleep" | "mood" | "notes">("pain");
  const [woundHistory, setWoundHistory] = useState<WoundCareEntry[]>([]);
  const [pelvicHistory, setPelvicHistory] = useState<PelvicFloorEntry[]>([]);
  const [breastHistory, setBreastHistory] = useState<BreastPainEntry[]>([]);
  const [epdsResponses, setEpdsResponses] = useState(getEPDSResponses());
  const [painkillerHistory, setPainkillerHistory] = useState<{ timestamp: number }[]>([]);

  const [woundSheetOpen, setWoundSheetOpen] = useState(false);
  const [woundArea, setWoundArea] = useState<WoundCareEntry["area"]>("perineal");
  const [woundRedness, setWoundRedness] = useState(false);
  const [woundPain, setWoundPain] = useState(false);
  const [woundPainLevel, setWoundPainLevel] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [woundNotes, setWoundNotes] = useState("");

  const today = todayStr();
  const pelvicToday = getPelvicFloorForDate(today);
  const [pelvicDone, setPelvicDone] = useState(pelvicToday?.completed ?? false);
  const [pelvicReps, setPelvicReps] = useState(pelvicToday?.repsCompleted ?? 0);

  const [epdsStep, setEpdsStep] = useState(0);
  const [epdsAnswers, setEpdsAnswers] = useState<number[]>([]);
  const [epdsComplete, setEpdsComplete] = useState<{ flagged: boolean } | null>(null);
  const lastEPDS = getLastEPDSResponse();
  const epdsDue = !lastEPDS || (lastEPDS && (Date.now() - new Date(lastEPDS.completedAt).getTime()) / (24 * 3600000) > 14);

  const loadData = () => {
    setWoundHistory(getWoundCareHistory());
    setPelvicHistory(getPelvicFloorHistory());
    setBreastHistory(getBreastPainHistory());
    setEpdsResponses(getEPDSResponses());
    try {
      const raw = localStorage.getItem("painkillerHistory");
      setPainkillerHistory(raw ? JSON.parse(raw) : []);
    } catch {}
  };

  useEffect(loadData, []);
  useEffect(() => {
    const pt = getPelvicFloorForDate(today);
    setPelvicDone(pt?.completed ?? false);
    setPelvicReps(pt?.repsCompleted ?? 0);
  }, [today, tab]);

  const lastPainkiller = painkillerHistory.length > 0 ? painkillerHistory[painkillerHistory.length - 1]! : null;
  const nextSafeParacetamol = lastPainkiller ? lastPainkiller.timestamp + 4 * 3600000 - Date.now() : null;
  const nextSafeIbuprofen = lastPainkiller ? lastPainkiller.timestamp + 6 * 3600000 - Date.now() : null;

  const woundAlert = woundHistory.length >= 2 && (() => {
    const a = woundHistory[woundHistory.length - 2]!;
    const b = woundHistory[woundHistory.length - 1]!;
    return (a.hasRedness && b.hasRedness) || (a.painLevel != null && b.painLevel != null && b.painLevel > a.painLevel);
  })();

  const pelvicStreak = (() => {
    let streak = 0;
    const sorted = [...pelvicHistory].filter((e) => e.completed).sort((x, y) => y.date.localeCompare(x.date));
    const dates = [...new Set(sorted.map((e) => e.date))].sort((a, b) => b.localeCompare(a));
    for (const d of dates) {
      const expected = new Date(today);
      const check = new Date(d);
      const diffDays = Math.round((expected.getTime() - check.getTime()) / (24 * 3600000));
      if (diffDays !== streak) break;
      streak++;
    }
    return streak;
  })();

  const { activeBaby } = useBaby();
  const [notesKey, setNotesKey] = useState(0);
  const tabs = [
    { id: "pain" as const, label: "Pain relief" },
    { id: "recovery" as const, label: "Recovery" },
    { id: "pelvic" as const, label: "Pelvic floor" },
    { id: "sleep" as const, label: "Sleep" },
    { id: "mood" as const, label: "Mood check" },
    { id: "notes" as const, label: "Notes to self" },
  ];

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <Link to="/more" className="text-sm" style={{ color: "var(--pink)" }}>← Back</Link>
          <h1 className="text-xl font-serif" style={{ color: "var(--tx)" }}>You matter too</h1>
          <span className="w-10" />
        </div>

        <div className="flex gap-2 mb-4 border-b" style={{ borderColor: "var(--bd)" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="py-2 px-3 text-sm font-medium rounded-t-lg"
              style={{
                color: tab === t.id ? "var(--tx)" : "var(--mu)",
                borderBottom: tab === t.id ? "2px solid var(--pink)" : "none",
                background: tab === t.id ? "var(--card)" : "transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "pain" && (
          <div className="rounded-2xl border p-4" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
            <h2 className="text-lg font-medium mb-2" style={{ color: "var(--tx)" }}>Pain relief</h2>
            {lastPainkiller ? (
              <div className="space-y-1 text-sm" style={{ color: "var(--mu)" }}>
                <p>Last dose: {format(new Date(lastPainkiller.timestamp), "dd/MM/yyyy HH:mm")}</p>
                {nextSafeParacetamol != null && (
                  <p>{nextSafeParacetamol > 0 ? `Paracetamol: wait ${Math.ceil(nextSafeParacetamol / 3600000)}h` : "Paracetamol: safe to take now"}</p>
                )}
                {nextSafeIbuprofen != null && (
                  <p>{nextSafeIbuprofen > 0 ? `Ibuprofen: wait ${Math.ceil(nextSafeIbuprofen / 3600000)}h` : "Ibuprofen: safe to take now"}</p>
                )}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--mu)" }}>No doses logged yet.</p>
            )}
            <Link to="/" className="inline-block mt-3 py-2 px-4 rounded-xl text-sm font-medium" style={{ background: "var(--med-bg)", color: "var(--med-col)" }}>
              Log dose on home
            </Link>
          </div>
        )}

        {tab === "recovery" && (
          <div className="space-y-4">
            {woundAlert && (
              <div className="rounded-xl border p-3" style={{ background: "rgba(240,160,192,0.1)", borderColor: "var(--pink)" }}>
                <p className="text-sm" style={{ color: "var(--tx)" }}>
                  Redness or increasing pain can be signs of infection. Contact your GP or NHS 111 if you&apos;re concerned.
                </p>
              </div>
            )}
            <div className="rounded-2xl border p-4" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
              <h2 className="text-lg font-medium mb-2" style={{ color: "var(--tx)" }}>Wound check</h2>
              <button
                type="button"
                onClick={() => setWoundSheetOpen(true)}
                className="py-2 px-4 rounded-xl text-sm font-medium border"
                style={{ borderColor: "var(--bd)", color: "var(--tx)" }}
              >
                Log wound check
              </button>
              {woundHistory.length > 0 && (
                <ul className="mt-3 space-y-2 text-sm" style={{ color: "var(--mu)" }}>
                  {woundHistory.slice(-5).reverse().map((e) => (
                    <li key={e.id}>
                      {format(new Date(e.timestamp), "dd/MM HH:mm")} — {e.area}
                      {e.hasRedness && " · Redness"}
                      {e.painLevel != null && ` · Pain ${e.painLevel}`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-2xl border p-4" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
              <h2 className="text-lg font-medium mb-2" style={{ color: "var(--tx)" }}>Breast pain</h2>
              <p className="text-sm mb-2" style={{ color: "var(--mu)" }}>
                If severity is 4 or 5 with warmth or redness, this could be mastitis. Rest, keep feeding from the affected side, and contact your GP if symptoms worsen.
              </p>
              <Link to="/" className="text-sm" style={{ color: "var(--pink)" }}>Log in Health drawer on home →</Link>
              {breastHistory.length > 0 && (
                <ul className="mt-2 text-sm" style={{ color: "var(--mu)" }}>
                  {breastHistory.slice(-3).reverse().map((e) => (
                    <li key={e.id}>{format(new Date(e.timestamp), "dd/MM")} — {e.side} · severity {e.severity}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {tab === "pelvic" && (
          <div className="rounded-2xl border p-4" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
            <h2 className="text-lg font-medium mb-2" style={{ color: "var(--tx)" }}>Pelvic floor</h2>
            <p className="text-sm mb-3" style={{ color: "var(--mu)" }}>Today: {today}</p>
            <div className="flex items-center gap-4 mb-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={pelvicDone}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setPelvicDone(checked);
                    savePelvicFloorEntry({ date: today, completed: checked, repsCompleted: checked ? pelvicReps : null });
                    loadData();
                  }}
                />
                <span style={{ color: "var(--tx)" }}>Done for today</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextReps = pelvicReps + 1;
                    setPelvicReps(nextReps);
                    savePelvicFloorEntry({ date: today, completed: true, repsCompleted: nextReps });
                    loadData();
                  }}
                  className="w-8 h-8 rounded-full border flex items-center justify-center"
                  style={{ borderColor: "var(--bd)", color: "var(--tx)" }}
                  aria-label="Add rep"
                >
                  +
                </button>
                <span style={{ color: "var(--tx)" }}>{pelvicReps} reps</span>
              </div>
            </div>
            <p className="text-sm" style={{ color: "var(--mu)" }}>7-day streak: {pelvicStreak} days</p>
          </div>
        )}

        {tab === "sleep" && (
          <div className="space-y-4">
            <MumSleepHistory babyName={activeBaby?.name} />
          </div>
        )}

        {tab === "mood" && (
          <div className="space-y-4">
            {epdsComplete !== null ? (
              <div className="rounded-2xl border p-4" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
                {epdsComplete.flagged ? (
                  <p className="text-sm leading-relaxed" style={{ color: "var(--tx)" }}>
                    It sounds like things have been harder than usual lately. You&apos;re not alone — many new parents feel this way. Talking to your GP or health visitor can really help. You can also call the PANDAS helpline on 0808 1961 776.
                  </p>
                ) : (
                  <p className="text-sm" style={{ color: "var(--tx)" }}>Thanks for checking in. You&apos;re doing a great job looking after yourself.</p>
                )}
                <button type="button" onClick={() => { setEpdsComplete(null); setEpdsStep(0); setEpdsAnswers([]); }} className="mt-3 text-sm" style={{ color: "var(--pink)" }}>Retake in 14 days</button>
              </div>
            ) : epdsStep < 10 ? (
              <div className="rounded-2xl border p-4" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
                <p className="text-xs mb-2" style={{ color: "var(--mu)" }}>Question {epdsStep + 1} of 10</p>
                <p className="font-medium mb-4" style={{ color: "var(--tx)" }}>{EPDS_QUESTIONS[epdsStep]}</p>
                <div className="space-y-2">
                  {[0, 1, 2, 3].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        const score = EPDS_REVERSE_QUESTIONS.has(epdsStep + 1) ? 3 - opt : opt;
                        const next = [...epdsAnswers];
                        next[epdsStep] = score;
                        setEpdsAnswers(next);
                        if (epdsStep < 9) setEpdsStep(epdsStep + 1);
                        else {
                          const resp = saveEPDSResponse(next);
                          setEpdsComplete({ flagged: resp.flagged });
                          loadData();
                        }
                      }}
                      className="w-full text-left py-3 px-4 rounded-xl border"
                      style={{ borderColor: "var(--bd)", color: "var(--tx)" }}
                    >
                      {EPDS_OPTIONS[opt]}
                    </button>
                  ))}
                </div>
              </div>
            ) : epdsDue ? (
              <div className="rounded-2xl border p-4" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
                <h2 className="text-lg font-medium mb-2" style={{ color: "var(--tx)" }}>How are you feeling?</h2>
                <p className="text-sm mb-4" style={{ color: "var(--mu)" }}>
                  A quick check-in can help. This is the postnatal wellbeing check — 10 short questions, no score shown, just support if you need it.
                </p>
                <button
                  type="button"
                  onClick={() => setEpdsStep(0)}
                  className="py-2.5 px-4 rounded-xl font-medium"
                  style={{ background: "var(--pink)", color: "white" }}
                >
                  Take the check
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border p-4" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
                <p className="text-sm" style={{ color: "var(--mu)" }}>You last did the check on {lastEPDS ? format(new Date(lastEPDS.completedAt), "dd/MM/yyyy") : "—"}. You can take it again in 14 days.</p>
                <button type="button" onClick={() => setEpdsStep(0)} className="mt-2 text-sm" style={{ color: "var(--pink)" }}>Take again anyway</button>
              </div>
            )}
          </div>
        )}

        {tab === "notes" && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium" style={{ color: "var(--tx)" }}>My notes to myself</h2>
            <p className="text-sm" style={{ color: "var(--mu)" }}>Notes you wrote at 6, 12 or 24 months. Read-only here; delete if you no longer want to keep them.</p>
            {(() => {
              const capsules = getTimeCapsules();
              return capsules.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--mu)" }}>No notes yet. You&apos;ll be prompted on the home screen at 6, 12 or 24 months to write one.</p>
              ) : (
              <ul className="space-y-3">
                {capsules
                  .sort((a, b) => new Date(b.writtenAt).getTime() - new Date(a.writtenAt).getTime())
                  .map((entry) => (
                    <li key={entry.id} className="rounded-xl border p-4" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
                      <p className="text-xs mb-1" style={{ color: "var(--mu)" }}>
                        Written at {entry.writtenAtWeeks === 26 ? "6" : entry.writtenAtWeeks === 52 ? "12" : "24"} months · {format(new Date(entry.writtenAt), "dd MMM yyyy")}
                      </p>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>{entry.body}</p>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Delete this note? This cannot be undone.")) {
                            deleteTimeCapsule(entry.id);
                            setNotesKey((k) => k + 1);
                          }
                        }}
                        className="mt-2 text-xs"
                        style={{ color: "var(--mu)" }}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
              </ul>
              );
            })()}
          </div>
        )}
      </div>

      {woundSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setWoundSheetOpen(false)}>
          <div className="w-full max-w-lg rounded-t-2xl p-6 pb-10 border-t bg-[var(--card)] border-[var(--bd)]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-medium mb-4" style={{ color: "var(--tx)" }}>Log wound check</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--mu)" }}>Area</label>
                <div className="flex gap-2">
                  {(["caesarean", "perineal", "other"] as const).map((a) => (
                    <button key={a} type="button" onClick={() => setWoundArea(a)} className={`py-2 px-3 rounded-lg border text-sm ${woundArea === a ? "border-[var(--pink)]" : ""}`} style={{ borderColor: "var(--bd)", color: "var(--tx)" }}>{a}</button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2"><input type="checkbox" checked={woundRedness} onChange={(e) => setWoundRedness(e.target.checked)} /> <span style={{ color: "var(--tx)" }}>Redness</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={woundPain} onChange={(e) => setWoundPain(e.target.checked)} /> <span style={{ color: "var(--tx)" }}>Pain</span></label>
              {woundPain && (
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--mu)" }}>Pain level (1–5)</label>
                  <div className="flex gap-1">
                  {([1, 2, 3, 4, 5] as const).map((n) => (
                    <button key={n} type="button" onClick={() => setWoundPainLevel(n)} className={`w-10 h-10 rounded-lg border text-sm ${woundPainLevel === n ? "border-[var(--pink)]" : ""}`} style={{ borderColor: "var(--bd)", color: "var(--tx)" }}>{n}</button>
                  ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--mu)" }}>Notes</label>
                <input type="text" value={woundNotes} onChange={(e) => setWoundNotes(e.target.value)} placeholder="Optional" className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setWoundSheetOpen(false)} className="flex-1 py-2.5 rounded-xl border" style={{ borderColor: "var(--bd)", color: "var(--tx)" }}>Cancel</button>
              <button
                type="button"
                onClick={() => {
                  try {
                    saveWoundCareEntry({
                      timestamp: new Date().toISOString(),
                      area: woundArea,
                      notes: woundNotes.trim() || null,
                      hasRedness: woundRedness,
                      hasPain: woundPain,
                      painLevel: woundPain ? woundPainLevel : null,
                    });
                    loadData();
                    setWoundSheetOpen(false);
                    setWoundNotes(""); setWoundRedness(false); setWoundPain(false); setWoundPainLevel(null);
                    toast.success("Wound check saved");
                  } catch (e) {
                    toast.error("Could not save");
                  }
                }}
                className="flex-1 py-2.5 rounded-xl text-white"
                style={{ background: "var(--pink)" }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline footer to avoid mounting shared Navigation (can trigger Illegal constructor in some envs) */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto py-3 safe-area-pb" style={{ background: "var(--bg)", borderTop: "1px solid var(--bd)" }}>
        <a href="/more" className="block text-center text-sm font-medium" style={{ color: "var(--pink)" }}>← Back to More</a>
      </footer>
    </div>
  );
}
