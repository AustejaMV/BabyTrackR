/**
 * Check which articles should be shown based on current app state (triggers, age, dismissed).
 */

import type { ArticleMeta, ArticleTriggerCondition } from "../types/article";
import type { WarningKey } from "./warningUtils";
import { ARTICLES } from "../data/articles";

/** Map warning keys and app events to article trigger condition keys. */
export function buildActiveTriggers(params: {
  warnings?: WarningKey[];
  sleepRegressionDetected?: boolean;
  firstAppOpen?: boolean;
}): ArticleTriggerCondition[] {
  const out: ArticleTriggerCondition[] = [];
  if (params.warnings?.includes("no-poop")) out.push("no_poop_alert");
  if (params.sleepRegressionDetected) out.push("sleep_regression_detected");
  if (params.firstAppOpen) out.push("first_app_open");
  return out;
}

const DISMISSED_KEY = "cradl-dismissed-articles";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

export interface ArticleTriggerParams {
  /** Currently active trigger condition keys (e.g. from regression, alerts, events). */
  activeTriggers: ArticleTriggerCondition[];
  /** Baby's age in weeks; null if DOB not set. */
  ageInWeeks: number | null;
}

function getDismissedIds(): Set<string> {
  const out = new Set<string>();
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return out;
    const arr = JSON.parse(raw) as Array<{ id: string; dismissedAt: number }>;
    if (!Array.isArray(arr)) return out;
    const now = Date.now();
    for (const { id, dismissedAt } of arr) {
      if (typeof id === "string" && typeof dismissedAt === "number" && now - dismissedAt < DISMISS_MS) {
        out.add(id);
      }
    }
  } catch {}
  return out;
}

/**
 * Returns up to 2 articles that match current triggers and age, excluding recently dismissed.
 */
export function checkArticleTriggers(params: ArticleTriggerParams): ArticleMeta[] {
  const { activeTriggers, ageInWeeks } = params;
  if (ageInWeeks != null && (ageInWeeks < 0 || !Number.isFinite(ageInWeeks))) return [];
  const dismissed = getDismissedIds();
  const triggered: ArticleMeta[] = [];
  for (const article of ARTICLES) {
    if (dismissed.has(article.id)) continue;
    const ageOk =
      article.ageRangeWeeks == null ||
      (ageInWeeks != null && ageInWeeks >= article.ageRangeWeeks[0] && ageInWeeks <= article.ageRangeWeeks[1]);
    if (!ageOk) continue;
    const hasTrigger =
      article.triggerConditions.length > 0 &&
      article.triggerConditions.some((c) => activeTriggers.includes(c));
    if (hasTrigger) triggered.push(article);
  }
  return triggered.slice(0, 2);
}

export function markArticleDismissed(id: string): void {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    const arr = raw ? (JSON.parse(raw) as Array<{ id: string; dismissedAt: number }>) : [];
    const next = Array.isArray(arr) ? arr.filter((e) => e.id !== id) : [];
    next.push({ id, dismissedAt: Date.now() });
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
  } catch {}
}
