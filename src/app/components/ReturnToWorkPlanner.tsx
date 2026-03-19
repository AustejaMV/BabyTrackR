/**
 * Return to work planner: onboarding form → Feeding plan | Sleep shift | Handoff doc tabs.
 */

import { useState, useMemo, useCallback } from "react";
import { generateReturnPlan, getCountdownMessageForToday, isReturnWithinSevenDays } from "../utils/returnToWorkGenerator";
import { saveReturnToWorkPlan, getReturnToWorkPlan } from "../utils/returnToWorkStorage";
import { formatDate } from "../utils/dateUtils";
import type { ReturnToWorkPlan as PlanType, NurseryHandoffDoc } from "../types/returnToWork";
import type { FeedingRecord } from "../types";
import type { SleepRecord } from "../types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { Briefcase, Calendar, Clock, FileText, Download, CheckCircle } from "lucide-react";

const ONBOARDING_KEY = "cradl-return-to-work";

export interface ReturnToWorkPlannerProps {
  feedingHistory: FeedingRecord[];
  sleepHistory: SleepRecord[];
  babyProfile: { birthDate?: number | string; name?: string } | null;
  onPlanSaved?: (plan: PlanType) => void;
  onSaveToServer?: (plan: PlanType) => void;
}

type Tab = "feeding" | "sleep" | "handoff";

function hasOnboarded(): boolean {
  try { return localStorage.getItem(ONBOARDING_KEY) === "true"; } catch { return false; }
}

function markOnboarded(): void {
  try { localStorage.setItem(ONBOARDING_KEY, "true"); } catch {}
}

function parseDDMMYYYY(value: string): Date | null {
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function isFutureDate(value: string): boolean {
  const d = parseDDMMYYYY(value);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d.getTime() > today.getTime();
}

function ddmmyyyyToISO(value: string): string {
  const d = parseDDMMYYYY(value);
  return d ? d.toISOString().slice(0, 10) : "";
}

function isoToDDMMYYYY(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

const PILL_STYLE = (active: boolean): React.CSSProperties => ({
  borderRadius: 20,
  border: `1.5px solid ${active ? "var(--pink)" : "var(--bd)"}`,
  background: active ? "color-mix(in srgb, var(--pink) 12%, transparent)" : "var(--card)",
  color: active ? "var(--pink)" : "var(--tx)",
  fontWeight: active ? 600 : 400,
  padding: "6px 14px",
  fontSize: 13,
  cursor: "pointer",
  transition: "all 150ms",
});

function GreenNotice({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border p-4 flex items-start gap-3"
      style={{
        borderColor: "var(--grn)",
        background: "color-mix(in srgb, var(--grn) 8%, transparent)",
      }}
    >
      <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--grn)" }} />
      <p className="text-[13px]" style={{ color: "var(--tx)" }}>{children}</p>
    </div>
  );
}

export function ReturnToWorkPlanner({
  feedingHistory,
  sleepHistory,
  babyProfile,
  onPlanSaved,
  onSaveToServer,
}: ReturnToWorkPlannerProps) {
  const existing = getReturnToWorkPlan();
  const [returnDateStr, setReturnDateStr] = useState(existing?.returnDate ? isoToDDMMYYYY(existing.returnDate) : "");
  const [workStartTime, setWorkStartTime] = useState(existing?.workStartTime ?? "09:00");
  const [feedingType, setFeedingType] = useState<"breast" | "bottle" | "mixed">(existing?.currentFeedingType ?? "breast");
  const [careArrangement, setCareArrangement] = useState<"nursery" | "childminder" | "family" | "other">(existing?.babyWillBe ?? "nursery");
  const [caregiverName, setCaregiverName] = useState(existing?.caregiverName ?? "");
  const [plan, setPlan] = useState<PlanType | null>(existing);
  const [activeTab, setActiveTab] = useState<Tab>("feeding");
  const [showOnboarding, setShowOnboarding] = useState(!hasOnboarded() && !existing);

  const [handoffEdits, setHandoffEdits] = useState<Partial<NurseryHandoffDoc>>({});

  const editedHandoff = useMemo<NurseryHandoffDoc | null>(() => {
    if (!plan) return null;
    return { ...plan.nurseryHandoffDoc, ...handoffEdits };
  }, [plan, handoffEdits]);

  const updateHandoffField = useCallback((field: keyof NurseryHandoffDoc, value: string) => {
    setHandoffEdits((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleGenerate = () => {
    if (!returnDateStr.trim()) {
      toast.error("Please enter your return date (dd/mm/yyyy).");
      return;
    }
    if (!isFutureDate(returnDateStr)) {
      toast.error("Return date must be in the future.");
      return;
    }
    const iso = ddmmyyyyToISO(returnDateStr);
    if (!iso) {
      toast.error("Invalid date format. Please use dd/mm/yyyy.");
      return;
    }
    try {
      const newPlan = generateReturnPlan({
        returnDate: iso,
        workStartTime,
        feedingHistory,
        sleepHistory,
        babyProfile,
        currentFeedingType: feedingType,
        babyWillBe: careArrangement,
        caregiverName: caregiverName.trim() || null,
        allergies: "",
        emergencyContact: "",
      });
      setPlan(newPlan);
      setHandoffEdits({});
      saveReturnToWorkPlan(newPlan);
      markOnboarded();
      setShowOnboarding(false);
      onPlanSaved?.(newPlan);
      onSaveToServer?.(newPlan);
      toast.success("Plan generated. Check the tabs below.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid date or data");
    }
  };

  const handleSavePDF = useCallback(() => {
    if (!editedHandoff) return;
    if (!editedHandoff.emergencyContact || editedHandoff.emergencyContact === "Parent/carer to provide.") {
      toast.error("Please fill in the emergency contact before saving as PDF.");
      return;
    }

    if (plan && Object.keys(handoffEdits).length > 0) {
      const updated: PlanType = { ...plan, nurseryHandoffDoc: editedHandoff };
      saveReturnToWorkPlan(updated);
      setPlan(updated);
      onSaveToServer?.(updated);
    }

    const doc = editedHandoff;
    const lines = [
      `HANDOFF DOCUMENT`,
      `================`,
      ``,
      `Baby: ${doc.babyName}`,
      `Date of birth: ${doc.babyDob}`,
      ``,
      `ROUTINE`,
      `-------`,
      `Typical wake time: ${doc.typicalWakeTime}`,
      `Typical bedtime: ${doc.typicalBedtime}`,
      `Nap schedule: ${doc.napSchedule}`,
      ``,
      `FEEDING`,
      `-------`,
      `${doc.feedingPreferences}`,
      ``,
      `SETTLING`,
      `--------`,
      `How she settles: ${doc.settlingCues}`,
      `What to try if unsettled: ${doc.whatWorks}`,
      ``,
      `MEDICAL`,
      `-------`,
      `Allergies: ${doc.allergies}`,
      `Emergency contact: ${doc.emergencyContact}`,
      ``,
      `Generated by Cradl · ${formatDate(Date.now())}`,
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.babyName.replace(/\s+/g, "_")}_handoff.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Handoff document saved.");
  }, [editedHandoff, plan, handoffEdits, onSaveToServer]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "feeding", label: "Feeding plan" },
    { id: "sleep", label: "Sleep shift" },
    { id: "handoff", label: "Handoff doc" },
  ];

  const feedingTypeLabels: Record<string, string> = {
    breast: "Breastfeeding",
    bottle: "Formula",
    mixed: "Mixed",
  };

  const careLabels: Record<string, string> = {
    nursery: "Nursery",
    childminder: "Childminder",
    family: "Family member",
    other: "Other",
  };

  if (showOnboarding || plan == null) {
    return (
      <div className="rounded-2xl border p-4 space-y-4" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
        <h2 className="text-lg font-medium flex items-center gap-2" style={{ color: "var(--tx)" }}>
          <Briefcase className="w-5 h-5" />
          Return to work planner
        </h2>
        <p className="text-[13px]" style={{ color: "var(--mu)", fontFamily: "Georgia, serif" }}>
          Enter your details and we&rsquo;ll build a feeding transition, sleep shift, and handoff document.
        </p>

        {/* Return date dd/mm/yyyy */}
        <div>
          <label className="block text-[13px] mb-1 font-medium" style={{ color: "var(--mu)" }}>
            <Calendar className="w-3.5 h-3.5 inline mr-1" />Return date
          </label>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="dd/mm/yyyy"
            value={returnDateStr}
            onChange={(e) => {
              let v = e.target.value.replace(/[^\d/]/g, "");
              if (v.length === 2 && !v.includes("/")) v += "/";
              if (v.length === 5 && v.split("/").length === 2) v += "/";
              if (v.length <= 10) setReturnDateStr(v);
            }}
            className="rounded-lg border px-3 py-2"
            style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
          />
        </div>

        {/* Work start time */}
        <div>
          <label className="block text-[13px] mb-1 font-medium" style={{ color: "var(--mu)" }}>
            <Clock className="w-3.5 h-3.5 inline mr-1" />Work start time
          </label>
          <Input
            type="time"
            value={workStartTime}
            onChange={(e) => setWorkStartTime(e.target.value)}
            className="rounded-lg border px-3 py-2"
            style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
          />
        </div>

        {/* Feeding type pills */}
        <div>
          <label className="block text-[13px] mb-1.5 font-medium" style={{ color: "var(--mu)" }}>Feeding type</label>
          <div className="flex gap-2 flex-wrap">
            {(["breast", "bottle", "mixed"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setFeedingType(t)} style={PILL_STYLE(feedingType === t)}>
                {feedingTypeLabels[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Care arrangement pills */}
        <div>
          <label className="block text-[13px] mb-1.5 font-medium" style={{ color: "var(--mu)" }}>Care arrangement</label>
          <div className="flex gap-2 flex-wrap">
            {(["nursery", "childminder", "family", "other"] as const).map((c) => (
              <button key={c} type="button" onClick={() => setCareArrangement(c)} style={PILL_STYLE(careArrangement === c)}>
                {careLabels[c]}
              </button>
            ))}
          </div>
        </div>

        {/* Caregiver name */}
        <div>
          <label className="block text-[13px] mb-1 font-medium" style={{ color: "var(--mu)" }}>Caregiver name (optional)</label>
          <Input
            type="text"
            value={caregiverName}
            onChange={(e) => setCaregiverName(e.target.value)}
            placeholder="e.g. nursery key worker"
            className="rounded-lg border px-3 py-2"
            style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
          />
        </div>

        <Button onClick={handleGenerate} className="w-full min-h-[44px]" style={{ background: "var(--pink)", color: "white" }}>
          Generate my plan
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
      {/* Tab bar */}
      <div className="flex border-b" style={{ borderColor: "var(--bd)" }}>
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className="flex-1 py-3 px-2 text-sm font-medium"
            style={{
              color: activeTab === id ? "var(--pink)" : "var(--mu)",
              borderBottom: activeTab === id ? "2px solid var(--pink)" : "2px solid transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-4 max-h-[60vh] overflow-y-auto">
        {/* Feeding Plan Tab */}
        {activeTab === "feeding" && (
          <div className="space-y-3">
            {plan.currentFeedingType === "bottle" ? (
              <GreenNotice>
                No feeding transition needed — your baby is already bottle-fed, so the switch to nursery or childminder will feel familiar.
              </GreenNotice>
            ) : plan.feedingTransitionPlan.length === 0 ? (
              <GreenNotice>
                Your return is very soon. No structured plan can be generated, but any bottle practice you do now will help.
              </GreenNotice>
            ) : (
              <>
                <p className="text-[12px] mb-1" style={{ color: "var(--mu)" }}>
                  {plan.currentFeedingType === "mixed"
                    ? "You're already doing both breast and bottle — this plan gently shifts the balance for work days."
                    : "A gradual week-by-week plan to transition feeds before your return date."}
                </p>
                {plan.feedingTransitionPlan.map((w) => (
                  <div key={w.weekNumber} className="rounded-xl border p-3" style={{ borderColor: "var(--bd)" }}>
                    <div className="flex justify-between items-baseline">
                      <span className="text-[13px] font-semibold" style={{ color: "var(--tx)" }}>
                        {plan.currentFeedingType === "breast" && plan.feedingTransitionPlan.length < 7
                          ? `Day ${w.weekNumber}`
                          : `Week ${w.weekNumber}`}
                      </span>
                      <span className="text-[11px]" style={{ color: "var(--mu)" }}>{w.weekStartDate}</span>
                    </div>
                    <p className="text-[13px] mt-2" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>{w.guidance}</p>
                    <div className="flex gap-3 mt-2">
                      <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--pink) 10%, transparent)", color: "var(--pink)" }}>
                        {w.targetFeedsPerDay} breast
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--blue) 10%, transparent)", color: "var(--blue2)" }}>
                        {w.bottleFeeds} bottle
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Sleep Shift Tab */}
        {activeTab === "sleep" && (
          <div className="space-y-3">
            {plan.sleepScheduleShift.length === 0 ? (
              <GreenNotice>
                Your current wake time already works for your return. No schedule adjustment needed — one less thing to worry about.
              </GreenNotice>
            ) : (
              <>
                <p className="text-[12px] mb-1" style={{ color: "var(--mu)" }}>
                  Shift wake time by 10 minutes every 3 days. The visual bar shows progress toward the target.
                </p>
                {plan.sleepScheduleShift.filter((_, i) => i % 3 === 0).map((d, idx) => {
                  const totalShift = plan.sleepScheduleShift[plan.sleepScheduleShift.length - 1]?.shiftMinutes || 1;
                  const progress = Math.min(1, d.shiftMinutes / totalShift);
                  return (
                    <div key={d.date} className="rounded-xl border p-3" style={{ borderColor: "var(--bd)" }}>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-[13px] font-semibold" style={{ color: "var(--tx)" }}>Day {idx * 3 + 1}–{Math.min(idx * 3 + 3, plan.sleepScheduleShift.length)}</span>
                        <span className="text-[11px]" style={{ color: "var(--mu)" }}>{d.date}</span>
                      </div>
                      <div className="flex justify-between text-[12px] mb-2" style={{ color: "var(--tx)" }}>
                        <span>Wake {d.currentWakeTime} → {d.targetWakeTime}</span>
                        <span>Bed {d.currentBedtime} → {d.targetBedtime}</span>
                      </div>
                      <div className="w-full h-2 rounded-full" style={{ background: "var(--bd)" }}>
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.max(5, progress * 100)}%`,
                            background: "linear-gradient(90deg, var(--blue), var(--purp))",
                          }}
                        />
                      </div>
                      <div className="text-[11px] mt-1" style={{ color: "var(--mu)" }}>
                        {d.shiftMinutes}min shifted of {totalShift}min total
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* Handoff Doc Tab */}
        {activeTab === "handoff" && editedHandoff && (
          <div className="space-y-3">
            <p className="text-[12px] mb-1" style={{ color: "var(--mu)" }}>
              Tap any field to edit. Pre-filled from your logged data.
            </p>
            <HandoffField label="Baby name" value={editedHandoff.babyName} onChange={(v) => updateHandoffField("babyName", v)} />
            <HandoffField label="Date of birth" value={editedHandoff.babyDob} onChange={(v) => updateHandoffField("babyDob", v)} />
            <HandoffField label="Typical wake time" value={editedHandoff.typicalWakeTime} onChange={(v) => updateHandoffField("typicalWakeTime", v)} />
            <HandoffField label="Typical bedtime" value={editedHandoff.typicalBedtime} onChange={(v) => updateHandoffField("typicalBedtime", v)} />
            <HandoffField label="Nap schedule" value={editedHandoff.napSchedule} onChange={(v) => updateHandoffField("napSchedule", v)} multiline />
            <HandoffField label="Feeding" value={editedHandoff.feedingPreferences} onChange={(v) => updateHandoffField("feedingPreferences", v)} multiline />
            <HandoffField label="How she settles" value={editedHandoff.settlingCues} onChange={(v) => updateHandoffField("settlingCues", v)} multiline />
            <HandoffField label="What to try if unsettled" value={editedHandoff.whatWorks} onChange={(v) => updateHandoffField("whatWorks", v)} multiline />
            <HandoffField label="Allergies" value={editedHandoff.allergies} onChange={(v) => updateHandoffField("allergies", v)} />
            <HandoffField
              label="Emergency contact"
              value={editedHandoff.emergencyContact}
              onChange={(v) => updateHandoffField("emergencyContact", v)}
              required
            />

            <Button onClick={handleSavePDF} className="w-full min-h-[44px] flex items-center justify-center gap-2" style={{ background: "var(--pink)", color: "white" }}>
              <Download className="w-4 h-4" />
              Save as PDF
            </Button>
          </div>
        )}
      </div>

      <div className="p-3 border-t" style={{ borderColor: "var(--bd)" }}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setPlan(null); setHandoffEdits({}); }}
          className="w-full"
          style={{ borderColor: "var(--bd)", color: "var(--tx)" }}
        >
          Create new plan
        </Button>
      </div>
    </div>
  );
}

function HandoffField({
  label,
  value,
  onChange,
  multiline,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  required?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    onChange(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="rounded-lg border p-2" style={{ borderColor: "var(--pink)", background: "var(--bg2)" }}>
        <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--mu)" }}>
          {label}{required && <span style={{ color: "var(--pink)" }}> *</span>}
        </label>
        {multiline ? (
          <textarea
            className="w-full text-[13px] rounded border px-2 py-1 resize-none"
            style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)", minHeight: 60 }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            autoFocus
          />
        ) : (
          <input
            className="w-full text-[13px] rounded border px-2 py-1"
            style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
            autoFocus
          />
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border p-2 cursor-pointer"
      style={{ borderColor: "var(--bd)" }}
      onClick={() => { setDraft(value); setEditing(true); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") { setDraft(value); setEditing(true); } }}
    >
      <div className="text-[11px] font-semibold" style={{ color: "var(--mu)" }}>
        {label}{required && <span style={{ color: "var(--pink)" }}> *</span>}
      </div>
      <div className="text-[13px] mt-0.5" style={{ color: "var(--tx)" }}>{value || "—"}</div>
    </div>
  );
}

/** Card showing today's countdown message when return is within 7 days. */
export function ReturnToWorkCountdownCard({
  plan,
  onDismiss,
  dismissKey,
}: {
  plan: PlanType | null;
  onDismiss?: () => void;
  dismissKey?: string;
}) {
  const message = useMemo(() => getCountdownMessageForToday(plan), [plan]);
  const show = isReturnWithinSevenDays(plan) && message != null;
  if (!show) return null;

  const dismissed = dismissKey ? (() => {
    try {
      const raw = localStorage.getItem(dismissKey);
      return raw === new Date().toISOString().slice(0, 10);
    } catch { return false; }
  })() : false;
  if (dismissKey && dismissed) return null;

  const handleDismiss = () => {
    if (dismissKey) {
      try { localStorage.setItem(dismissKey, new Date().toISOString().slice(0, 10)); } catch {}
    }
    onDismiss?.();
  };

  const daysLeft = (() => {
    if (!plan) return null;
    const rd = new Date(plan.returnDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    rd.setHours(0, 0, 0, 0);
    return Math.round((rd.getTime() - today.getTime()) / 86400000);
  })();

  return (
    <div className="rounded-2xl border p-4 mb-3" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
      <div className="flex items-start gap-2">
        <Briefcase className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--pink)" }} />
        <div>
          <p className="text-[14px] font-medium" style={{ color: "var(--tx)" }}>
            {daysLeft === 0 ? "Return to work — today" : `Return to work in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}
          </p>
          <p className="text-[13px] mt-1" style={{ color: "var(--mu)", fontFamily: "Georgia, serif" }}>{message}</p>
          {dismissKey && (
            <button type="button" onClick={handleDismiss} className="text-[12px] mt-2" style={{ color: "var(--mu)" }}>Dismiss for today</button>
          )}
        </div>
      </div>
    </div>
  );
}
