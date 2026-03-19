import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router";
import { generateGPSummary } from "../utils/gpSummary";
import { Navigation } from "../components/Navigation";

const GP_QUESTIONS_KEY = "cradl-gp-questions";

export function GPSummaryScreen() {
  const summary = useMemo(() => generateGPSummary(14), []);
  const [presentation, setPresentation] = useState(false);
  const [questions, setQuestions] = useState(() => localStorage.getItem(GP_QUESTIONS_KEY) ?? "");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveQuestions = useCallback((text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try { localStorage.setItem(GP_QUESTIONS_KEY, text); } catch {}
    }, 500);
  }, []);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleQuestionsChange = (text: string) => {
    setQuestions(text);
    saveQuestions(text);
  };

  const handleClear = () => {
    setQuestions("");
    try { localStorage.setItem(GP_QUESTIONS_KEY, ""); } catch {}
    setShowClearConfirm(false);
  };

  const handleShare = async () => {
    const lines = summary.sections.map((s) => `${s.title}\n${s.lines.join("\n")}`).join("\n\n");
    const text = `GP Visit Summary — ${summary.babyName}\n${summary.generatedAt}\n\n${lines}${questions.trim() ? `\n\nQuestions:\n${questions.trim()}` : ""}`;
    if (navigator.share) {
      try { await navigator.share({ title: `GP Summary — ${summary.babyName}`, text }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(text); } catch {}
    }
  };

  const fontSize = presentation ? "130%" : "100%";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", fontSize, paddingBottom: presentation ? 24 : 96 }}>
      {presentation && (
        <button
          type="button"
          onClick={() => setPresentation(false)}
          style={{
            position: "fixed", top: 12, right: 12, zIndex: 100,
            padding: "6px 14px", borderRadius: 10, fontSize: 12,
            fontWeight: 600, background: "var(--card)", border: "1px solid var(--bd)",
            color: "var(--pink)", cursor: "pointer", fontFamily: "system-ui, sans-serif",
          }}
        >
          Exit presentation
        </button>
      )}

      <div className={presentation ? "px-4 py-6" : "max-w-2xl mx-auto px-4 py-6"}>
        {!presentation && (
          <div className="flex items-center justify-between mb-4">
            <Link to="/more" className="text-sm" style={{ color: "var(--pink)" }}>← Back</Link>
            <h1 className="text-xl font-serif" style={{ color: "var(--tx)" }}>Prepare for GP visit</h1>
            <span className="w-10" />
          </div>
        )}

        <div
          className="border mb-4"
          style={{
            background: "var(--card)", borderColor: "var(--bd)",
            borderRadius: presentation ? 0 : 16,
            padding: presentation ? "24px 20px" : 20,
          }}
        >
          <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: "var(--mu)" }}>Summary for health visitor / GP</p>
          <p className="text-[12px] mb-4" style={{ color: "var(--mu)" }}>Generated {summary.generatedAt}</p>

          {summary.sections.map((sec) => (
            <div key={sec.title} className="mb-4 last:mb-0">
              <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--tx)" }}>{sec.title}</h2>
              <ul className="space-y-1 text-[13px]" style={{ color: "var(--tx)" }}>
                {sec.lines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Questions textarea */}
        <div className="rounded-2xl border p-4 mb-4" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>Questions to ask</label>
            {questions.trim() && (
              !showClearConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="text-[11px]"
                  style={{ color: "var(--mu)", background: "none", border: "none", cursor: "pointer", fontFamily: "system-ui, sans-serif", textDecoration: "underline" }}
                >
                  Clear questions
                </button>
              ) : (
                <span className="flex items-center gap-2">
                  <button type="button" onClick={handleClear} className="text-[11px]" style={{ color: "var(--destructive)", background: "none", border: "none", cursor: "pointer", fontFamily: "system-ui, sans-serif" }}>Yes, clear</button>
                  <button type="button" onClick={() => setShowClearConfirm(false)} className="text-[11px]" style={{ color: "var(--mu)", background: "none", border: "none", cursor: "pointer", fontFamily: "system-ui, sans-serif" }}>Cancel</button>
                </span>
              )
            )}
          </div>
          <textarea
            value={questions}
            onChange={(e) => handleQuestionsChange(e.target.value)}
            placeholder="Write your questions here — they'll be saved automatically"
            rows={4}
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 10,
              border: "1px solid var(--bd)", background: "var(--bg2)", color: "var(--tx)",
              fontSize: 14, fontFamily: "system-ui, sans-serif", resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Action row */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => setPresentation(true)}
            className="py-2 px-4 rounded-xl text-[13px] font-medium border"
            style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)", cursor: "pointer", fontFamily: "system-ui, sans-serif" }}
          >
            Presentation mode
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="py-2 px-4 rounded-xl text-[13px] font-medium border"
            style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--pink)", cursor: "pointer", fontFamily: "system-ui, sans-serif" }}
          >
            Share summary
          </button>
        </div>

        <p className="text-[12px] mb-4" style={{ color: "var(--mu)" }}>
          Use the main report (More → Export) for a full PDF. This one-pager is for quick reference at the appointment.
        </p>

        {!presentation && (
          <Link
            to="/more"
            className="block w-full py-3 rounded-xl text-center font-medium"
            style={{ background: "var(--pink)", color: "white" }}
          >
            Done
          </Link>
        )}
      </div>
      {!presentation && <Navigation />}
    </div>
  );
}
