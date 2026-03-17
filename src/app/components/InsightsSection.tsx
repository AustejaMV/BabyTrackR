/**
 * Insights section: personalised insight cards from tracking history.
 * Free users see first 2 insights; premium sees all (gated via isPremium prop).
 */

import { generateInsights, type Insight, type InsightType } from '../utils/insights';
import type { SleepRecord, FeedingRecord, DiaperRecord, TummyTimeRecord, BottleRecord, BabyProfile } from '../types';

const TYPE_COLORS: Record<InsightType, string> = {
  sleep: 'var(--blue)',
  feed: 'var(--coral)',
  diaper: 'var(--grn)',
  tummy: 'var(--purp)',
  growth: 'var(--med-col)',
  pattern: 'var(--pink)',
};

const CONFIDENCE_DOT = {
  high: '●',
  medium: '◐',
  low: '○',
};

export interface InsightsSectionProps {
  sleepHistory: SleepRecord[];
  feedingHistory: FeedingRecord[];
  diaperHistory: DiaperRecord[];
  tummyHistory: TummyTimeRecord[];
  bottleHistory: BottleRecord[];
  babyProfile: BabyProfile | null;
  isPremium?: boolean;
}

function getAgeInWeeks(birthDateMs: number): number {
  const now = Date.now();
  return Math.max(0, Math.floor((now - birthDateMs) / (7 * 24 * 60 * 60 * 1000)));
}

export function InsightsSection({
  sleepHistory,
  feedingHistory,
  diaperHistory,
  tummyHistory,
  bottleHistory,
  babyProfile,
  isPremium = false,
}: InsightsSectionProps) {
  const ageInWeeks = babyProfile?.birthDate != null ? getAgeInWeeks(babyProfile.birthDate) : 0;
  const insights = generateInsights({
    sleepHistory: sleepHistory ?? [],
    feedingHistory: feedingHistory ?? [],
    diaperHistory: diaperHistory ?? [],
    tummyHistory: tummyHistory ?? [],
    bottleHistory: bottleHistory ?? [],
    babyProfile,
    ageInWeeks,
  });

  const displayInsights = isPremium ? insights : insights.slice(0, 2);
  const babyName = babyProfile?.name ?? 'your baby';

  return (
    <div role="region" aria-label="Insights" className="mb-4">
      <h3 className="text-[14px] font-medium mb-2" style={{ color: 'var(--tx)', fontFamily: 'Georgia, serif' }}>
        Insights
      </h3>
      {displayInsights.length === 0 ? (
        <p className="text-[14px]" style={{ color: 'var(--mu)', fontFamily: 'system-ui, sans-serif' }}>
          Log at least 7 days of data to see personalised insights for {babyName}.
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {displayInsights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
          {!isPremium && insights.length > 2 && (
            <div
              className="mt-3 rounded-xl border p-3"
              style={{ background: 'var(--bg2)', borderColor: 'var(--bd)' }}
            >
              <p className="text-[13px]" style={{ color: 'var(--mu)', fontFamily: 'system-ui, sans-serif' }}>
                Unlock all insights with Cradl Premium.
              </p>
              <button
                type="button"
                className="mt-2 text-[13px] font-medium"
                style={{ color: 'var(--pink)', fontFamily: 'system-ui, sans-serif' }}
                aria-label="Learn more about Premium"
              >
                Learn more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const color = TYPE_COLORS[insight.type] ?? 'var(--mu)';
  return (
    <div
      className="rounded-xl border p-3"
      style={{ background: 'var(--card)', borderColor: 'var(--bd)' }}
    >
      <div className="flex items-start gap-2">
        <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[14px]" style={{ background: `${color}22`, color }}>
          {insight.icon === 'moon' && '🌙'}
          {insight.icon === 'trending-down' && '📉'}
          {insight.icon === 'scale' && '⚖️'}
          {insight.icon === 'alert-circle' && '⚠️'}
          {insight.icon === 'clock' && '🕐'}
          {insight.icon === 'trending-up' && '📈'}
          {insight.icon === 'activity' && '💪'}
          {!['moon', 'trending-down', 'scale', 'alert-circle', 'clock', 'trending-up', 'activity'].includes(insight.icon) && '💡'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-serif" style={{ color: 'var(--tx)', fontFamily: 'Georgia, serif' }}>
            {insight.message}
          </p>
          {insight.detail && (
            <p className="text-[12px] mt-1" style={{ color: 'var(--mu)', fontFamily: 'system-ui, sans-serif' }}>
              {insight.detail}
            </p>
          )}
          <span
            className="inline-block mt-1.5 text-[11px]"
            style={{ color: 'var(--mu)', fontFamily: 'system-ui, sans-serif' }}
            title={`Confidence: ${insight.confidence}`}
          >
            {CONFIDENCE_DOT[insight.confidence]}
          </span>
        </div>
      </div>
    </div>
  );
}
