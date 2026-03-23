import React, { useState } from 'react';

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

const GROWTH_SOURCE_LINKS = [
  {
    label: "WHO Child Growth Standards",
    url: "https://www.who.int/tools/child-growth-standards",
  },
  {
    label: "WHO standards methodology",
    url: "https://www.who.int/tools/child-growth-standards/standards",
  },
];

export function getPercentileDescriptor(percentile: number): string {
  if (percentile < 3) return 'Well below average — please discuss with your GP';
  if (percentile <= 15) return 'Lighter than most — but consistent growth is what matters';
  if (percentile <= 50) return 'A little below average — normal';
  if (percentile <= 85) return 'Average weight';
  if (percentile <= 97) return 'Heavier than most';
  return 'Above most babies her age — mention at your next check';
}

/** Plain-English explainer for “what does this label mean?” */
export function getWeightPercentileMeaning(percentile: number, babyName: string): string {
  const p = Math.round(Math.min(100, Math.max(0, percentile)));
  const lighterCount = Math.max(0, Math.min(100, 100 - p));
  const nm = babyName.trim() || 'Baby';
  return `Out of 100 babies her age, about ${lighterCount} would weigh less than ${nm}. If she’s gaining steadily, she’s in a healthy range — the trend matters more than the exact number.`;
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
  const [weightHelpOpen, setWeightHelpOpen] = useState(false);
  const hasData = weight || length || headCirc;
  const status = getGrowthStatus(weightGainGrams, weeksSinceLastMeasure);
  const trajectoryDesc = getTrajectoryDescriptor(weightHistory, ageWeeks);
  const consistencyDesc = getConsistencyDescriptor(weightHistory);
  const displayName = babyName?.trim() || 'Baby';

  const perWeekG =
    weightGainGrams != null && weeksSinceLastMeasure != null && weeksSinceLastMeasure > 0
      ? weightGainGrams / weeksSinceLastMeasure
      : null;
  const typicalWeeklyBand =
    ageWeeks <= 12 ? 'about 150–200g' : ageWeeks <= 26 ? 'about 100–150g' : 'about 70–100g';
  const showSlowGainPanel =
    trajectoryDesc === 'Weight gain has slowed' ||
    (perWeekG != null && perWeekG < 100 && weightGainGrams != null && weeksSinceLastMeasure != null && weeksSinceLastMeasure >= 1);
  const showSmallSideReassurance =
    weight != null &&
    weight.percentile >= 3 &&
    weight.percentile < 25 &&
    consistencyDesc === 'Growing along her curve';

  let headerSubtitle = '';
  if (status.color === '#2a6a2a') {
    headerSubtitle = consistencyDesc ? `✓ ${consistencyDesc} · no concerns` : '✓ Consistent trend · no concerns';
  } else if (status.color === '#8a5a00') {
    headerSubtitle = '⚠ Worth monitoring — mention at your next check if unsure';
  } else {
    headerSubtitle = 'Log two weights a few weeks apart to see trend';
  }

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
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2c1f1f', overflowWrap: 'break-word' as const }}>
                {showSlowGainPanel ? "Let's keep an eye on growth" : `${displayName} is growing well`}
              </div>
              <div style={{ fontSize: 9, color: status.color === '#2a6a2a' ? '#4a8c4a' : '#9a8080', marginTop: 3, lineHeight: 1.35 }}>
                {headerSubtitle}
              </div>
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 20,
                flexShrink: 0,
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
                <button
                  type="button"
                  onClick={() => setWeightHelpOpen((o) => !o)}
                  style={{
                    marginTop: 6,
                    fontSize: 8,
                    color: '#c0a898',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    textAlign: 'left' as const,
                    textDecoration: 'underline',
                    textUnderlineOffset: 2,
                  }}
                >
                  What does &quot;{percentileToLabel(weight.percentile).toLowerCase()}&quot; mean? {weightHelpOpen ? '↑' : '↓'}
                </button>
                {weightHelpOpen && (
                  <p style={{ fontSize: 8, color: '#9a8080', marginTop: 4, lineHeight: 1.45 }}>
                    {getWeightPercentileMeaning(weight.percentile, displayName)}
                  </p>
                )}
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

          {/* Trend box — sentence-first (redesign) */}
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
              <div style={{ fontWeight: 600, marginBottom: 2 }}>
                {trajectoryDesc === 'Gaining steadily' ? 'Gaining steadily ✓' : trajectoryDesc === 'Weight gain has slowed' ? 'Weight gain has slowed' : 'Recent gain'}
              </div>
              <div style={{ fontWeight: 400, lineHeight: 1.45 }}>
                {displayName} gained <strong>{weightGainGrams}g</strong> in the last{' '}
                {weeksSinceLastMeasure === 1 ? 'week' : `${weeksSinceLastMeasure} weeks`} ({status.text.toLowerCase()}).
                Consistent gain matters more than the exact percentile.
              </div>
            </div>
          )}

          {showSlowGainPanel && weightGainGrams != null && weeksSinceLastMeasure != null && (
            <div
              style={{
                marginTop: 10,
                borderRadius: 12,
                padding: '10px 12px',
                border: '1px solid rgba(245, 166, 35, 0.45)',
                background: '#fffdf8',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: '#2c1f1f' }}>Weight gain has slowed</div>
              <div style={{ fontSize: 9, color: '#d4904a', marginTop: 2, fontWeight: 600 }}>⚠ Worth mentioning at your next check</div>
              <p style={{ fontSize: 10, color: '#3d2c2c', lineHeight: 1.5, margin: '8px 0' }}>
                {displayName} gained {weightGainGrams}g in the last {weeksSinceLastMeasure === 1 ? 'week' : `${weeksSinceLastMeasure} weeks`} — a bit
                under the {typicalWeeklyBand}/week often seen around this age. Often nothing to worry about; your health visitor will want the full picture.
              </p>
              <div style={{ background: '#fff8e8', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                <div style={{ fontSize: 9, color: '#7a5000', fontWeight: 600, marginBottom: 2 }}>What to say at your appointment:</div>
                <div style={{ fontSize: 9, color: '#9a6020', lineHeight: 1.4 }}>
                  &quot;Her weight gain is around {perWeekG != null ? `${Math.round(perWeekG)}g` : '—'} per week lately — I&apos;d like your opinion.&quot;
                </div>
              </div>
              <div style={{ fontSize: 9, color: '#9a8080', lineHeight: 1.4 }}>
                One slower stretch is common. If it continues for 2–3 months, it&apos;s worth a closer look together.
              </div>
            </div>
          )}

          {showSmallSideReassurance && (
            <div
              style={{
                marginTop: 10,
                borderRadius: 12,
                padding: '10px 12px',
                border: '1px solid rgba(122, 179, 212, 0.5)',
                background: '#f5fafc',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: '#2c1f1f' }}>On the smaller side — and that&apos;s fine</div>
              <div style={{ fontSize: 9, color: '#4080a0', marginTop: 2, fontWeight: 600 }}>Consistent trend · no concerns</div>
              <p style={{ fontSize: 10, color: '#3d2c2c', lineHeight: 1.5, margin: '8px 0 6px' }}>
                {displayName} is lighter than many babies her age — but she&apos;s been tracking along her own curve, and she&apos;s growing steadily.
                Small babies who gain consistently are usually healthy babies.
              </p>
              <div style={{ background: '#d4eaf7', borderRadius: 8, padding: '7px 10px', fontSize: 9, color: '#2a5070', lineHeight: 1.4 }}>
                Growing along <em>her</em> curve matters more than which average line she sits near.
              </div>
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

          <div style={{ marginTop: 8, fontSize: 9, color: "var(--mu)", lineHeight: 1.45 }}>
            <span style={{ fontWeight: 600 }}>Sources: </span>
            {GROWTH_SOURCE_LINKS.map((src, idx) => (
              <React.Fragment key={src.url}>
                {idx > 0 ? <span> · </span> : null}
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#4080a0", textDecoration: "underline", textUnderlineOffset: 2 }}
                >
                  {src.label}
                </a>
              </React.Fragment>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
