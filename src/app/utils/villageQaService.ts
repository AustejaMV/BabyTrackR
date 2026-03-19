import { serverUrl } from "./supabase";

export interface VillageQuestion {
  id: string;
  content: string;
  ageBand: string;
  createdAt: number;
  hearts?: number;
  heartedByMe?: boolean;
  isMine?: boolean;
}

export interface VillageAnswer {
  id: string;
  content: string;
  createdAt: number;
  hearts?: number;
  heartedByMe?: boolean;
  isMine?: boolean;
}

export async function fetchQuestions(token: string): Promise<VillageQuestion[]> {
  const res = await fetch(`${serverUrl}/village/qa/questions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("fetch_questions_failed");
  const data = (await res.json()) as { questions?: VillageQuestion[] };
  return (data.questions ?? []).sort((a, b) => b.createdAt - a.createdAt);
}

export async function postQuestion(
  token: string,
  params: { content: string; age_band?: string }
): Promise<{ id: string }> {
  const res = await fetch(`${serverUrl}/village/qa/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      content: params.content.trim().slice(0, 280),
      age_band: params.age_band ?? "0-12",
    }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "post_question_failed");
  }
  const data = (await res.json()) as { id: string };
  return data;
}

export async function fetchAnswers(token: string, questionId: string): Promise<VillageAnswer[]> {
  const res = await fetch(`${serverUrl}/village/qa/questions/${questionId}/answers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("fetch_answers_failed");
  const data = (await res.json()) as { answers?: VillageAnswer[] };
  return (data.answers ?? []).sort((a, b) => a.createdAt - b.createdAt);
}

export async function postAnswer(token: string, questionId: string, content: string): Promise<{ id: string }> {
  const res = await fetch(`${serverUrl}/village/qa/questions/${questionId}/answers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content: content.trim().slice(0, 1000) }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "post_answer_failed");
  }
  const data = (await res.json()) as { id: string };
  return data;
}

export async function heartItem(
  token: string,
  itemType: "question" | "answer",
  itemId: string
): Promise<{ hearts: number }> {
  const res = await fetch(`${serverUrl}/village/qa/${itemType}s/${itemId}/heart`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "heart_failed");
  }
  return (await res.json()) as { hearts: number };
}

const QA_HEARTS_KEY = "cradl-qa-hearts-hour";
const HEARTS_PER_HOUR = 50;

export function canHeart(): boolean {
  try {
    const raw = localStorage.getItem(QA_HEARTS_KEY);
    if (!raw) return true;
    const data = JSON.parse(raw) as { ts: number; count: number };
    if (Date.now() - data.ts > 3600000) return true;
    return data.count < HEARTS_PER_HOUR;
  } catch { return true; }
}

export function recordHeart(): void {
  try {
    const raw = localStorage.getItem(QA_HEARTS_KEY);
    let data: { ts: number; count: number } = { ts: Date.now(), count: 0 };
    if (raw) {
      data = JSON.parse(raw) as { ts: number; count: number };
      if (Date.now() - data.ts > 3600000) {
        data = { ts: Date.now(), count: 0 };
      }
    }
    data.count++;
    localStorage.setItem(QA_HEARTS_KEY, JSON.stringify(data));
  } catch {}
}
