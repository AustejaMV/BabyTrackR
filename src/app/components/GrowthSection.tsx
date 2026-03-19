import React from 'react';

interface Measurement {
  value: number;
  percentile: number;
}

interface WeightMeasurement {
  date: number;
  weightKg: number;
}

interface GrowthSectionProps {
  babyName: string;
  weight: Measurement | null;
  length: Measurement | null;
  headCirc: Measurement | null;
  weightGainGrams: number | null;
  weeksSinceLastMeasure: number | null;
  ageWeeks?: number;
  weightHistory?: WeightMeasurement[];
  compact?: boolean;
  onLogMeasurement?: () => void;
}

export function getPercentileDescriptor(percentile: number): string {
  if (percentile < 3) return 'Well below average — please discuss with your GP';
  if (percentile <= 15) return 'Lighter than most — but consistent growth is what matters';
  if (percentile <= 50) return 'A little below average — normal';
  if (percentile <= 85) return 'Average weight';
  if (percentile <= 97) return 'Heavier than most';
  return 'Above most babies her age — mention at your next check';
}

function getPercentileBand(percentile: number): number {
  if (percentile < 3) return 0;
  if (percentile <= 15) return 1;
  if (percentile <= 50) return 2;
  if (percentile <= 85) return 3;
  if (percentile <= 97) return 4;
  return 5;
}

export function getTrajectoryDescriptor(
  measurements: WeightMeasurement[],
  ageWeeks: number,
): string | null {
  if (measurements.length < 2) return null;

  const sorted = [...measurements].sort((a, b) => a.date - b.date);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const weeksApart = (last.date - first.date) / (7 * 86400000);
  if (weeksApart < 2) return null;

  const gainKg = last.weightKg - first.weightKg;
  const gainGPerWeek = (gainKg * 1000) / weeksApart;
  const threshold = ageWeeks <= 12 ? 100 : 70;

  if (gainGPerWeek >= threshold) return 'Gaining steadily';
  if (gainGPerWeek < threshold) return 'Weight gain has slowed';

  return null;
}

function getConsistencyDescriptor(measurements: WeightMeasurement[]): string | null {
  if (measurements.length < 2) return null;
  const sorted = [...measurements].sort((a, b) => a.date - b.date);
  const last = sorted[sorted.length - 1];
  const secondLast = sorted[sorted.length - 2];
  if (
    last.weightKg > 0 &&
    secondLast.weightKg > 0 &&
    getPercentileBand(last.weightKg) === getPercentileBand(secondLast.weightKg)
  ) {
    return 'Growing along her curve';
  }
  return null;
}

function percentileToLabel(p: number): string {
  if (p < 25) return 'Lighter than most';
  if (p <= 75) return 'Average';
  return 'Heavier than most';
}

function percentileToLabelLength(p: number): string {
  if (p < 25) return 'Shorter than most';
  if (p <= 75) return 'Average';
  return 'Taller than most';
}

function percentileToLabelHead(p: number): string {
  if (p < 25) return 'Smaller than most';
  if (p <= 75) return 'Average';
  return 'Larger than most';
}

function getGrowthStatus(
  weightGain: number | null,
  weeks: number | null,
): { text: string; color: string } {
  if (weightGain == null || weeks == null || weeks === 0) {
    return { text: 'Not enough data yet', color: '#9a8080' };
  }
  const perWeek = weightGain / weeks;
  if (perWeek >= 150) {
    return { text: `Gaining ~${Math.round(perWeek)}g/week — on track`, color: '#2a6a2a' };
  }
  if (perWeek >= 100) {
    return { text: `Gaining ~${Math.round(perWeek)}g/week — steady`, color: '#2a6a2a' };
  }
  return { text: `Gaining ~${Math.round(perWeek)}g/week — worth monitoring`, color: '#8a5a00' };
}

function PercentileBar({
  percentile,
  lowLabel,
  midLabel,
  highLabel,
}: {
  percentile: number;
  lowLabel: string;
  midLabel: string;
  highLabel: string;
}) {
  return (
    <div>
      <div
        style={{
          position: 'relative',
          background: '#f0ece8',
          borderRadius: 3,
          height: 6,
          marginTop: 6,
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#2c1f1f',
            border: '2px solid #fff',
            top: -2,
            left: `calc(${percentile}% - 5px)`,
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 8,
          color: 'var(--mu)',
          marginTop: 2,
        }}
      >
        <span>{lowLabel}</span>
        <span>{midLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

export function GrowthSection({
  babyName,
  weight,
  length,
  headCirc,
  weightGainGrams,
  weeksSinceLastMeasure,
  ageWeeks = 0,
  weightHistory = [],
  compact,
  onLogMeasurement,
}: GrowthSectionProps) {
  const hasData = weight || length || headCirc;
  const status = getGrowthStatus(weightGainGrams, weeksSinceLastMeasure);
  const trajectoryDesc = getTrajectoryDescriptor(weightHistory, ageWeeks);
  const consistencyDesc = getConsistencyDescriptor(weightHistory);

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #ede0d4',
        borderRadius: compact ? 12 : 16,
        margin: compact ? '0 0 8px' : '0 12px 8px',
        padding: compact ? '12px 14px' : 14,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {!hasData ? (
        <div>
          <div style={{ fontSize: 11, color: '#9a8080', marginBottom: 8 }}>
            No measurements yet. Log weight, height, or head circumference to start tracking growth.
          </div>
          <div
            onClick={onLogMeasurement}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#d4604a',
              cursor: 'pointer',
            }}
          >
            + Log first measurement
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: '#2c1f1f', overflowWrap: 'break-word' as const }}>
              {babyName || 'Baby'} is growing well
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 20,
                background: status.color === '#2a6a2a' ? '#e4f4e4' : '#fef4e4',
                color: status.color,
              }}
            >
              {status.color === '#2a6a2a' ? 'On track' : 'Monitor'}
            </div>
          </div>

          {/* Measurement cells */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {weight && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#2c1f1f' }}>
                  {weight.value} kg
                </div>
                <PercentileBar
                  percentile={weight.percentile}
                  lowLabel="Light"
                  midLabel="Typical"
                  highLabel="Heavy"
                />
                <div style={{ fontSize: 9, color: '#9a8080', marginTop: 2 }}>
                  {getPercentileDescriptor(weight.percentile)}
                </div>
              </div>
            )}
            {length && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#2c1f1f' }}>
                  {length.value} cm
                </div>
                <PercentileBar
                  percentile={length.percentile}
                  lowLabel="Short"
                  midLabel="Typical"
                  highLabel="Tall"
                />
                <div style={{ fontSize: 9, color: '#9a8080', marginTop: 2 }}>
                  {percentileToLabelLength(length.percentile)}
                </div>
              </div>
            )}
            {headCirc && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#2c1f1f' }}>
                  {headCirc.value} cm
                </div>
                <PercentileBar
                  percentile={headCirc.percentile}
                  lowLabel="Small"
                  midLabel="Typical"
                  highLabel="Large"
                />
                <div style={{ fontSize: 9, color: '#9a8080', marginTop: 2 }}>
                  {percentileToLabelHead(headCirc.percentile)}
                </div>
              </div>
            )}
          </div>

          {/* Trend box */}
          {weightGainGrams != null && weeksSinceLastMeasure != null && (
            <div
              style={{
                background: status.color === '#2a6a2a' ? '#e4f4e4' : '#fef4e4',
                borderRadius: 10,
                padding: '8px 10px',
                marginTop: 8,
                fontSize: 10,
                color: status.color,
              }}
            >
              {status.text} over the last{' '}
              {weeksSinceLastMeasure === 1
                ? 'week'
                : `${weeksSinceLastMeasure} weeks`}
            </div>
          )}

          {/* Trajectory & consistency */}
          {(trajectoryDesc || consistencyDesc) && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {trajectoryDesc && (
                <div
                  style={{
                    fontSize: 10,
                    color: trajectoryDesc.includes('steadily') ? '#2a6a2a' : '#8a5a00',
                    fontWeight: 600,
                  }}
                >
                  {trajectoryDesc}
                </div>
              )}
              {consistencyDesc && (
                <div style={{ fontSize: 10, color: '#2a6a2a', fontWeight: 600 }}>
                  {consistencyDesc}
                </div>
              )}
            </div>
          )}

          {/* Log measurement link */}
          <div
            onClick={onLogMeasurement}
            style={{
              marginTop: 10,
              fontSize: 11,
              fontWeight: 600,
              color: '#d4604a',
              cursor: 'pointer',
            }}
          >
            + Log measurement
          </div>
        </>
      )}
    </div>
  );
}
