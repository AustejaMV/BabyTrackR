import { useState, useRef, useEffect, useCallback, type CSSProperties } from "react";
import { EscalationCard, type EscalationCardProps } from "./EscalationCard";
import { askCradl, appendAskHistory, type AskCradlEscalation } from "../utils/askCradl";
import { supabase } from "../utils/supabase";
import { formatDate, formatClockTime } from "../utils/dateUtils";

export interface AskCradlSheetProps {
  open: boolean;
  onClose: () => void;
}

interface HistoryEntry {
  id: string;
  question: string;
  answer: string;
  level: EscalationCardProps["level"];
  ts: number;
}

type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T } ? T : any;
const SpeechRecognitionAPI: SpeechRecognitionType | undefined =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    : undefined;

const HISTORY_KEY = "cradl-ask-history";
const dailyKey = () => `cradl-ask-daily-${new Date().toISOString().slice(0, 10)}`;
const MAX_DAILY = 10;
const MAX_CHARS = 500;
const CHAR_WARN = 300;
const MAX_HISTORY = 20;

const QUICK_PILLS = [
  "Is this normal?",
  "Should I call the GP?",
  "Why won't she sleep?",
  "Is she eating enough?",
];

function getDailyCount(): number {
  try {
    return Number(localStorage.getItem(dailyKey()) ?? 0);
  } catch {
    return 0;
  }
}

function incrementDaily() {
  try {
    localStorage.setItem(dailyKey(), String(getDailyCount() + 1));
  } catch {}
}

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
  } catch {}
}

function mockResponse(question: string): { answer: string; level: EscalationCardProps["level"] } {
  const q = question.toLowerCase();
  if (q.includes("call") || q.includes("emergency") || q.includes("breathing")) {
    return {
      answer:
        "If your baby is having difficulty breathing, is unresponsive, or you feel something is seriously wrong, please seek medical help immediately. Trust your instincts — you know your baby best.",
      level: "urgent",
    };
  }
  if (q.includes("monitor") || q.includes("rash") || q.includes("temperature") || q.includes("fever")) {
    return {
      answer:
        "This is worth keeping an eye on over the next day or so. Note any changes and, if symptoms persist or worsen, contact your GP or call 111 for guidance.",
      level: "monitor",
    };
  }
  return {
    answer:
      "This sounds like completely normal behaviour for your baby's age and stage. Every baby is different, but what you're describing is very common. Keep up the great work — you're doing brilliantly.",
    level: "routine",
  };
}

export function AskCradlSheet({ open, onClose }: AskCradlSheetProps) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ answer: string; level: EscalationCardProps["level"] } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [dailyUsed, setDailyUsed] = useState(getDailyCount);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const hasSpeech = !!SpeechRecognitionAPI;

  const toggleListening = useCallback(() => {
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-GB";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) setQuestion((prev) => (prev ? prev + " " + transcript : transcript).slice(0, MAX_CHARS));
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening]);

  useEffect(() => {
    if (open) {
      setDailyUsed(getDailyCount());
      setResponse(null);
      setQuestion("");
      setShowHistory(false);
    } else {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setListening(false);
    }
  }, [open]);

  const remaining = MAX_DAILY - dailyUsed;

  const handleSubmit = useCallback(async () => {
    const trimmed = question.trim();
    if (!trimmed || loading || remaining <= 0) return;

    setError(null);
    setLoading(true);
    setResponse(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? null;

      let result: { answer: string; level: EscalationCardProps["level"] };

      if (token) {
        try {
          const apiRes = await askCradl(trimmed, null, {
            lastFeedHoursAgo: null,
            lastSleepHoursAgo: null,
            lastDiaperHoursAgo: null,
            currentAlerts: [],
            recentSymptoms: [],
          }, token);
          result = { answer: apiRes.answer, level: apiRes.escalationLevel as EscalationCardProps["level"] };
          appendAskHistory({ question: trimmed, answer: apiRes.answer, escalationLevel: apiRes.escalationLevel as AskCradlEscalation });
        } catch {
          result = mockResponse(trimmed);
        }
      } else {
        await new Promise((r) => setTimeout(r, 800));
        result = mockResponse(trimmed);
      }

      setResponse(result);
      incrementDaily();
      setDailyUsed((p) => p + 1);

      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        question: trimmed,
        answer: result.answer,
        level: result.level,
        ts: Date.now(),
      };
      const history = loadHistory();
      saveHistory([entry, ...history]);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }, [question, loading, remaining]);

  const handlePill = (text: string) => {
    setQuestion(text);
    setResponse(null);
    textareaRef.current?.focus();
  };

  if (!open) return null;

  const overlay: CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    zIndex: 9999,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
  };

  const sheet: CSSProperties = {
    background: "var(--card)",
    borderRadius: "20px 20px 0 0",
    width: "100%",
    maxWidth: 480,
    maxHeight: "85vh",
    overflowY: "auto",
    padding: "20px 18px 24px",
    position: "relative",
  };

  const history = loadHistory();

  return (
    <div style={overlay} onClick={onClose} role="dialog" aria-modal aria-label="Ask Cradl">
      <div style={sheet} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: 16, margin: 0, color: "var(--tx)" }}>Ask Cradl</h2>
            <span style={{ fontSize: 12, color: "var(--mu)" }}>
              {dailyUsed} of 10 questions today
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              fontSize: 22,
              color: "var(--mu)",
              cursor: "pointer",
              padding: 4,
              lineHeight: 1,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Quick pills */}
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 10,
            marginBottom: 10,
            WebkitOverflowScrolling: "touch",
          }}
        >
          {QUICK_PILLS.map((pill) => (
            <button
              key={pill}
              type="button"
              onClick={() => handlePill(pill)}
              style={{
                flexShrink: 0,
                padding: "6px 14px",
                borderRadius: 20,
                border: "1px solid var(--bd)",
                background: "var(--pe)",
                color: "var(--tx)",
                fontSize: 13,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {pill}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={{ position: "relative", marginBottom: 10 }}>
          <textarea
            ref={textareaRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, MAX_CHARS))}
            placeholder={listening ? "Listening…" : "Type your question..."}
            rows={3}
            disabled={remaining <= 0}
            style={{
              width: "100%",
              padding: "12px 44px 12px 14px",
              borderRadius: 14,
              border: listening ? "1.5px solid var(--coral)" : "1px solid var(--bd)",
              background: "var(--bg)",
              color: "var(--tx)",
              fontSize: 14,
              resize: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
          {hasSpeech && (
            <button
              type="button"
              onClick={toggleListening}
              disabled={remaining <= 0}
              aria-label={listening ? "Stop listening" : "Dictate question"}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 30,
                height: 30,
                borderRadius: "50%",
                border: "none",
                background: listening ? "var(--coral)" : "var(--pe)",
                color: listening ? "#fff" : "var(--mu)",
                fontSize: 16,
                cursor: remaining <= 0 ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.15s",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="11" rx="3" />
                <path d="M5 10a7 7 0 0 0 14 0" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </button>
          )}
          {question.length > CHAR_WARN && (
            <span style={{ position: "absolute", bottom: 8, right: 12, fontSize: 11, color: "var(--mu)" }}>
              {question.length}/{MAX_CHARS}
            </span>
          )}
        </div>

        {remaining <= 0 && (
          <p style={{ fontSize: 12, color: "var(--coral)", margin: "0 0 10px" }}>
            You've reached your daily limit of 10 questions. Try again tomorrow.
          </p>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!question.trim() || loading || remaining <= 0}
          style={{
            width: "100%",
            padding: "12px 0",
            borderRadius: 14,
            border: "none",
            background: !question.trim() || remaining <= 0 ? "var(--bd)" : "var(--coral)",
            color: !question.trim() || remaining <= 0 ? "var(--mu)" : "#fff",
            fontSize: 15,
            fontWeight: 600,
            cursor: !question.trim() || remaining <= 0 ? "default" : "pointer",
            marginBottom: 14,
          }}
        >
          {loading ? "Asking..." : "Ask →"}
        </button>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <span style={{ fontSize: 24, letterSpacing: 4, animation: "pulse 1.2s infinite" }}>
              •••
            </span>
            <p style={{ fontSize: 13, color: "var(--mu)", margin: "6px 0 0" }}>Thinking...</p>
            <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <p style={{ fontSize: 13, color: "var(--coral)", margin: "0 0 10px", textAlign: "center" }}>{error}</p>
        )}

        {/* Response */}
        {response && !loading && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--tx)", margin: "0 0 8px" }}>
              {response.answer}
            </p>
            <EscalationCard level={response.level} />
            <p style={{ fontSize: 11, color: "var(--mu)", margin: "12px 0 0", lineHeight: 1.4 }}>
              Cradl AI is not a medical professional. Always consult your GP, health visitor, or call
              111 / 999 if you are concerned about your baby's health.
            </p>
          </div>
        )}

        {/* History toggle */}
        {history.length > 0 && (
          <div style={{ borderTop: "1px solid var(--bd)", paddingTop: 12 }}>
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              style={{
                background: "none",
                border: "none",
                color: "var(--coral)",
                fontSize: 13,
                cursor: "pointer",
                padding: 0,
                textDecoration: "underline",
              }}
            >
              {showHistory ? "Hide previous questions" : "Previous questions"}
            </button>

            {showHistory && (
              <div style={{ marginTop: 10 }}>
                {history.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      background: "var(--bg)",
                      borderRadius: 14,
                      padding: "10px 14px",
                      marginBottom: 8,
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)", margin: "0 0 4px" }}>
                      {h.question}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--mu)", margin: 0, lineHeight: 1.5 }}>
                      {h.answer}
                    </p>
                    <span style={{ fontSize: 11, color: "var(--mu)" }}>
                      {formatDate(h.ts)} {formatClockTime(h.ts)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
