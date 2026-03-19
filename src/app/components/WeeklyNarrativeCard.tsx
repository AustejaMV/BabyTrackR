import React from 'react';

interface WeeklyNarrativeCardProps {
  babyName: string;
  weekNumber: number;
  summaryText: string;
  stats: {
    feedsPerDay: number;
    sleepPerDay: string;
    nappiesPerDay: number;
  };
  dailyBars: number[];
  compact?: boolean;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function WeeklyNarrativeCard({
  babyName,
  weekNumber,
  summaryText,
  stats,
  dailyBars,
  compact,
}: WeeklyNarrativeCardProps) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #fef5ee, #eef4f8)',
        border: '1px solid #ede0d4',
        borderRadius: 18,
        padding: 16,
        margin: compact ? '0 0 8px' : '0 12px 8px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--mu)' }}>Week {weekNumber}</div>

      <div
        style={{
          fontSize: 17,
          fontFamily: 'Georgia, serif',
          fontWeight: 600,
          color: '#2c1f1f',
          marginTop: 4,
          lineHeight: 1.35,
          overflowWrap: 'break-word',
        }}
      >
        {summaryText}
      </div>

      {/* Stat cells */}
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        {[
          { value: stats.feedsPerDay, label: 'Feeds / day' },
          { value: stats.sleepPerDay, label: 'Sleep / day' },
          { value: stats.nappiesPerDay, label: 'Nappies / day' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.6)',
              borderRadius: 10,
              padding: 6,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: '#2c1f1f' }}>
              {stat.value}
            </div>
            <div
              style={{
                fontSize: 9,
                color: 'var(--mu)',
                textTransform: 'uppercase',
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Daily bars */}
      <div
        style={{
          display: 'flex',
          gap: 3,
          marginTop: 10,
          alignItems: 'flex-end',
          height: 32,
        }}
      >
        {dailyBars.map((value, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              borderRadius: 3,
              background: '#d4604a',
              opacity: 0.7,
              height: value * 32,
            }}
          />
        ))}
      </div>

      {/* Day labels */}
      <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
        {DAY_LABELS.map((label, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              fontSize: 8,
              color: 'var(--mu)',
              textAlign: 'center',
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
