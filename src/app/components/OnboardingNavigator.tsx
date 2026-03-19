/**
 * First-launch onboarding: 7 steps (0-6)
 * (Welcome, Why Cradl, Preferences, Baby Setup, Your Name, Quick Tour, All Set).
 */

import { useState, useEffect, useRef } from "react";
import { useBaby } from "../contexts/BabyContext";
import {
  getOnboardingStep,
  saveOnboardingStep,
  markOnboardingComplete,
  clearOnboardingStep,
} from "../utils/onboardingStorage";
import { compressBabyPhoto } from "../utils/imageCompress";
import {
  getDateFormatPref,
  setDateFormatPref,
  getTimeFormatPref,
  setTimeFormatPref,
  type DateFormatPref,
  type TimeFormatPref,
} from "../utils/formatPreferencesStorage";
import { useLanguage } from "../contexts/LanguageContext";
import { LOCALE_LABELS, type SupportedLocale } from "../utils/languageStorage";

interface OnboardingNavigatorProps {
  onComplete: () => void;
}

const svgProps = (color: string) => ({
  width: 16, height: 16, viewBox: "0 0 24 24", fill: "none",
  stroke: color, strokeWidth: "1.6", strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
});

const IconCry = ({ color = "#c05030" }) => (
  <svg {...svgProps(color)}>
    <circle cx="12" cy="12" r="10" />
    <path d="M8 15s1.5-2 4-2 4 2 4 2" />
    <path d="M9 9.5v.5M15 9.5v.5" />
    <path d="M8 10c-.5 1-1.5 2-1.5 2M16 10c.5 1 1.5 2 1.5 2" />
  </svg>
);

const IconMoon = ({ color = "#4a8a4a" }) => (
  <svg {...svgProps(color)}>
    <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
  </svg>
);

const IconHeartSmall = ({ color = "#7a4ab4" }) => (
  <svg {...svgProps(color)}>
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
  </svg>
);

const IconBaby = ({ color = "#9a8080" }) => (
  <svg {...svgProps(color)}>
    <path d="M9 12h.01M15 12h.01" />
    <path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" />
    <circle cx="12" cy="12" r="10" />
  </svg>
);


const VALUE_PROPS = [
  {
    icon: <IconCry />,
    bg: "#feeae4",
    title: "Why they're crying",
    body: "Pattern-matched to your baby's age and time of day",
  },
  {
    icon: <IconMoon />,
    bg: "#e4f4e4",
    title: "Nap predictions",
    body: "Know when the next sleep window opens",
  },
  {
    icon: <IconHeartSmall />,
    bg: "#f0eafe",
    title: "You matter too",
    body: "Mum wellbeing check-ins built right in",
  },
];

const IconLog = ({ color = "#d4604a" }) => (
  <svg {...svgProps(color)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const IconChart = ({ color = "#4a8ab4" }) => (
  <svg {...svgProps(color)}>
    <path d="M3 3v18h18" />
    <path d="M7 16l4-4 4 2 5-6" />
  </svg>
);
const IconNight = ({ color = "#7a60b0" }) => (
  <svg {...svgProps(color)}>
    <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
  </svg>
);

const TOUR_CARDS = [
  {
    icon: <IconLog color="#d4604a" />,
    bg: "#feeae4",
    title: "Tap to log",
    desc: "Feeds, naps, nappies — one tap from the home screen. The app learns your routine.",
  },
  {
    icon: <IconCry color="#c05030" />,
    bg: "#fef5ee",
    title: "\"Why is she crying?\"",
    desc: "Cradl cross-references hunger, sleep, nappy and leap data to give you a probable reason.",
  },
  {
    icon: <IconChart color="#4a8ab4" />,
    bg: "#e8f0fa",
    title: "Patterns emerge",
    desc: "After a few days of logging, you'll see insights like \"longest sleeps follow 20+ min feeds.\"",
  },
  {
    icon: <IconNight color="#7a60b0" />,
    bg: "#f0eafe",
    title: "3am mode",
    desc: "Between 11pm–5am the screen shifts to a calm night companion with breathing exercises.",
  },
];

const coralBtn: React.CSSProperties = {
  background: "#d4604a",
  color: "white",
  borderRadius: 24,
  padding: "14px 0",
  width: "100%",
  fontSize: 15,
  fontWeight: 600,
  fontFamily: "system-ui, sans-serif",
  border: "none",
  cursor: "pointer",
};

const inputField: React.CSSProperties = {
  border: "1px solid #ede0d4",
  borderRadius: 12,
  padding: 12,
  fontSize: 15,
  textAlign: "center",
  width: "100%",
  fontFamily: "system-ui, sans-serif",
  outline: "none",
  background: "transparent",
  boxSizing: "border-box",
};

const ghostLnk: React.CSSProperties = {
  color: "var(--mu)",
  fontSize: 12,
  background: "none",
  border: "none",
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
  marginTop: 12,
};

interface AddedBaby {
  id: string;
  name: string;
  birthDate: number;
  photoDataUrl?: string;
}

export function OnboardingNavigator({ onComplete }: OnboardingNavigatorProps) {
  const { addBaby, setActiveBabyId, updateActiveBaby } = useBaby();
  const { language, setLanguage: setAppLanguage } = useLanguage();
  const [step, setStep] = useState(getOnboardingStep());
  const [fade, setFade] = useState<"in" | "out">("in");
  const [babyName, setBabyName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [parentName, setParentName] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dateFmt, setDateFmt] = useState<DateFormatPref>(getDateFormatPref);
  const [timeFmt, setTimeFmt] = useState<TimeFormatPref>(getTimeFormatPref);
  const [localeLang, setLocaleLang] = useState<SupportedLocale>(language);
  const [addedBabies, setAddedBabies] = useState<AddedBaby[]>([]);
  const [isExpecting, setIsExpecting] = useState(false);

  useEffect(() => {
    saveOnboardingStep(step);
  }, [step]);

  const go = (next: number) => {
    setFade("out");
    setTimeout(() => {
      setStep(next);
      setFade("in");
    }, 250);
  };

  const handleAddBaby = () => {
    const name = babyName.trim() || "Baby";
    const birthMs = birthDate ? new Date(birthDate).getTime() : Date.now();
    const baby = addBaby({
      name,
      birthDate: birthMs,
      photoDataUrl: photoDataUrl ?? undefined,
    });
    setActiveBabyId(baby.id);
    setAddedBabies((prev) => [...prev, { id: baby.id, name, birthDate: birthMs, photoDataUrl: photoDataUrl ?? undefined }]);
    setBabyName("");
    setBirthDate("");
    setPhotoDataUrl(null);
    setIsExpecting(false);
  };

  const handleBabySetupContinue = () => {
    if (babyName.trim() || birthDate) {
      handleAddBaby();
    }
    if (addedBabies.length === 0 && !babyName.trim() && !birthDate) {
      const baby = addBaby({ name: "Baby", birthDate: Date.now() });
      setActiveBabyId(baby.id);
    }
    go(4);
  };

  const handleParentNameContinue = () => {
    const trimmed = parentName.trim().slice(0, 40);
    if (trimmed) updateActiveBaby({ parentName: trimmed });
    go(5);
  };

  const handleComplete = () => {
    clearOnboardingStep();
    markOnboardingComplete();
    try {
      localStorage.setItem("cradl-onboarding-done", "true");
    } catch {}
    onComplete();
  };

  const handleCompleteAndLogin = () => {
    clearOnboardingStep();
    markOnboardingComplete();
    try {
      localStorage.setItem("cradl-onboarding-done", "true");
      localStorage.setItem("cradl-post-onboarding-login", "true");
    } catch {}
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

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(to bottom, #fffbf5, #fef5ee)",
        fontFamily: "system-ui, sans-serif",
        transition: "opacity 0.25s ease",
        opacity: fade === "in" ? 1 : 0,
        position: "relative",
      }}
    >
      {/* Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 24px 0",
        }}
      >
        {/* Step 1 skip link */}
        {step === 1 && (
          <button
            type="button"
            onClick={() => go(2)}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              color: "var(--mu)",
              fontSize: 12,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Skip
          </button>
        )}

        {/* ── Step 0: Welcome ── */}
        {step === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              width: "100%",
              maxWidth: 320,
            }}
          >
            <img
              src="/logo-no-tagline.png"
              alt="Cradl"
              style={{ height: 72, objectFit: "contain", marginBottom: 8 }}
            />
            <p
              style={{
                fontSize: 13,
                color: "#9a8080",
                margin: "0 0 32px",
                lineHeight: 1.5,
              }}
            >
              Know why she's crying.
              <br />
              Before you have to figure it out.
            </p>
            <button type="button" onClick={() => go(1)} style={coralBtn}>
              Get started
            </button>
            <button type="button" onClick={() => go(6)} style={ghostLnk}>
              I already have an account
            </button>
          </div>
        )}

        {/* ── Step 1: Why Cradl ── */}
        {step === 1 && (
          <div style={{ width: "100%", maxWidth: 320, textAlign: "center" }}>
            <h2
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 20,
                fontWeight: 600,
                color: "#2c1f1f",
                margin: "0 0 20px",
              }}
            >
              Built for 3am.
            </h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginBottom: 24,
              }}
            >
              {VALUE_PROPS.map((vp) => (
                <div
                  key={vp.title}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      minWidth: 28,
                      borderRadius: 8,
                      background: vp.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {vp.icon}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#2c1f1f",
                        marginBottom: 2,
                      }}
                    >
                      {vp.title}
                    </div>
                    <div style={{ fontSize: 11, color: "#9a8080", lineHeight: 1.4 }}>
                      {vp.body}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => go(2)} style={coralBtn}>
              Sounds good
            </button>
          </div>
        )}

        {/* ── Step 2: Preferences (date, time, language) — before baby so date format applies ── */}
        {step === 2 && (
          <div
            style={{
              width: "100%",
              maxWidth: 320,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#2c1f1f",
                margin: "0 0 20px",
              }}
            >
              How do you like your dates?
            </h2>

            {/* Date format */}
            <div style={{ width: "100%", textAlign: "left", marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#9a8080", marginBottom: 6 }}>
                Date format
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {(["DD/MM/YYYY", "MM/DD/YYYY"] as DateFormatPref[]).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setDateFmt(opt);
                      setDateFormatPref(opt);
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      borderRadius: 12,
                      border: `1.5px solid ${dateFmt === opt ? "#d4604a" : "#ede0d4"}`,
                      background: dateFmt === opt ? "#feeae4" : "transparent",
                      cursor: "pointer",
                      fontFamily: "system-ui, sans-serif",
                      fontSize: 13,
                      fontWeight: dateFmt === opt ? 600 : 400,
                      color: "#2c1f1f",
                    }}
                  >
                    {opt === "DD/MM/YYYY" ? "15/03/2025" : "03/15/2025"}
                    <div style={{ fontSize: 10, color: "#9a8080", marginTop: 2 }}>{opt}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Time format */}
            <div style={{ width: "100%", textAlign: "left", marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#9a8080", marginBottom: 6 }}>
                Time format
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {(["24h", "12h"] as TimeFormatPref[]).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setTimeFmt(opt);
                      setTimeFormatPref(opt);
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      borderRadius: 12,
                      border: `1.5px solid ${timeFmt === opt ? "#d4604a" : "#ede0d4"}`,
                      background: timeFmt === opt ? "#feeae4" : "transparent",
                      cursor: "pointer",
                      fontFamily: "system-ui, sans-serif",
                      fontSize: 13,
                      fontWeight: timeFmt === opt ? 600 : 400,
                      color: "#2c1f1f",
                    }}
                  >
                    {opt === "24h" ? "14:30" : "2:30 PM"}
                    <div style={{ fontSize: 10, color: "#9a8080", marginTop: 2 }}>
                      {opt === "24h" ? "24-hour" : "12-hour"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div style={{ width: "100%", textAlign: "left", marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#9a8080", marginBottom: 6 }}>
                Language
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {(["en", "lt", "de", "fr", "es"] as SupportedLocale[]).map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => {
                      setLocaleLang(loc);
                      setAppLanguage(loc);
                    }}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 12,
                      border: `1.5px solid ${localeLang === loc ? "#d4604a" : "#ede0d4"}`,
                      background: localeLang === loc ? "#feeae4" : "transparent",
                      cursor: "pointer",
                      fontFamily: "system-ui, sans-serif",
                      fontSize: 13,
                      fontWeight: localeLang === loc ? 600 : 400,
                      color: "#2c1f1f",
                    }}
                  >
                    {LOCALE_LABELS[loc]}
                  </button>
                ))}
              </div>
            </div>

            <button type="button" onClick={() => go(3)} style={coralBtn}>
              Continue
            </button>
            <button type="button" onClick={() => go(3)} style={ghostLnk}>
              Skip
            </button>
          </div>
        )}

        {/* ── Step 3: Baby setup ── */}
        {step === 3 && (
          <div
            style={{
              width: "100%",
              maxWidth: 320,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#2c1f1f",
                margin: "0 0 20px",
              }}
            >
              {addedBabies.length === 0 ? "Tell me about your little one" : "Add another baby"}
            </h2>

            {/* Already-added babies */}
            {addedBabies.length > 0 && (
              <div style={{ width: "100%", marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                {addedBabies.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      borderRadius: 12,
                      border: "1px solid #e4d8c8",
                      background: "#faf7f4",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #fde8d8, #e8d4f5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        flexShrink: 0,
                      }}
                    >
                      {b.photoDataUrl ? (
                        <img src={b.photoDataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                      ) : (
                        <IconBaby color="#c4a0a0" />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#2c1f1f" }}>{b.name}</div>
                      <div style={{ fontSize: 10, color: "#9a8080" }}>
                        {b.birthDate > Date.now() ? `Due ${new Date(b.birthDate).toLocaleDateString()}` : b.birthDate > Date.now() - 86400000 ? "Date not set" : `Born ${new Date(b.birthDate).toLocaleDateString()}`}
                      </div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4a8a4a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                ))}
              </div>
            )}

            {/* Photo circle */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                border: "2px dashed #ede0d4",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                marginBottom: 16,
                overflow: "hidden",
                padding: 0,
              }}
            >
              {photoDataUrl ? (
                <img
                  src={photoDataUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ fontSize: 10, color: "var(--mu)" }}>
                  {uploading ? "…" : "Add photo"}
                </span>
              )}
            </button>

            <input
              type="text"
              placeholder="Baby's name"
              value={babyName}
              onChange={(e) => setBabyName(e.target.value)}
              style={{ ...inputField, marginBottom: 10 }}
              aria-label="Baby's name"
            />

            {/* Born / Expecting toggle */}
            <div style={{ display: "flex", gap: 8, width: "100%", marginBottom: 10 }}>
              {(["born", "expecting"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { setIsExpecting(opt === "expecting"); setBirthDate(""); }}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 10,
                    border: `1.5px solid ${(opt === "expecting") === isExpecting ? "#d4604a" : "#ede0d4"}`,
                    background: (opt === "expecting") === isExpecting ? "#feeae4" : "transparent",
                    cursor: "pointer",
                    fontFamily: "system-ui, sans-serif",
                    fontSize: 12,
                    fontWeight: (opt === "expecting") === isExpecting ? 600 : 400,
                    color: "#2c1f1f",
                  }}
                >
                  {opt === "born" ? "Already born" : "Still expecting"}
                </button>
              ))}
            </div>

            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              style={{ ...inputField, marginBottom: 8 }}
              aria-label={isExpecting ? "Due date" : "Birth date"}
            />

            <p
              style={{
                fontSize: 10,
                color: "#9a8080",
                fontStyle: "italic",
                margin: "0 0 12px",
              }}
            >
              {isExpecting
                ? "Enter your due date — Cradl becomes your pregnancy companion"
                : "You can skip the birth date for now"}
            </p>

            {/* Add another + Continue buttons */}
            {addedBabies.length > 0 ? (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                {(babyName.trim() || birthDate) && (
                  <button
                    type="button"
                    onClick={handleAddBaby}
                    style={{
                      ...coralBtn,
                      background: "transparent",
                      color: "#d4604a",
                      border: "1.5px solid #d4604a",
                    }}
                  >
                    + Add this baby
                  </button>
                )}
                <button type="button" onClick={handleBabySetupContinue} style={coralBtn}>
                  Continue with {addedBabies.length} {addedBabies.length === 1 ? "baby" : "babies"}
                </button>
              </div>
            ) : (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                <button type="button" onClick={handleBabySetupContinue} style={coralBtn}>
                  Continue
                </button>
              </div>
            )}

            {addedBabies.length === 0 && (
              <p style={{ fontSize: 10, color: "#9a8080", marginTop: 12 }}>
                Twins? Siblings? You can add more babies after this one.
              </p>
            )}
          </div>
        )}

        {/* ── Step 4: Your name ── */}
        {step === 4 && (
          <div
            style={{
              width: "100%",
              maxWidth: 320,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#f0ece8", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }} aria-hidden>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9a8080" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#2c1f1f",
                margin: "0 0 16px",
              }}
            >
              And what's your name?
            </h2>
            <input
              type="text"
              placeholder="Your first name"
              value={parentName}
              onChange={(e) => setParentName(e.target.value.slice(0, 40))}
              maxLength={40}
              style={{ ...inputField, marginBottom: 16 }}
              aria-label="Your first name"
            />
            <button type="button" onClick={handleParentNameContinue} style={coralBtn}>
              Continue
            </button>
            <button type="button" onClick={() => go(5)} style={ghostLnk}>
              Skip this
            </button>
          </div>
        )}

        {/* ── Step 5: Quick tour ── */}
        {step === 5 && (
          <div
            style={{
              width: "100%",
              maxWidth: 320,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#2c1f1f",
                margin: "0 0 6px",
              }}
            >
              Here's how Cradl works
            </h2>
            <p style={{ fontSize: 11, color: "#9a8080", margin: "0 0 20px" }}>
              Everything you need, nothing you don't
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", marginBottom: 20 }}>
              {TOUR_CARDS.map((card) => (
                <div
                  key={card.title}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid #ede0d4",
                    textAlign: "left",
                    background: "#faf7f4",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: card.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {card.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#2c1f1f", marginBottom: 2 }}>
                      {card.title}
                    </div>
                    <div style={{ fontSize: 11, color: "#9a8080", lineHeight: 1.4 }}>
                      {card.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={() => go(6)} style={coralBtn}>
              Got it
            </button>
          </div>
        )}

        {/* ── Step 6: All set + optional account ── */}
        {step === 6 && (
          <div
            style={{
              width: "100%",
              maxWidth: 320,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#e4f4e4", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }} aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4a8a4a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "#2c1f1f",
                margin: "0 0 6px",
              }}
            >
              You're all set!
            </h2>
            <p style={{ fontSize: 12, color: "#9a8080", margin: "0 0 24px", lineHeight: 1.4 }}>
              Everything's saved on this device and ready to go.
            </p>

            <button type="button" onClick={handleComplete} style={coralBtn}>
              Start tracking
            </button>

            {/* Account upsell */}
            <div
              style={{
                width: "100%",
                marginTop: 24,
                padding: "16px 14px",
                borderRadius: 14,
                border: "1px solid #ede0d4",
                background: "#faf7f4",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: "#2c1f1f", marginBottom: 4 }}>
                Want to back up your data?
              </div>
              <p style={{ fontSize: 11, color: "#9a8080", lineHeight: 1.4, margin: "0 0 12px" }}>
                Create a free account to sync across devices and never lose your logs.
              </p>
              <button
                type="button"
                onClick={handleCompleteAndLogin}
                style={{
                  ...coralBtn,
                  background: "transparent",
                  color: "#d4604a",
                  border: "1.5px solid #d4604a",
                  padding: "10px 0",
                  fontSize: 13,
                }}
              >
                Create account
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Progress dots */}
      <div
        style={{
          display: "flex",
          gap: 6,
          justifyContent: "center",
          padding: 20,
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            style={{
              height: 8,
              borderRadius: 4,
              width: i === step ? 16 : 8,
              background:
                i < step ? "#4a8a4a" : i === step ? "#d4604a" : "#ede0d4",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}
