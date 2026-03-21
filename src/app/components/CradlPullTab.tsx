import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";
import { toast } from "sonner";

const TAB_TOP_KEY = "cradl-pull-tab-top-percent";
const DEFAULT_TOP_PERCENT = 60;
const TAB_WIDTH_REST = 20;
const TAB_WIDTH_EXPANDED = 80;
const SNAP_BACK_MS = 2000;
/** Swipe left past this (px) to open Ask Cradl directly without tapping */
const SWIPE_OPEN_ASK_CRADL_THRESHOLD = 100;
/** Max pointer movement (px) to count as a tap-to-expand on the collapsed tab */
const TAP_EXPAND_MAX_PX = 14;

const SpeechRecognitionAPI: any =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    : undefined;

interface VoiceCommand {
  patterns: RegExp[];
  action: (nav: ReturnType<typeof useNavigate>) => void;
  label: string;
}

const VOICE_COMMANDS: VoiceCommand[] = [
  { patterns: [/\b(log|start|record)\b.*\bfeed/i, /\bfeed\b/i], action: (nav) => nav("/?action=feed"), label: "Opening feed log…" },
  { patterns: [/\b(log|start|record)\b.*\bsleep/i, /\bsleep\b/i], action: (nav) => nav("/?action=sleep"), label: "Opening sleep log…" },
  { patterns: [/\b(log|record|change)\b.*\b(nappy|diaper|nappie)/i, /\b(nappy|diaper)\b/i], action: (nav) => nav("/?action=diaper"), label: "Opening nappy log…" },
  { patterns: [/\b(log|record)\b.*\bbottle/i, /\bbottle\b/i], action: (nav) => nav("/?action=bottle"), label: "Opening bottle log…" },
  { patterns: [/\b(log|start|record)\b.*\btummy/i, /\btummy\s*time/i], action: (nav) => nav("/?action=tummy"), label: "Opening tummy time…" },
  { patterns: [/\b(log|start|record)\b.*\bpump/i, /\bpump\b/i], action: (nav) => nav("/?action=pump"), label: "Opening pump log…" },
  { patterns: [/\b(show|open|go\s*to)\b.*\b(today|timeline|dashboard)/i, /\btoday\b/i], action: (nav) => nav("/"), label: "Going to today…" },
  { patterns: [/\b(show|open|go\s*to)\b.*\b(journey|story|milestone)/i, /\bjourney\b/i, /\bstory\b/i], action: (nav) => nav("/journey"), label: "Going to journey…" },
  { patterns: [/\b(show|open|go\s*to)\b.*\bvillage/i, /\bvillage\b/i], action: (nav) => nav("/village"), label: "Going to village…" },
  { patterns: [/\b(show|open|go\s*to)\b.*\bsettings/i, /\bsettings\b/i], action: (nav) => nav("/settings"), label: "Opening settings…" },
];

function matchCommand(transcript: string): VoiceCommand | null {
  const cleaned = transcript.replace(/^(cradl|cradle|craddle)[,\s]*/i, "").trim();
  for (const cmd of VOICE_COMMANDS) {
    for (const pattern of cmd.patterns) {
      if (pattern.test(cleaned)) return cmd;
    }
  }
  return null;
}

function getStoredTopPercent(): number {
  try {
    const v = localStorage.getItem(TAB_TOP_KEY);
    if (v == null) return DEFAULT_TOP_PERCENT;
    const n = Number(v);
    return Number.isFinite(n) && n >= 10 && n <= 90 ? n : DEFAULT_TOP_PERCENT;
  } catch {
    return DEFAULT_TOP_PERCENT;
  }
}

function setStoredTopPercent(pct: number) {
  try {
    localStorage.setItem(TAB_TOP_KEY, String(Math.round(pct)));
  } catch {}
}

export interface CradlPullTabProps {
  onAskCradlClick: () => void;
}

export function CradlPullTab({ onAskCradlClick }: CradlPullTabProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  /** Mirrors `expanded` for event handlers that must read latest value without stale closures */
  const expandedRef = useRef(false);
  const [topPercent, setTopPercent] = useState(getStoredTopPercent);
  const snapBackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStart = useRef<{ x: number; y: number; topPx: number } | null>(null);
  /** Pointer-down origin + viewport top% — used to detect tap-to-expand vs drag-reposition */
  const pointerOriginRef = useRef<{ x: number; y: number } | null>(null);
  const topPercentAtPointerDownRef = useRef<number>(DEFAULT_TOP_PERCENT);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSpeech = !!SpeechRecognitionAPI;

  const clearSnapBack = useCallback(() => {
    if (snapBackTimer.current) {
      clearTimeout(snapBackTimer.current);
      snapBackTimer.current = null;
    }
  }, []);

  const scheduleSnapBack = useCallback(() => {
    clearSnapBack();
    snapBackTimer.current = setTimeout(() => {
      setExpanded(false);
      expandedRef.current = false;
    }, SNAP_BACK_MS);
  }, [clearSnapBack]);

  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);

  useEffect(() => {
    return () => {
      clearSnapBack();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, [clearSnapBack]);

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
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setTranscript(null);
  }, [listening, handleResult]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const clientX = e.clientX ?? (e as any).touches?.[0]?.pageX;
      const clientY = e.clientY ?? (e as any).touches?.[0]?.pageY;
      const rect = (e.target as Element).closest?.("[data-cradl-tab]")?.getBoundingClientRect?.();
      const topPx = rect ? rect.top + window.scrollY : (window.innerHeight * topPercent) / 100;
      dragStart.current = { x: clientX, y: clientY, topPx };
      pointerOriginRef.current = { x: clientX, y: clientY };
      topPercentAtPointerDownRef.current = topPercent;
      clearSnapBack();
    },
    [topPercent, clearSnapBack],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStart.current) return;
      const clientX = e.clientX ?? (e as any).touches?.[0]?.pageX;
      const clientY = e.clientY ?? (e as any).touches?.[0]?.pageY;
      const dx = clientX - dragStart.current.x;
      const dy = clientY - dragStart.current.y;
      if (expandedRef.current) {
        if (dx > 15) {
          setExpanded(false);
          expandedRef.current = false;
        }
        return;
      }
      if (dx < -SWIPE_OPEN_ASK_CRADL_THRESHOLD) {
        dragStart.current = null;
        onAskCradlClick();
        scheduleSnapBack();
        return;
      }
      if (dx < -15) {
        setExpanded(true);
        expandedRef.current = true;
        dragStart.current = null;
        scheduleSnapBack();
        return;
      }
      if (Math.abs(dy) > 8) {
        const newTopPx = dragStart.current.topPx + dy;
        const pct = Math.max(10, Math.min(90, (newTopPx / window.innerHeight) * 100));
        setTopPercent(pct);
        setStoredTopPercent(pct);
        dragStart.current = { ...dragStart.current, topPx: newTopPx, y: clientY };
      }
    },
    [scheduleSnapBack, onAskCradlClick],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const clientX = e.clientX ?? (e as any).changedTouches?.[0]?.clientX ?? 0;
      const clientY = e.clientY ?? (e as any).changedTouches?.[0]?.clientY ?? 0;

      if (!expandedRef.current && pointerOriginRef.current) {
        const o = pointerOriginRef.current;
        const movedLittle = Math.hypot(clientX - o.x, clientY - o.y) < TAP_EXPAND_MAX_PX;
        const topUnchanged = Math.abs(topPercent - topPercentAtPointerDownRef.current) < 0.6;
        if (movedLittle && topUnchanged) {
          setExpanded(true);
          expandedRef.current = true;
          scheduleSnapBack();
          dragStart.current = null;
          pointerOriginRef.current = null;
          return;
        }
      }

      dragStart.current = null;
      pointerOriginRef.current = null;
      if (expandedRef.current) scheduleSnapBack();
    },
    [topPercent, scheduleSnapBack],
  );

  const handleAskCradl = () => {
    clearSnapBack();
    setExpanded(false);
    expandedRef.current = false;
    onAskCradlClick();
  };

  const handleVoice = () => {
    clearSnapBack();
    toggleListening();
    scheduleSnapBack();
  };

  const pathname = location.pathname ?? "";
  const isLoginPage = pathname === "/login";
  const showOnRoute = pathname === "/" || pathname === "" || pathname.startsWith("/journey") || pathname.startsWith("/health");
  if (isLoginPage || !showOnRoute) return null;

  const width = expanded ? TAB_WIDTH_EXPANDED : TAB_WIDTH_REST;
  const top = `${topPercent}%`;

  return (
    <>
      <div
        data-cradl-tab
        role="group"
        aria-label="Ask Cradl and voice commands"
        aria-expanded={expanded}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          onPointerDown(e);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(e) => {
          if (expandedRef.current) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded(true);
            expandedRef.current = true;
            scheduleSnapBack();
          }
        }}
        tabIndex={expanded ? -1 : 0}
        title={expanded ? undefined : "Tap or swipe left — Ask Cradl & voice"}
        style={{
          position: "fixed",
          right: 0,
          top,
          transform: "translateY(-50%)",
          width,
          minHeight: 64,
          borderRadius: 32,
          background: "var(--card, #fff)",
          border: "1.5px solid var(--bd, #ede0d4)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
          zIndex: 999,
          display: "flex",
          alignItems: "stretch",
          overflow: "hidden",
          transition: expanded ? "width 0.2s ease" : "width 0.25s ease, transform 0.25s ease",
        }}
      >
        {expanded ? (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "8px 6px", gap: 6 }}>
            <button
              type="button"
              onClick={handleAskCradl}
              aria-label="Ask Cradl a question about your baby"
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "var(--coral, #d4604a)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
                alignSelf: "center",
              }}
            >
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
            {hasSpeech && (
              <button
                type="button"
                onClick={handleVoice}
                aria-label={listening ? "Stop listening" : "Voice command"}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: listening ? "#d4604a" : "var(--tx, #2c1f1f)",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                  alignSelf: "center",
                }}
              >
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x={9} y={2} width={6} height={12} rx={3} />
                  <path d="M5 10a7 7 0 0 0 14 0" />
                  <line x1={12} y1={19} x2={12} y2={22} />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <div style={{ width: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} aria-hidden>
            <svg width={8} height={14} viewBox="0 0 8 14" fill="none" stroke="var(--mu, #9a8080)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3L2 7l4 4" />
            </svg>
          </div>
        )}
      </div>

      {(listening || transcript) && hasSpeech && (
        <div
          style={{
            position: "fixed",
            bottom: 90,
            left: 16,
            maxWidth: 220,
            background: listening ? "#1c1915" : "var(--card)",
            color: listening ? "#fff" : "var(--tx)",
            borderRadius: 14,
            padding: "8px 14px",
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "system-ui, sans-serif",
            zIndex: 998,
            boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
            border: listening ? "none" : "1px solid var(--bd)",
            lineHeight: 1.4,
          }}
        >
          {listening && !transcript && (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#d4604a", animation: "cradl-pulse 1s ease-in-out infinite" }} />
              Listening…
            </span>
          )}
          {transcript && <span>"{transcript}"</span>}
        </div>
      )}
      <style>{`@keyframes cradl-pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
    </>
  );
}
