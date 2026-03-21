/**
 * Add a jaundice skin check: light checklist, colour selection, feeds count.
 * On save shows assessment alert; urgent/call_midwife: local health advice line CTA, min 3s before dismiss.
 */

import { useState, useEffect } from "react";
import { X, Phone } from "lucide-react";
import type { JaundiceSkinCheck, JaundiceColour } from "../types/jaundice";
import { JAUNDICE_COLOUR_OPTIONS } from "../data/jaundiceColours";
import { saveJaundiceCheck } from "../utils/jaundiceStorage";
import { assessJaundice, getJaundiceAgeDays } from "../utils/jaundiceAssessment";
import { useBaby } from "../contexts/BabyContext";

const MIN_URGENT_DISMISS_MS = 3000;

export function AddJaundiceCheckSheet({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { babyProfile } = useBaby();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [lightOk, setLightOk] = useState(false);
  const [colour, setColour] = useState<JaundiceColour | null>(null);
  const [feedsLast24h, setFeedsLast24h] = useState(8);
  const [saved, setSaved] = useState(false);
  const [alert, setAlert] = useState<ReturnType<typeof assessJaundice> | null>(null);
  const [urgentDismissAt, setUrgentDismissAt] = useState<number | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!alert?.showDialler) return;
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, [alert?.showDialler]);

  const dob = babyProfile?.birthDate != null ? (typeof babyProfile.birthDate === "number" ? babyProfile.birthDate : new Date(babyProfile.birthDate).getTime()) : null;
  const ageDays = getJaundiceAgeDays(dob);
  const ageHours = dob != null ? (Date.now() - dob) / (60 * 60 * 1000) : 0;

  useEffect(() => {
    if (alert?.showDialler && urgentDismissAt === null) {
      setUrgentDismissAt(Date.now() + MIN_URGENT_DISMISS_MS);
    }
  }, [alert?.showDialler, urgentDismissAt]);

  const canDismiss = !alert?.showDialler || (urgentDismissAt != null && Date.now() >= urgentDismissAt);

  const handleSave = () => {
    if (step < 3) {
      if (step === 1 && !lightOk) return;
      if (step === 2 && colour === null) return;
      setStep((s) => (s + 1) as 1 | 2 | 3);
      return;
    }

    if (colour === null) return;
    const areas = JAUNDICE_COLOUR_OPTIONS.find((o) => o.id === colour)?.areas ?? [];
    const today = new Date().toISOString().slice(0, 10);
    const check: Omit<JaundiceSkinCheck, "id"> = {
      date: today,
      time: new Date().toTimeString().slice(0, 5),
      colour,
      areas,
      feedsLast24h,
    };
    const entry = saveJaundiceCheck(check);
    setSaved(true);
    const result = assessJaundice(entry, ageHours);
    setAlert(result);
    onSaved?.();
  };

  if (alert) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)]" role="alertdialog" aria-labelledby="jaundice-alert-title">
        <div className="p-4 border-b" style={{ borderColor: "var(--bd)" }}>
          <h2 id="jaundice-alert-title" className="text-lg font-semibold" style={{ color: "var(--tx)" }}>
            {alert.level === "none" ? "Check recorded" : alert.level === "urgent" ? "Seek advice" : "Assessment"}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {alert.daylightWarning && (
            <p className="text-[13px] rounded-lg p-3" style={{ background: "var(--card)", color: "var(--mu)" }}>
              Always check in good natural daylight — artificial light can make it hard to see yellowing.
            </p>
          )}
          <p className="text-[14px]" style={{ color: "var(--tx)" }}>
            {alert.message}
          </p>
          {alert.showDialler && (
            <a
              href="tel:111"
              className="inline-flex items-center gap-2 py-3 px-4 rounded-xl font-medium text-white"
              style={{ background: "var(--ro)" }}
            >
              <Phone className="w-5 h-5" aria-hidden />
              Call your local health advice line
            </a>
          )}
        </div>
        <div className="p-4 border-t" style={{ borderColor: "var(--bd)" }}>
          <button
            type="button"
            onClick={() => canDismiss && onClose()}
            disabled={!canDismiss}
            className="w-full py-3 rounded-xl font-medium"
            style={{
              background: canDismiss ? "var(--pink)" : "var(--card)",
              color: canDismiss ? "white" : "var(--mu)",
            }}
          >
            {canDismiss ? "Done" : `Please read the message above (${Math.max(0, Math.ceil(((urgentDismissAt ?? 0) - Date.now()) / 1000))}s)`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)]" role="dialog" aria-label="Add jaundice skin check">
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--bd)" }}>
        <h2 className="text-lg font-medium" style={{ color: "var(--tx)" }}>
          Skin check — step {step} of 3
        </h2>
        <button type="button" onClick={onClose} className="p-2 rounded-lg" style={{ color: "var(--mu)" }} aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-[14px]" style={{ color: "var(--tx)" }}>
              Check your baby&apos;s skin in good natural daylight (not under yellow or dim light).
            </p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={lightOk}
                onChange={(e) => setLightOk(e.target.checked)}
                className="w-5 h-5 rounded"
              />
              <span className="text-[14px]" style={{ color: "var(--tx)" }}>
                I&apos;m checking in good natural light
              </span>
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-[14px]" style={{ color: "var(--tx)" }}>
              What&apos;s the most yellow you see? (Press the area that matches.)
            </p>
            <div className="grid gap-2">
              {JAUNDICE_COLOUR_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setColour(opt.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left ${colour === opt.id ? "ring-2 ring-[var(--pink)]" : ""}`}
                  style={{
                    background: "var(--card)",
                    borderColor: colour === opt.id ? "var(--pink)" : "var(--bd)",
                    color: "var(--tx)",
                  }}
                >
                  <div className="w-10 h-10 rounded-lg flex-shrink-0 border" style={{ background: opt.hex, borderColor: "var(--bd)" }} />
                  <span className="text-[14px] font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-[14px]" style={{ color: "var(--tx)" }}>
              How many feeds in the last 24 hours?
            </p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setFeedsLast24h((n) => Math.max(0, n - 1))}
                className="w-12 h-12 rounded-full border flex items-center justify-center text-xl"
                style={{ borderColor: "var(--bd)", color: "var(--tx)" }}
                aria-label="Decrease feeds"
              >
                −
              </button>
              <span className="text-2xl font-semibold min-w-[3rem] text-center" style={{ color: "var(--tx)" }}>
                {feedsLast24h}
              </span>
              <button
                type="button"
                onClick={() => setFeedsLast24h((n) => n + 1)}
                className="w-12 h-12 rounded-full border flex items-center justify-center text-xl"
                style={{ borderColor: "var(--bd)", color: "var(--tx)" }}
                aria-label="Increase feeds"
              >
                +
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t" style={{ borderColor: "var(--bd)" }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={(step === 1 && !lightOk) || (step === 2 && colour === null)}
          className="w-full py-3 rounded-xl font-medium text-white disabled:opacity-50"
          style={{ background: "var(--pink)" }}
        >
          {step < 3 ? "Next" : "Save check"}
        </button>
      </div>
    </div>
  );
}
