/**
 * Return to work planner: onboarding form → Feeding plan | Sleep shift | Handoff doc tabs.
 */

import { useState, useMemo } from "react";
import { generateReturnPlan, getCountdownMessageForToday, isReturnWithinSevenDays } from "../utils/returnToWorkGenerator";
import { saveReturnToWorkPlan, getReturnToWorkPlan } from "../utils/returnToWorkStorage";
import type { ReturnToWorkPlan as PlanType } from "../types/returnToWork";
import type { FeedingRecord } from "../types";
import type { SleepRecord } from "../types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { Briefcase, Calendar, Clock } from "lucide-react";

export interface ReturnToWorkPlannerProps {
  feedingHistory: FeedingRecord[];
  sleepHistory: SleepRecord[];
  babyProfile: { birthDate?: number | string; name?: string } | null;
  onPlanSaved?: (plan: PlanType) => void;
  /** If true, persist to server (e.g. saveData). */
  onSaveToServer?: (plan: PlanType) => void;
}

type Tab = "feeding" | "sleep" | "handoff";

export function ReturnToWorkPlanner({
  feedingHistory,
  sleepHistory,
  babyProfile,
  onPlanSaved,
  onSaveToServer,
}: ReturnToWorkPlannerProps) {
  const existing = getReturnToWorkPlan();
  const [returnDate, setReturnDate] = useState(existing?.returnDate?.slice(0, 10) ?? "");
  const [workStartTime, setWorkStartTime] = useState(existing?.workStartTime ?? "09:00");
  const [feedingType, setFeedingType] = useState<"breast" | "bottle" | "mixed">(existing?.currentFeedingType ?? "breast");
  const [careArrangement, setCareArrangement] = useState<"nursery" | "childminder" | "family" | "other">(existing?.babyWillBe ?? "nursery");
  const [caregiverName, setCaregiverName] = useState(existing?.caregiverName ?? "");
  const [allergies, setAllergies] = useState(existing?.nurseryHandoffDoc?.allergies ?? "");
  const [emergencyContact, setEmergencyContact] = useState(existing?.nurseryHandoffDoc?.emergencyContact ?? "");
  const [plan, setPlan] = useState<PlanType | null>(existing);
  const [activeTab, setActiveTab] = useState<Tab>("feeding");

  const handleGenerate = () => {
    if (!returnDate.trim()) {
      toast.error("Please enter your return date.");
      return;
    }
    try {
      const newPlan = generateReturnPlan({
        returnDate: returnDate.trim(),
        workStartTime,
        feedingHistory,
        sleepHistory,
        babyProfile,
        currentFeedingType: feedingType,
        babyWillBe: careArrangement,
        caregiverName: caregiverName.trim() || null,
        allergies: allergies.trim() || "None known.",
        emergencyContact: emergencyContact.trim() || "Parent/carer to provide.",
      });
      setPlan(newPlan);
      saveReturnToWorkPlan(newPlan);
      onPlanSaved?.(newPlan);
      onSaveToServer?.(newPlan);
      toast.success("Plan generated. Check the tabs below.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid date or data");
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "feeding", label: "Feeding plan" },
    { id: "sleep", label: "Sleep shift" },
    { id: "handoff", label: "Handoff doc" },
  ];

  if (plan == null) {
    return (
      <div className="rounded-2xl border p-4 space-y-4" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
        <h2 className="text-lg font-medium flex items-center gap-2" style={{ color: "var(--tx)" }}>
          <Briefcase className="w-5 h-5" />
          Return to work planner
        </h2>
        <p className="text-[13px]" style={{ color: "var(--mu)" }}>
          Enter your return date and we&apos;ll build a feeding transition, sleep shift, and handoff document for your nursery or childminder.
        </p>
        <div>
          <label className="block text-[13px] mb-1" style={{ color: "var(--mu)" }}>Return date</label>
          <Input
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            className="rounded-lg border px-3 py-2"
            style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
          />
        </div>
        <div>
          <label className="block text-[13px] mb-1" style={{ color: "var(--mu)" }}>Work start time</label>
          <Input
            type="time"
            value={workStartTime}
            onChange={(e) => setWorkStartTime(e.target.value)}
            className="rounded-lg border px-3 py-2"
            style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
          />
        </div>
        <div>
          <label className="block text-[13px] mb-1" style={{ color: "var(--mu)" }}>Feeding type</label>
          <div className="flex gap-2 flex-wrap">
            {(["breast", "bottle", "mixed"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFeedingType(t)}
                className="py-2 px-3 rounded-lg border text-sm capitalize"
                style={{
                  borderColor: feedingType === t ? "var(--pink)" : "var(--bd)",
                  background: feedingType === t ? "color-mix(in srgb, var(--pink) 15%, transparent)" : "var(--card)",
                  color: "var(--tx)",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[13px] mb-1" style={{ color: "var(--mu)" }}>Care arrangement</label>
          <div className="flex gap-2 flex-wrap">
            {(["nursery", "childminder", "family", "other"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCareArrangement(c)}
                className="py-2 px-3 rounded-lg border text-sm capitalize"
                style={{
                  borderColor: careArrangement === c ? "var(--pink)" : "var(--bd)",
                  background: careArrangement === c ? "color-mix(in srgb, var(--pink) 15%, transparent)" : "var(--card)",
                  color: "var(--tx)",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[13px] mb-1" style={{ color: "var(--mu)" }}>Caregiver name (optional)</label>
          <Input
            type="text"
            value={caregiverName}
            onChange={(e) => setCaregiverName(e.target.value)}
            placeholder="e.g. nursery key worker"
            className="rounded-lg border px-3 py-2"
            style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
          />
        </div>
        <div>
          <label className="block text-[13px] mb-1" style={{ color: "var(--mu)" }}>Allergies (for handoff)</label>
          <Input
            type="text"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            placeholder="None known"
            className="rounded-lg border px-3 py-2"
            style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
          />
        </div>
        <div>
          <label className="block text-[13px] mb-1" style={{ color: "var(--mu)" }}>Emergency contact (for handoff)</label>
          <Input
            type="text"
            value={emergencyContact}
            onChange={(e) => setEmergencyContact(e.target.value)}
            placeholder="Parent/carer to provide"
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
        {activeTab === "feeding" && (
          <div className="space-y-3">
            {plan.feedingTransitionPlan.length === 0 ? (
              <p className="text-[13px]" style={{ color: "var(--mu)" }}>No feeding transition needed (e.g. already bottle-fed or return is soon).</p>
            ) : (
              plan.feedingTransitionPlan.map((w) => (
                <div key={w.weekNumber} className="rounded-lg border p-3" style={{ borderColor: "var(--bd)" }}>
                  <div className="text-[13px] font-medium" style={{ color: "var(--tx)" }}>Week {w.weekNumber}</div>
                  <div className="text-[12px] mt-1" style={{ color: "var(--mu)" }}>{w.weekStartDate}</div>
                  <p className="text-[13px] mt-2" style={{ color: "var(--tx)" }}>{w.guidance}</p>
                  <div className="text-[12px] mt-1" style={{ color: "var(--mu)" }}>Target: {w.targetFeedsPerDay} feeds/day, {w.bottleFeeds} bottle(s)</div>
                </div>
              ))
            )}
          </div>
        )}
        {activeTab === "sleep" && (
          <div className="space-y-3">
            {plan.sleepScheduleShift.length === 0 ? (
              <p className="text-[13px]" style={{ color: "var(--mu)" }}>Your current schedule already works for your return date. No shift needed.</p>
            ) : (
              plan.sleepScheduleShift.slice(0, 7).map((d) => (
                <div key={d.date} className="rounded-lg border p-2 text-[12px]" style={{ borderColor: "var(--bd)", color: "var(--tx)" }}>
                  <strong>{d.date}</strong>: Wake {d.currentWakeTime} → {d.targetWakeTime}, Bed {d.currentBedtime} → {d.targetBedtime}
                </div>
              ))
            )}
          </div>
        )}
        {activeTab === "handoff" && (
          <div className="space-y-2 text-[13px]">
            <p><strong>Baby:</strong> {plan.nurseryHandoffDoc.babyName}</p>
            <p><strong>DOB:</strong> {plan.nurseryHandoffDoc.babyDob}</p>
            <p><strong>Typical wake:</strong> {plan.nurseryHandoffDoc.typicalWakeTime}</p>
            <p><strong>Typical bedtime:</strong> {plan.nurseryHandoffDoc.typicalBedtime}</p>
            <p><strong>Nap schedule:</strong> {plan.nurseryHandoffDoc.napSchedule}</p>
            <p><strong>Feeding:</strong> {plan.nurseryHandoffDoc.feedingPreferences}</p>
            <p><strong>Settling:</strong> {plan.nurseryHandoffDoc.settlingCues}</p>
            <p><strong>What works:</strong> {plan.nurseryHandoffDoc.whatWorks}</p>
            <p><strong>Allergies:</strong> {plan.nurseryHandoffDoc.allergies}</p>
            <p><strong>Emergency contact:</strong> {plan.nurseryHandoffDoc.emergencyContact}</p>
          </div>
        )}
      </div>
      <div className="p-3 border-t" style={{ borderColor: "var(--bd)" }}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setPlan(null); }}
          className="w-full"
          style={{ borderColor: "var(--bd)", color: "var(--tx)" }}
        >
          Create new plan
        </Button>
      </div>
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

  return (
    <div className="rounded-2xl border p-4 mb-3" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
      <div className="flex items-start gap-2">
        <Briefcase className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--pink)" }} />
        <div>
          <p className="text-[14px] font-medium" style={{ color: "var(--tx)" }}>Return to work in {plan!.returnDate}</p>
          <p className="text-[13px] mt-1" style={{ color: "var(--mu)", fontFamily: "Georgia, serif" }}>{message}</p>
          {dismissKey && (
            <button type="button" onClick={handleDismiss} className="text-[12px] mt-2" style={{ color: "var(--mu)" }}>Dismiss for today</button>
          )}
        </div>
      </div>
    </div>
  );
}
