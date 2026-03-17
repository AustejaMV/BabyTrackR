/**
 * Personal playbook — "what worked" tips from 4+ weeks of data. Premium when enough data.
 */

import { useMemo } from "react";
import { generatePlaybook, hasEnoughDataForPlaybook } from "../utils/dailySummary";
import { PremiumGate } from "./PremiumGate";
import type { SleepRecord, FeedingRecord } from "../types";

export interface PlaybookCardProps {
  sleepHistory: SleepRecord[];
  feedingHistory: FeedingRecord[];
  babyName: string | null;
  isPremium: boolean;
}

export function PlaybookCard({ sleepHistory, feedingHistory, babyName, isPremium }: PlaybookCardProps) {
  const { tips, needsPremium } = useMemo(() => {
    const enough = hasEnoughDataForPlaybook(sleepHistory, feedingHistory);
    const tips = generatePlaybook(sleepHistory, feedingHistory, babyName);
    return { tips, needsPremium: enough && !isPremium };
  }, [sleepHistory, feedingHistory, babyName, isPremium]);

  if (tips.length === 0) return null;

  const content = (
    <div
      className="rounded-2xl border p-4 mb-3"
      style={{ background: "var(--card)", borderColor: "var(--bd)" }}
      role="region"
      aria-label="Personal playbook"
    >
      <p className="text-[12px] uppercase tracking-wider mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
        {babyName ? `${babyName}'s personal playbook` : "Personal playbook"}
      </p>
      <ul className="space-y-2 text-[13px]" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
        {tips.map((t) => (
          <li key={t.id}>— {t.text}</li>
        ))}
      </ul>
    </div>
  );

  if (needsPremium) {
    return (
      <PremiumGate feature="Personal playbook">
        {content}
      </PremiumGate>
    );
  }
  return content;
}
