/**
 * First-launch onboarding: 6 steps (Welcome, ValueProp, BabySetup, ParentSetup, Account, Permissions).
 */

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, Moon, Star } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useBaby } from "../contexts/BabyContext";
import {
  getOnboardingStep,
  saveOnboardingStep,
  markOnboardingComplete,
  clearOnboardingStep,
} from "../utils/onboardingStorage";
import { requestNotificationPermission } from "../utils/notifications";
import { compressBabyPhoto } from "../utils/imageCompress";

const BABY_ICONS = ["👶", "🌸", "🌙", "⭐", "🐣", "🦋", "❤️", "🌈", "🐻"];
const VALUE_CARDS = [
  { title: "Track feeds, sleep & more", body: "One place for your baby's day." },
  { title: "Built for your family", body: "Simple, private, and there when you need it." },
  { title: "You've got this", body: "Cradl helps you spot patterns and stay calm." },
];

interface OnboardingNavigatorProps {
  onComplete: () => void;
}

export function OnboardingNavigator({ onComplete }: OnboardingNavigatorProps) {
  const { addBaby, setActiveBabyId, updateActiveBaby } = useBaby();
  const [step, setStep] = useState(getOnboardingStep());
  const [fade, setFade] = useState<"in" | "out">("in");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("00:00");
  const [iconIndex, setIconIndex] = useState(0);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [parentName, setParentName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [valueCardIndex, setValueCardIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveOnboardingStep(step);
  }, [step]);

  const go = (next: number, callback?: () => void) => {
    setFade("out");
    setTimeout(() => {
      if (callback) callback();
      setStep(next);
      setFade("in");
    }, 280);
  };

  // Step 0: Welcome — 1.5s auto-advance
  useEffect(() => {
    if (step !== 0) return;
    const t = setTimeout(() => go(1), 1500);
    return () => clearTimeout(t);
  }, [step]);

  // Step 1: ValueProp — 3s auto-advance to next card (or stay on last)
  useEffect(() => {
    if (step !== 1) return;
    const t = setInterval(() => {
      setValueCardIndex((i) => Math.min(2, i + 1));
    }, 3000);
    return () => clearInterval(t);
  }, [step]);

  const handleStep2Next = () => {
    if (!birthDate.trim()) return;
    const birthMs = new Date(`${birthDate}T${birthTime}:00`).getTime();
    const baby = addBaby({
      name: name.trim() || "Baby",
      birthDate: birthMs,
      icon: photoDataUrl ? undefined : BABY_ICONS[iconIndex],
      photoDataUrl: photoDataUrl ?? undefined,
    });
    setActiveBabyId(baby.id);
    go(3);
  };

  const handleStep3Next = () => {
    const trimmed = parentName.trim().slice(0, 40);
    if (trimmed) updateActiveBaby({ parentName: trimmed });
    go(4);
  };

  const handleStep5Complete = async () => {
    try {
      await requestNotificationPermission();
    } catch {}
    clearOnboardingStep();
    markOnboardingComplete();
    onComplete();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressBabyPhoto(file);
      setPhotoDataUrl(dataUrl);
    } catch {
      setPhotoDataUrl(URL.createObjectURL(file));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const birthMs = birthDate ? new Date(`${birthDate}T${birthTime}:00`).getTime() : 0;
  const isPregnancyMode = birthDate && birthMs > Date.now() && (birthMs - Date.now()) / (7 * 24 * 60 * 60 * 1000) > 2;
  const ageYears = birthDate && birthMs < Date.now() ? (Date.now() - birthMs) / (365.25 * 24 * 60 * 60 * 1000) : 0;
  const ageWarning = ageYears > 3;

  return (
    <div
      className="min-h-screen flex flex-col bg-[var(--bg)] transition-opacity duration-300 relative"
      style={{ opacity: fade === "in" ? 1 : 0 }}
    >
      {/* Progress dots */}
      <div className="flex justify-center gap-2 pt-6 pb-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{
              background: i === step ? "var(--pink)" : "var(--bd)",
              opacity: i <= step ? 1 : 0.4,
            }}
            aria-hidden
          />
        ))}
      </div>

      {/* Back button where applicable */}
      {step >= 2 && step <= 5 && (
        <button
          type="button"
          onClick={() => go(step - 1)}
          className="absolute left-4 top-6 p-2 rounded-full border"
          style={{ borderColor: "var(--bd)", color: "var(--tx)" }}
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center justify-center gap-2 mb-6" aria-hidden>
              <Moon className="w-10 h-10" style={{ color: "var(--purp)" }} />
              <Star className="w-8 h-8" style={{ color: "var(--pink)" }} />
            </div>
            <h1 className="text-2xl font-serif" style={{ color: "var(--tx)" }}>
              Welcome to Cradl
            </h1>
          </div>
        )}

        {/* Step 1: ValueProp */}
        {step === 1 && (
          <div className="w-full max-w-sm text-center">
            <div className="min-h-[140px] flex flex-col justify-center">
              {VALUE_CARDS.map((card, i) => (
                <div
                  key={card.title}
                  className={i === valueCardIndex ? "block" : "hidden"}
                >
                  <h2 className="text-xl font-serif mb-2" style={{ color: "var(--tx)" }}>
                    {card.title}
                  </h2>
                  <p className="text-[15px]" style={{ color: "var(--mu)" }}>
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
            <Button
              type="button"
              onClick={() => go(2)}
              className="mt-6 min-h-[48px] px-8"
            >
              Get started
            </Button>
          </div>
        )}

        {/* Step 2: BabySetup */}
        {step === 2 && (
          <div className="w-full max-w-sm flex flex-col items-center text-center">
            <h2 className="text-xl font-serif mb-2" style={{ color: "var(--tx)" }}>
              Add your baby
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--mu)" }}>
              Name is optional. Birth date is required.
            </p>
            <Input
              type="text"
              placeholder="Baby's name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mb-4 max-w-[280px]"
              aria-label="Baby's name"
            />
            <div className="flex gap-2 w-full max-w-[280px] mb-2">
              <Input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                aria-label="Birth date"
              />
              <Input
                type="time"
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
                aria-label="Birth time"
              />
            </div>
            {isPregnancyMode && (
              <p className="text-sm mb-2" style={{ color: "var(--mu)" }}>
                Due in more than 2 weeks — you can still add and track once baby arrives.
              </p>
            )}
            {ageWarning && (
              <p className="text-sm mb-2" style={{ color: "var(--ro)" }}>
                Baby is over 3 years — Cradl is aimed at 0–24 months.
              </p>
            )}
            <div className="flex items-center gap-2 my-4">
              <button
                type="button"
                onClick={() => setIconIndex((i) => (i - 1 + BABY_ICONS.length) % BABY_ICONS.length)}
                className="p-2 rounded-full border"
                style={{ borderColor: "var(--bd)", background: "var(--card)" }}
                aria-label="Previous icon"
              >
                <ChevronLeft className="w-5 h-5" style={{ color: "var(--tx)" }} />
              </button>
              <div
                className="w-16 h-16 rounded-full border-2 flex items-center justify-center overflow-hidden text-3xl"
                style={{ borderColor: "var(--pink)", background: "var(--card)" }}
              >
                {photoDataUrl ? (
                  <img src={photoDataUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{BABY_ICONS[iconIndex]}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIconIndex((i) => (i + 1) % BABY_ICONS.length)}
                className="p-2 rounded-full border"
                style={{ borderColor: "var(--bd)", background: "var(--card)" }}
                aria-label="Next icon"
              >
                <ChevronLeft className="w-5 h-5 rotate-180" style={{ color: "var(--tx)" }} />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mb-4"
            >
              {uploading ? "Uploading…" : "Upload photo"}
            </Button>
            <Button
              type="button"
              onClick={handleStep2Next}
              disabled={!birthDate.trim()}
              className="min-h-[48px] px-8"
            >
              Next
            </Button>
          </div>
        )}

        {/* Step 3: ParentSetup */}
        {step === 3 && (
          <div className="w-full max-w-sm flex flex-col items-center text-center">
            <h2 className="text-xl font-serif mb-2" style={{ color: "var(--tx)" }}>
              And what&apos;s your name?
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--mu)" }}>
              We&apos;ll use this to talk to you as a person, not just as a parent.
            </p>
            <Input
              type="text"
              placeholder="Your first name"
              value={parentName}
              onChange={(e) => setParentName(e.target.value.slice(0, 40))}
              className="mb-4 max-w-[280px]"
              maxLength={40}
              aria-label="Your first name"
            />
            <Button type="button" onClick={handleStep3Next} className="min-h-[48px] px-8 mb-2">
              Continue
            </Button>
            <button
              type="button"
              onClick={() => go(4)}
              className="text-sm underline"
              style={{ color: "var(--mu)" }}
            >
              Skip
            </button>
          </div>
        )}

        {/* Step 4: Account */}
        {step === 4 && (
          <div className="w-full max-w-sm flex flex-col items-center text-center">
            <h2 className="text-xl font-serif mb-2" style={{ color: "var(--tx)" }}>
              Sign in to sync across devices
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--mu)" }}>
              Optional. You can use Cradl offline and sign in later from Settings.
            </p>
            <Button type="button" onClick={() => go(5)} className="min-h-[48px] px-8 mb-2">
              Continue
            </Button>
            <button
              type="button"
              onClick={() => go(5)}
              className="text-sm underline"
              style={{ color: "var(--mu)" }}
            >
              Skip
            </button>
          </div>
        )}

        {/* Step 5: Permissions */}
        {step === 5 && (
          <div className="w-full max-w-sm flex flex-col items-center text-center">
            <h2 className="text-xl font-serif mb-2" style={{ color: "var(--tx)" }}>
              Almost there
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--mu)" }}>
              Allow notifications for feeding reminders and medication alerts. You can change this in Settings.
            </p>
            <Button
              type="button"
              onClick={handleStep5Complete}
              className="min-h-[48px] px-8"
            >
              Go to Cradl
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
