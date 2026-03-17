import { useState, useRef } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight, Upload } from "lucide-react";
import { compressBabyPhoto } from "../utils/imageCompress";
import type { Baby } from "../data/babiesStorage";

const BABY_ICONS = ["👶", "🧒", "🌸", "🌙", "⭐", "🐣", "🦋", "🍀", "🌻", "❤️", "🌈", "🐻"];

interface OnboardingFlowProps {
  onComplete: (baby: Omit<Baby, "id">) => void;
  /** When true, used from Settings to add another baby (same UI, different caption if needed) */
  isAddingAnother?: boolean;
}

export function OnboardingFlow({ onComplete, isAddingAnother }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [fade, setFade] = useState<"in" | "out">("in");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("00:00");
  const [iconIndex, setIconIndex] = useState(0);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const goNext = (callback?: () => void) => {
    setFade("out");
    setTimeout(() => {
      if (callback) callback();
      else setStep((s) => s + 1);
      setFade("in");
    }, 280);
  };

  const handleStep0Next = () => {
    if (!name.trim()) return;
    goNext();
  };

  const handleStep1Next = () => {
    if (!birthDate.trim()) return;
    goNext();
  };

  const handleComplete = () => {
    const birthMs = birthDate
      ? new Date(`${birthDate}T${birthTime}:00`).getTime()
      : Date.now();
    onComplete({
      name: name.trim(),
      birthDate: birthMs,
      icon: photoDataUrl ? undefined : BABY_ICONS[iconIndex],
      photoDataUrl: photoDataUrl ?? undefined,
    });
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

  const content = (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 transition-opacity duration-300"
      style={{
        background: "var(--bg)",
        opacity: fade === "in" ? 1 : 0,
      }}
    >
      {step === 0 && (
        <div className="w-full max-w-sm flex flex-col items-center text-center">
          <h1
            className="text-2xl md:text-3xl font-serif mb-6"
            style={{ color: "var(--tx)" }}
          >
            Welcome to the world
          </h1>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStep0Next()}
            placeholder="Baby's name"
            className="w-full max-w-[280px] text-xl py-4 px-4 rounded-2xl border text-center focus:outline-none focus:ring-2"
            style={{
              borderColor: "var(--bd)",
              background: "var(--card)",
              color: "var(--tx)",
            }}
            autoFocus
            aria-label="Baby's name"
          />
          <Button
            type="button"
            onClick={handleStep0Next}
            disabled={!name.trim()}
            className="mt-8 min-h-[48px] px-8 text-base"
          >
            Next
          </Button>
        </div>
      )}

      {step === 1 && (
        <div className="w-full max-w-sm flex flex-col items-center text-center">
          <h1
            className="text-2xl md:text-3xl font-serif mb-2"
            style={{ color: "var(--tx)" }}
          >
            You came into our lives on
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--mu)" }}>
            Pick date and time
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-[280px]">
            <Input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="text-base py-4 flex-1"
              aria-label="Birth date"
            />
            <Input
              type="time"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              className="text-base py-4 flex-1"
              aria-label="Birth time"
            />
          </div>
          <Button
            type="button"
            onClick={handleStep1Next}
            disabled={!birthDate.trim()}
            className="mt-8 min-h-[48px] px-8 text-base"
          >
            Next
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="w-full max-w-sm flex flex-col items-center text-center">
          <p
            className="text-base mb-4 px-2"
            style={{ color: "var(--mu)" }}
          >
            Swipe to the right or press the arrows to select an icon for your baby, or press Upload to use an image from your device.
          </p>
          <div className="flex items-center gap-4 my-6">
            <button
              type="button"
              onClick={() => setIconIndex((i) => (i - 1 + BABY_ICONS.length) % BABY_ICONS.length)}
              className="p-2 rounded-full border"
              style={{ borderColor: "var(--bd)", background: "var(--card)" }}
              aria-label="Previous icon"
            >
              <ChevronLeft className="w-6 h-6" style={{ color: "var(--tx)" }} />
            </button>
            <div
              className="w-24 h-24 rounded-full border-2 flex items-center justify-center overflow-hidden text-5xl"
              style={{ borderColor: "var(--ro)", background: "var(--card)" }}
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
              <ChevronRight className="w-6 h-6" style={{ color: "var(--tx)" }} />
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
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? "Uploading…" : "Upload photo"}
          </Button>
          {photoDataUrl && (
            <button
              type="button"
              onClick={() => setPhotoDataUrl(null)}
              className="text-sm underline mb-4"
              style={{ color: "var(--mu)" }}
            >
              Remove photo, use icon
            </button>
          )}
          <Button
            type="button"
            onClick={handleComplete}
            className="min-h-[48px] px-8 text-base"
          >
            {isAddingAnother ? "Add baby" : "Done"}
          </Button>
        </div>
      )}
    </div>
  );

  return content;
}
