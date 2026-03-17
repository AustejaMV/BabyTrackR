/**
 * Ask Cradl — contextual AI Q&A (Premium). Calls Edge Function POST /ask-cradl.
 * Client stub: when backend is not deployed, returns a friendly fallback.
 */

import { serverUrl } from "./supabase";

export type AskCradlEscalation = "routine" | "monitor" | "urgent";

export interface AskCradlContext {
  lastFeedHoursAgo: number | null;
  lastSleepHoursAgo: number | null;
  lastDiaperHoursAgo: number | null;
  currentAlerts: string[];
  recentSymptoms: string[];
}

export interface AskCradlResponse {
  answer: string;
  escalationLevel: AskCradlEscalation;
  escalationMessage: string;
  disclaimer: string;
}

const DISCLAIMER =
  "This is general information, not medical advice. Always trust your instincts — if you're worried, call your GP or 111.";

/**
 * Calls the Edge Function. Returns fallback when not authenticated, not premium, or endpoint missing.
 */
export async function askCradl(
  question: string,
  babyAgeWeeks: number | null,
  recentContext: AskCradlContext,
  accessToken: string | null
): Promise<AskCradlResponse> {
  const trimmed = question?.trim();
  if (!trimmed || trimmed.length > 500) {
    return {
      answer: "Please ask a question (max 500 characters).",
      escalationLevel: "routine",
      escalationMessage: "You can ask about feeding, sleep, symptoms, or development.",
      disclaimer: DISCLAIMER,
    };
  }

  if (!accessToken) {
    return {
      answer: "Sign in to use Ask Cradl.",
      escalationLevel: "routine",
      escalationMessage: "This feature is available when you're signed in.",
      disclaimer: DISCLAIMER,
    };
  }

  try {
    const res = await fetch(`${serverUrl}/ask-cradl`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        question: trimmed,
        babyAgeWeeks,
        recentContext,
      }),
    });

    if (res.status === 401) {
      return {
        answer: "Please sign in again to use Ask Cradl.",
        escalationLevel: "routine",
        escalationMessage: "Your session may have expired.",
        disclaimer: DISCLAIMER,
      };
    }
    if (res.status === 403) {
      return {
        answer: "Ask Cradl is a Premium feature.",
        escalationLevel: "routine",
        escalationMessage: "Upgrade to Premium to get evidence-based answers to your baby questions.",
        disclaimer: DISCLAIMER,
      };
    }
    if (res.status === 429) {
      return {
        answer: "You've reached today's question limit.",
        escalationLevel: "routine",
        escalationMessage: "Premium includes 10 questions per day. Try again tomorrow.",
        disclaimer: DISCLAIMER,
      };
    }

    const data = (await res.json().catch(() => ({}))) as Partial<AskCradlResponse>;
    return {
      answer: data.answer ?? "I couldn't get an answer right now. Try again or contact your health visitor.",
      escalationLevel: (data.escalationLevel as AskCradlEscalation) ?? "routine",
      escalationMessage: data.escalationMessage ?? "If you're worried, call your GP or 111.",
      disclaimer: data.disclaimer ?? DISCLAIMER,
    };
  } catch {
    return {
      answer: "Ask Cradl is temporarily unavailable. Check your connection and try again.",
      escalationLevel: "routine",
      escalationMessage: "If it's urgent, call 111 or your GP.",
      disclaimer: DISCLAIMER,
    };
  }
}

const ASK_HISTORY_KEY = "cradl-ask-history";
const MAX_HISTORY = 20;

export interface AskHistoryEntry {
  id: string;
  question: string;
  answer: string;
  escalationLevel: AskCradlEscalation;
  at: number;
}

function loadHistory(): AskHistoryEntry[] {
  try {
    const raw = localStorage.getItem(ASK_HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as AskHistoryEntry[];
    return Array.isArray(arr) ? arr.slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

export function getAskHistory(): AskHistoryEntry[] {
  return loadHistory();
}

export function appendAskHistory(entry: Omit<AskHistoryEntry, "id" | "at">): void {
  const list = loadHistory();
  list.unshift({
    ...entry,
    id: `ask-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    at: Date.now(),
  });
  try {
    localStorage.setItem(ASK_HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
  } catch {}
}
