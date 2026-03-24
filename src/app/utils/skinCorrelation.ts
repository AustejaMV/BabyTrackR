/**
 * Correlate skin triggers with subsequent flares. Never use 'allergy' or 'allergic'.
 */

import type { SkinTriggerEntry, SkinFlareEntry, SkinCorrelation, CorrelationLikelihood } from "../types/skin";

export interface SkinInsight {
  type: string;
  message: string;
  confidence: "high" | "medium" | "low";
}

export function computeSkinCorrelations(
  triggers: SkinTriggerEntry[],
  flares: SkinFlareEntry[],
  windowHours: number = 48
): SkinCorrelation[] {
  if (!Array.isArray(triggers) || triggers.length === 0) return [];

  const flareList = Array.isArray(flares) ? flares : [];
  const windowMs = windowHours * 60 * 60 * 1000;

  return triggers.map((trigger) => {
    const triggerTime = new Date(trigger.timestamp).getTime();
    const subsequent = flareList
      .filter((f) => {
        const t = new Date(f.timestamp).getTime();
        return t > triggerTime && t - triggerTime <= windowMs;
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0] ?? null;

    let hoursToFlare: number | null = null;
    let likelihood: CorrelationLikelihood = "coincidental";
    if (subsequent) {
      hoursToFlare = (new Date(subsequent.timestamp).getTime() - triggerTime) / (60 * 60 * 1000);
      if (hoursToFlare <= 4) likelihood = "likely";
      else if (hoursToFlare <= 24) likelihood = "possible";
      else likelihood = "coincidental";
    }

    return {
      trigger,
      subsequentFlare: subsequent,
      hoursToFlare,
      likelihood,
    };
  });
}

export function generateSkinInsights(
  correlations: SkinCorrelation[],
  _triggers: SkinTriggerEntry[],
  _flares: SkinFlareEntry[]
): SkinInsight[] {
  if (!Array.isArray(correlations) || correlations.length < 5) return [];

  const insights: SkinInsight[] = [];

  const likelyByDescription = new Map<string, number>();
  for (const c of correlations) {
    if (c.likelihood === "likely") {
      const d = c.trigger.description;
      likelyByDescription.set(d, (likelyByDescription.get(d) ?? 0) + 1);
    }
  }
  for (const [desc, count] of likelyByDescription) {
    if (count >= 3) {
      insights.push({
        type: "trigger_flare",
        message: `Every time "${desc}" was introduced, a flare followed within 4 hours. This is worth discussing with your GP or dermatologist.`,
        confidence: "high",
      });
    }
  }

  const byType = new Map<string, number>();
  for (const c of correlations) {
    if (c.subsequentFlare != null) {
      byType.set(c.trigger.triggerType, (byType.get(c.trigger.triggerType) ?? 0) + 1);
    }
  }
  for (const [triggerType, count] of byType) {
    if (count >= 5) {
      const typeLabel = triggerType.replace(/_/g, " ");
      insights.push({
        type: "trigger_type",
        message: `${typeLabel} products or factors seem to coincide with flare-ups. Consider keeping a note of specific items to share at your next appointment.`,
        confidence: "medium",
      });
    }
  }

  return insights.filter((i) => !i.message.toLowerCase().includes("allergy") && !i.message.toLowerCase().includes("allergic"));
}
