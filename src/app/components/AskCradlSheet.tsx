import { useState } from "react";
import { X, MessageCircle } from "lucide-react";
import { askCradl, appendAskHistory, type AskCradlResponse, type AskCradlEscalation } from "../utils/askCradl";
import type { AskCradlContext } from "../utils/askCradl";
import { usePremium } from "../contexts/PremiumContext";
import { PremiumGate } from "./PremiumGate";

const QUICK_QUESTIONS = [
  "Is this normal?",
  "Should I call the GP?",
  "Why won't she sleep?",
  "Is she eating enough?",
];

interface AskCradlSheetProps {
  onClose: () => void;
  question?: string;
  babyAgeWeeks: number | null;
  recentContext: AskCradlContext;
  accessToken: string | null;
}

export function AskCradlSheet({
  onClose,
  question: initialQuestion = "",
  babyAgeWeeks,
  recentContext,
  accessToken,
}: AskCradlSheetProps) {
  const [question, setQuestion] = useState(initialQuestion);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AskCradlResponse | null>(null);
  const { isPremium } = usePremium();

  const handleAsk = async () => {
    const q = question.trim();
    if (!q) return;
    setLoading(true);
    setResponse(null);
    try {
      const res = await askCradl(q, babyAgeWeeks, recentContext, accessToken);
      setResponse(res);
      appendAskHistory({
        question: q,
        answer: res.answer,
        escalationLevel: res.escalationLevel,
      });
    } finally {
      setLoading(false);
    }
  };

  const escalationBg = (level: AskCradlEscalation): string => {
    switch (level) {
      case "routine":
        return "color-mix(in srgb, var(--grn) 18%, var(--card))";
      case "monitor":
        return "color-mix(in srgb, #f5a623 18%, var(--card))";
      case "urgent":
        return "color-mix(in srgb, #e87474 18%, var(--card))";
      default:
        return "var(--card2)";
    }
  };

  if (!isPremium) {
    return (
      <div className="flex flex-col h-full max-h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--bd)" }}>
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--tx)" }}>
            <MessageCircle className="w-5 h-5" style={{ color: "var(--pink)" }} />
            Ask Cradl
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg min-w-[44px] min-h-[44px]" style={{ color: "var(--mu)" }} aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          <PremiumGate feature="Ask Cradl — evidence-based answers, 10 questions per day with Premium.">
            <></>
          </PremiumGate>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[85vh]">
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--bd)" }}>
        <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--tx)" }}>
          <MessageCircle className="w-5 h-5" style={{ color: "var(--pink)" }} />
          Ask Cradl
        </h2>
        <button type="button" onClick={onClose} className="p-2 rounded-lg min-w-[44px] min-h-[44px]" style={{ color: "var(--mu)" }} aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        {!response ? (
          <>
            <label className="block text-[13px] font-medium" style={{ color: "var(--mu)" }}>
              What's on your mind?
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, 500))}
              placeholder="e.g. Is it normal for her to wake every 2 hours?"
              rows={3}
              maxLength={500}
              className="w-full rounded-xl border px-3 py-2.5 text-[15px] resize-none"
              style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
              aria-label="Your question"
            />
            <p className="text-[12px]" style={{ color: "var(--mu)" }}>
              {question.length}/500
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuestion(q)}
                  className="rounded-full border px-3 py-1.5 text-[13px] min-h-[44px]"
                  style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" }}
                >
                  {q}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAsk}
              disabled={loading || !question.trim()}
              className="w-full py-3 rounded-xl font-medium text-white min-h-[48px] disabled:opacity-50"
              style={{ background: "var(--pink)" }}
            >
              {loading ? "Thinking…" : "Ask"}
            </button>
          </>
        ) : (
          <>
            <div className="rounded-xl border p-4" style={{ borderColor: "var(--bd)", background: "var(--card)" }}>
              <p className="text-[15px] whitespace-pre-wrap" style={{ color: "var(--tx)" }}>
                {response.answer}
              </p>
            </div>
            <div
              className="rounded-xl border p-4"
              style={{ borderColor: "var(--bd)", background: escalationBg(response.escalationLevel) }}
            >
              <p className="text-[14px] font-medium" style={{ color: "var(--tx)" }}>
                {response.escalationMessage}
              </p>
            </div>
            <p className="text-[9px]" style={{ color: "var(--mu)" }}>
              {response.disclaimer}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setResponse(null); setQuestion(""); }}
                className="flex-1 py-2.5 rounded-xl border text-[14px] font-medium min-h-[44px]"
                style={{ borderColor: "var(--bd)", color: "var(--tx)" }}
              >
                Ask another question
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl font-medium text-white min-h-[44px]"
                style={{ background: "var(--pink)" }}
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
