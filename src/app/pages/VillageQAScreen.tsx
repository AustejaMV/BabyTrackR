import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { HelpCircle, Plus, Heart } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchQuestions,
  postQuestion,
  heartItem,
  canHeart,
  recordHeart,
  type VillageQuestion,
} from "../utils/villageQaService";
import { toast } from "sonner";
import { format } from "date-fns";
import { getDateLocale, TIME_DISPLAY } from "../utils/dateUtils";
import { userDayMonthShortPattern } from "../utils/formatPreferencesStorage";
import { useLanguage } from "../contexts/LanguageContext";

export function VillageQAScreen() {
  const { session } = useAuth();
  const { language } = useLanguage();
  const [questions, setQuestions] = useState<VillageQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAsk, setShowAsk] = useState(false);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [heartingId, setHeartingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!session?.access_token) return;
    fetchQuestions(session.access_token)
      .then(setQuestions)
      .catch(() => toast.error("Could not load questions"))
      .finally(() => setLoading(false));
  }, [session?.access_token]);

  useEffect(() => {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }
    load();
  }, [session?.access_token, load]);

  const handlePost = async () => {
    const trimmed = content.trim();
    if (!session?.access_token || trimmed.length < 10) {
      toast.error("Question must be at least 10 characters");
      return;
    }
    if (trimmed.length > 280) {
      toast.error("Max 280 characters");
      return;
    }
    setSubmitting(true);
    try {
      await postQuestion(session.access_token, { content: trimmed });
      toast.success("Question posted (anonymous)");
      setContent("");
      setShowAsk(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to post");
    } finally {
      setSubmitting(false);
    }
  };

  const handleHeart = async (q: VillageQuestion) => {
    if (!session?.access_token) return;
    if (q.isMine) {
      toast("You can't heart your own question");
      return;
    }
    if (!canHeart()) {
      toast("Heart limit reached — try again in an hour");
      return;
    }
    setHeartingId(q.id);
    try {
      const result = await heartItem(session.access_token, "question", q.id);
      recordHeart();
      setQuestions((prev) =>
        prev.map((item) =>
          item.id === q.id
            ? { ...item, hearts: result.hearts, heartedByMe: true }
            : item
        )
      );
    } catch {
      toast.error("Could not heart");
    } finally {
      setHeartingId(null);
    }
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)" }}>
      <div className="p-4">
        <Link to="/village" className="text-[14px] mb-4 inline-block" style={{ color: "var(--pink)" }}>
          ← Village
        </Link>
        <div className="flex items-center justify-between gap-2 mb-4">
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: "var(--tx)" }}>
            <HelpCircle className="w-6 h-6" style={{ color: "var(--pink)" }} />
            Ask other parents
          </h1>
          {session?.access_token && (
            <button
              type="button"
              onClick={() => setShowAsk(!showAsk)}
              className="flex items-center gap-1 py-2 px-3 rounded-xl text-[14px] font-medium"
              style={{ background: "var(--pink)", color: "white" }}
            >
              <Plus className="w-4 h-4" /> Ask
            </button>
          )}
        </div>

        {!session?.access_token ? (
          <p className="text-[14px]" style={{ color: "var(--mu)" }}>
            Sign in to ask and read anonymous Q&A.
          </p>
        ) : showAsk ? (
          <div className="rounded-2xl border p-4 mb-4" style={{ borderColor: "var(--bd)", background: "var(--card)" }}>
            <textarea
              placeholder="Your question (10–280 chars, no personal details)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="w-full rounded-xl border px-3 py-2.5 text-[14px] mb-2 resize-none"
              style={{ borderColor: "var(--bd)", background: "var(--bg)", color: "var(--tx)" }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePost}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl font-medium text-white"
                style={{ background: "var(--pink)" }}
              >
                {submitting ? "Posting…" : "Post anonymously"}
              </button>
              <button type="button" onClick={() => setShowAsk(false)} className="px-4 py-2.5 rounded-xl border" style={{ borderColor: "var(--bd)", color: "var(--tx)" }}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <p className="text-[14px]" style={{ color: "var(--mu)" }}>Loading…</p>
        ) : questions.length === 0 ? (
          <p className="text-[14px]" style={{ color: "var(--mu)" }}>No questions yet. Ask one to get started.</p>
        ) : (
          <ul className="space-y-3">
            {questions.map((q) => (
              <li
                key={q.id}
                className="rounded-2xl border p-4"
                style={{ borderColor: "var(--bd)", background: "var(--card)" }}
              >
                <Link to={`/village/qa/${q.id}`} className="block">
                  <p className="text-[14px]" style={{ color: "var(--tx)" }}>{q.content}</p>
                  <div className="text-[12px] mt-1" style={{ color: "var(--mu)" }}>
                    {format(q.createdAt, `${userDayMonthShortPattern()} · ${TIME_DISPLAY()}`, {
                      locale: getDateLocale(language),
                    })}{" "}
                    · {q.ageBand}
                  </div>
                </Link>
                <div className="flex items-center gap-3 mt-2 pt-2" style={{ borderTop: "1px solid var(--bd)" }}>
                  <button
                    type="button"
                    onClick={() => handleHeart(q)}
                    disabled={heartingId === q.id || q.isMine}
                    className="flex items-center gap-1 text-[13px]"
                    style={{
                      color: q.heartedByMe ? "#d4604a" : "var(--mu)",
                      cursor: q.isMine ? "default" : "pointer",
                      opacity: q.isMine ? 0.4 : 1,
                      background: "none",
                      border: "none",
                      padding: 0,
                    }}
                  >
                    <Heart
                      className="w-4 h-4"
                      fill={q.heartedByMe ? "#d4604a" : "none"}
                      stroke={q.heartedByMe ? "#d4604a" : "currentColor"}
                    />
                    {(q.hearts ?? 0) > 0 && <span>{q.hearts}</span>}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
