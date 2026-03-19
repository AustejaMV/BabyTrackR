import { useMemo } from 'react';
import { hasEnoughDataForPlaybook } from '../utils/dailySummary';
import { generateInsights, type Insight, type GenerateInsightsParams } from '../utils/insights';
import { PremiumGate } from './PremiumGate';
import { usePremium } from '../contexts/PremiumContext';
import { useBaby } from '../contexts/BabyContext';
import { readStoredArray } from '../utils/warningUtils';
import type {
  SleepRecord,
  FeedingRecord,
  DiaperRecord,
  TummyTimeRecord,
  BottleRecord,
} from '../types';

const FONT = 'system-ui, sans-serif';
const SERIF = 'Georgia, serif';
const MUTED = 'var(--mu)';
const DAYS_REQUIRED = 28;

function readHistory<T>(key: string): T[] {
  try {
    return readStoredArray<T>(key);
  } catch {
    return [];
  }
}

function ConfidenceDot({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  const size = 10;
  if (confidence === 'high') {
    return (
      <svg width={size} height={size} viewBox="0 0 10 10">
        <circle cx="5" cy="5" r="4" fill="#2a6a2a" />
      </svg>
    );
  }
  if (confidence === 'medium') {
    return (
      <svg width={size} height={size} viewBox="0 0 10 10">
        <circle cx="5" cy="5" r="4" fill="#2a6a2a" />
        <rect x="5" y="1" width="4" height="8" fill="#fff" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 10 10">
      <circle cx="5" cy="5" r="3.5" stroke="#2a6a2a" strokeWidth="1" fill="none" />
    </svg>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #ede0d4',
        borderRadius: 14,
        padding: 14,
        fontFamily: FONT,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flexShrink: 0, paddingTop: 3 }}>
          <ConfidenceDot confidence={insight.confidence} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontFamily: SERIF,
              color: '#2c1f1f',
              lineHeight: 1.45,
            }}
          >
            {insight.message}
          </div>
          {insight.detail && (
            <div
              style={{
                fontSize: 11,
                color: MUTED,
                marginTop: 4,
                lineHeight: 1.4,
              }}
            >
              Based on {insight.detail}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PersonalPlaybook() {
  const { activeBaby } = useBaby();
  const { isPremium } = usePremium();

  const sleepHistory = useMemo(() => readHistory<SleepRecord>('sleepHistory'), []);
  const feedingHistory = useMemo(() => readHistory<FeedingRecord>('feedingHistory'), []);
  const diaperHistory = useMemo(() => readHistory<DiaperRecord>('diaperHistory'), []);
  const tummyHistory = useMemo(() => readHistory<TummyTimeRecord>('tummyTimeHistory'), []);
  const bottleHistory = useMemo(() => readHistory<BottleRecord>('bottleHistory'), []);

  const birthMs = activeBaby?.birthDate
    ? typeof activeBaby.birthDate === 'number'
      ? activeBaby.birthDate
      : new Date(activeBaby.birthDate).getTime()
    : null;
  const ageInWeeks = birthMs ? (Date.now() - birthMs) / (7 * 86400000) : 0;

  const enoughData = hasEnoughDataForPlaybook(sleepHistory, feedingHistory);

  const daysOfData = useMemo(() => {
    const allTimestamps = [
      ...sleepHistory.map((s) => s.startTime),
      ...feedingHistory.map((f) => f.endTime ?? f.timestamp ?? 0),
    ].filter((t) => t > 0);
    if (allTimestamps.length === 0) return 0;
    const earliest = Math.min(...allTimestamps);
    return Math.floor((Date.now() - earliest) / 86400000);
  }, [sleepHistory, feedingHistory]);

  const insights = useMemo(() => {
    if (!enoughData) return [];
    const params: GenerateInsightsParams = {
      sleepHistory,
      feedingHistory,
      diaperHistory,
      tummyHistory,
      bottleHistory,
      babyProfile: activeBaby
        ? { birthDate: activeBaby.birthDate, name: activeBaby.name }
        : null,
      ageInWeeks,
    };
    return generateInsights(params);
  }, [enoughData, sleepHistory, feedingHistory, diaperHistory, tummyHistory, bottleHistory, activeBaby, ageInWeeks]);

  const daysToGo = Math.max(0, DAYS_REQUIRED - daysOfData);

  if (!enoughData) {
    const progress = Math.min(1, daysOfData / DAYS_REQUIRED);
    return (
      <div
        style={{
          background: '#fff',
          border: '1px solid #ede0d4',
          borderRadius: 14,
          margin: '0 12px 8px',
          padding: 14,
          fontFamily: FONT,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: '#2c1f1f', marginBottom: 6 }}>
          Your personal playbook
        </div>
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>
          Your personal playbook needs more data — {daysToGo} day{daysToGo !== 1 ? 's' : ''} to go
        </div>
        <div
          style={{
            background: '#f0ece8',
            borderRadius: 4,
            height: 6,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress * 100}%`,
              height: '100%',
              background: '#d4604a',
              borderRadius: 4,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>
    );
  }

  if (insights.length === 0) return null;

  if (isPremium) {
    return (
      <div style={{ margin: '0 12px 8px' }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#2c1f1f',
            fontFamily: FONT,
            marginBottom: 8,
          }}
        >
          Your personal playbook
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </div>
    );
  }

  const [first, ...rest] = insights;
  return (
    <div style={{ margin: '0 12px 8px' }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#2c1f1f',
          fontFamily: FONT,
          marginBottom: 8,
        }}
      >
        Your personal playbook
      </div>
      <InsightCard insight={first} />
      {rest.length > 0 && (
        <div style={{ position: 'relative', marginTop: 8 }}>
          <div
            style={{
              filter: 'blur(4px)',
              pointerEvents: 'none',
              userSelect: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {rest.slice(0, 2).map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PremiumGate feature={`Unlock ${rest.length} more personalised insight${rest.length !== 1 ? 's' : ''}`}>
              <></>
            </PremiumGate>
          </div>
        </div>
      )}
    </div>
  );
}
