import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { toast } from "sonner";

const SpeechRecognitionAPI: any =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    : undefined;

interface VoiceCommand {
  patterns: RegExp[];
  action: (nav: ReturnType<typeof useNavigate>) => void;
  label: string;
}

const COMMANDS: VoiceCommand[] = [
  {
    patterns: [/\b(log|start|record)\b.*\bfeed/i, /\bfeed\b/i],
    action: (nav) => nav("/?action=feed"),
    label: "Opening feed log…",
  },
  {
    patterns: [/\b(log|start|record)\b.*\bsleep/i, /\bsleep\b/i],
    action: (nav) => nav("/?action=sleep"),
    label: "Opening sleep log…",
  },
  {
    patterns: [/\b(log|record|change)\b.*\b(nappy|diaper|nappie)/i, /\b(nappy|diaper)\b/i],
    action: (nav) => nav("/?action=diaper"),
    label: "Opening nappy log…",
  },
  {
    patterns: [/\b(log|record)\b.*\bbottle/i, /\bbottle\b/i],
    action: (nav) => nav("/?action=bottle"),
    label: "Opening bottle log…",
  },
  {
    patterns: [/\b(log|start|record)\b.*\btummy/i, /\btummy\s*time/i],
    action: (nav) => nav("/?action=tummy"),
    label: "Opening tummy time…",
  },
  {
    patterns: [/\b(log|start|record)\b.*\bpump/i, /\bpump\b/i],
    action: (nav) => nav("/?action=pump"),
    label: "Opening pump log…",
  },
  {
    patterns: [/\b(show|open|go\s*to)\b.*\b(today|timeline|dashboard)/i, /\btoday\b/i],
    action: (nav) => nav("/"),
    label: "Going to today…",
  },
  {
    patterns: [/\b(show|open|go\s*to)\b.*\b(journey|story|milestone)/i, /\bjourney\b/i, /\bstory\b/i],
    action: (nav) => nav("/journey"),
    label: "Going to journey…",
  },
  {
    patterns: [/\b(show|open|go\s*to)\b.*\bvillage/i, /\bvillage\b/i],
    action: (nav) => nav("/village"),
    label: "Going to village…",
  },
  {
    patterns: [/\b(show|open|go\s*to)\b.*\bsettings/i, /\bsettings\b/i],
    action: (nav) => nav("/settings"),
    label: "Opening settings…",
  },
];

function matchCommand(transcript: string): VoiceCommand | null {
  const cleaned = transcript.replace(/^(cradl|cradle|craddle)[,\s]*/i, "").trim();
  for (const cmd of COMMANDS) {
    for (const pattern of cmd.patterns) {
      if (pattern.test(cleaned)) return cmd;
    }
  }
  return null;
}

export function VoiceCommandButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasSpeech = !!SpeechRecognitionAPI;

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, []);

  const handleResult = useCallback(
    (text: string) => {
      setTranscript(text);
      const cmd = matchCommand(text);
      if (cmd) {
        toast.success(cmd.label);
        cmd.action(navigate);
      } else {
        toast("Didn't catch that. Try \"Log a feed\" or \"Log sleep\".", { duration: 3000 });
      }
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(() => setTranscript(null), 2500);
    },
    [navigate],
  );

  const toggleListening = useCallback(() => {
    if (listening && recognitionRef.current) {
      recognitionRef.current.abort();
      setListening(false);
      return;
    }
    if (!SpeechRecognitionAPI) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-GB";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const text = event.results?.[0]?.[0]?.transcript ?? "";
      handleResult(text);
    };
    recognition.onerror = () => {
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setTranscript(null);
  }, [listening, handleResult]);

  if (!hasSpeech) return null;

  const isLoginPage = location.pathname === "/login";
  if (isLoginPage) return null;

  return (
    <>
      {/* Floating mic button */}
      <button
        type="button"
        onClick={toggleListening}
        aria-label={listening ? "Stop listening" : "Voice command"}
        style={{
          position: "fixed",
          bottom: 80,
          left: 16,
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: listening ? "#d4604a" : "var(--tx)",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 999,
          padding: 0,
          boxShadow: listening
            ? "0 0 0 6px rgba(212,96,74,0.25)"
            : "0 2px 8px rgba(0,0,0,0.15)",
          transition: "background 0.2s, box-shadow 0.3s",
        }}
      >
        {/* Mic icon */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
      </button>

      {/* Listening indicator */}
      {(listening || transcript) && (
        <div
          style={{
            position: "fixed",
            bottom: 136,
            left: 16,
            maxWidth: 220,
            background: listening ? "#1c1915" : "var(--card)",
            color: listening ? "#fff" : "var(--tx)",
            borderRadius: 14,
            padding: "8px 14px",
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "system-ui, sans-serif",
            zIndex: 999,
            boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
            border: listening ? "none" : "1px solid var(--bd)",
            lineHeight: 1.4,
          }}
        >
          {listening && !transcript && (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#d4604a",
                  animation: "pulse 1s ease-in-out infinite",
                }}
              />
              Listening…
            </span>
          )}
          {transcript && (
            <span style={{ color: listening ? "#fff" : "var(--tx)" }}>
              "{transcript}"
            </span>
          )}
          <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
        </div>
      )}
    </>
  );
}
