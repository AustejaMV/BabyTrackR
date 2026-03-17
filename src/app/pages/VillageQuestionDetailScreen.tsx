import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import { HelpCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { fetchQuestions, fetchAnswers, postAnswer, type VillageAnswer } from "../utils/villageQaService";
import { toast } from "sonner";
import { format } from "date-fns";

export function VillageQuestionDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const [answers, setAnswers] = useState<VillageAnswer[]>([]);
  const [answerInput, setAnswerInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [questionContent, setQuestionContent] = useState("");

  const questionId = id ?? "";

  useEffect(() => {
    if (!session?.access_token || !questionId) {
      setLoading(false);
      return;
    }
    fetchAnswers(session.access_token, questionId)
      .then((list) => {
        setAnswers(list);
        setQuestionContent("");
      })
      .catch(() => toast.error("Could not load answers"))
      .finally(() => setLoading(false));
  }, [session?.access_token, questionId]);

  const handlePostAnswer = async () => {
    const trimmed = answerInput.trim();
    if (!session?.access_token || !questionId || !trimmed) return;
    setSending(true);
    try {
      await postAnswer(session.access_token, questionId, trimmed);
      setAnswerInput("");
      const list = await fetchAnswers(session.access_token, questionId);
      setAnswers(list);
      toast.success("Answer posted (anonymous)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to post");
    } finally {
      setSending(false);
    }
  };

  if (!questionId) return null;

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)" }}>
      <div className="p-4">
        <Link to="/village/qa" className="text-[14px] mb-4 inline-block" style={{ color: "var(--pink)" }}>
          ← Ask other parents
        </Link>
        <div className="flex items-center gap-2 mb-4" style={{ color: "var(--tx)" }}>
          <HelpCircle className="w-5 h-5" style={{ color: "var(--pink)" }} />
          <h1 className="text-lg font-semibold">Question</h1>
        </div>
        <div className="rounded-2xl border p-4 mb-4" style={{ borderColor: "var(--bd)", background: "var(--card)" }}>
          {loading ? <p className="text-[14px]" style={{ color: "var(--mu)" }}>Loading…</p> : questionContent ? <p className="text-[14px]" style={{ color: "var(--tx)" }}>{questionContent}</p> : <p className="text-[14px]" style={{ color: "var(--mu)" }}>Question not found.</p>}
        </div>
        <h2 className="text-[14px] font-medium mb-2" style={{ color: "var(--tx)" }}>Answers</h2>
        {loading ? (
          <p className="text-[14px]" style={{ color: "var(--mu)" }}>Loading…</p>
        ) : answers.length === 0 ? (
          <p className="text-[14px]" style={{ color: "var(--mu)" }}>No answers yet. Be the first.</p>
        ) : (
          <ul className="space-y-2 mb-4">
            {answers.map((a) => (
              <li key={a.id} className="rounded-2xl border p-4" style={{ borderColor: "var(--bd)", background: "var(--card)" }}>
                <p className="text-[14px]" style={{ color: "var(--tx)" }}>{a.content}</p>
                <p className="text-[11px] mt-1" style={{ color: "var(--mu)" }}>{format(a.createdAt, "d MMM HH:mm")}</p>
              </li>
            ))}
          </ul>
        )}
        {session?.access_token && (
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--bd)", background: "var(--card)" }}>
            <textarea
              placeholder="Your answer (anonymous)"
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              rows={3}
              className="w-full rounded-xl border px-3 py-2.5 text-[14px] mb-2 resize-none"
              style={{ borderColor: "var(--bd)", background: "var(--bg)", color: "var(--tx)" }}
            />
            <button
              type="button"
              onClick={handlePostAnswer}
              disabled={sending || !answerInput.trim()}
              className="w-full py-2.5 rounded-xl font-medium text-white"
              style={{ background: "var(--pink)" }}
            >
              {sending ? "Posting…" : "Post answer"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
