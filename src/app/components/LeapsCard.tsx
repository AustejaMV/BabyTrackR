import { useState } from "react";
import { getLeapAtWeek, getNextLeap, getFreePreviewText } from "../data/leaps";
import { usePremium } from "../contexts/PremiumContext";
import { PremiumGate } from "./PremiumGate";

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function getAgeWeeks(birthDateMs: number): number {
  return Math.floor((Date.now() - birthDateMs) / MS_PER_WEEK);
}

interface LeapsCardProps {
  birthDateMs: number | null;
}

const LEAP_SOURCE_LINKS = [
  {
    label: "Wonder Weeks — mental leaps overview",
    url: "https://www.thewonderweeks.com/mental-leaps-and-wonder-weeks/",
  },
  {
    label: "NHS — baby development",
    url: "https://www.nhs.uk/baby/babys-development/",
  },
];

export function LeapsCard({ birthDateMs }: LeapsCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const { isPremium } = usePremium();
  if (birthDateMs == null) return null;
  const ageWeeks = getAgeWeeks(birthDateMs);
  const currentLeap = getLeapAtWeek(ageWeeks);
  const nextLeap = getNextLeap(ageWeeks);
  const freePreview = getFreePreviewText(ageWeeks);

  if (showPaywall && !isPremium) {
    return (
      <PremiumGate feature="Developmental leaps — full description, signs & tips">
        <button
          type="button"
          onClick={() => setShowPaywall(false)}
          className="text-[13px] mt-2"
          style={{ color: "var(--mu)" }}
        >
          Back
        </button>
      </PremiumGate>
    );
  }

  if (currentLeap) {
    const showFull = isPremium;
    return (
      <div
        className="rounded-2xl border p-4 mb-3"
        style={{ background: "rgba(200, 168, 240, 0.2)", borderColor: "var(--purp)" }}
      >
        <p className="text-[11px] uppercase tracking-wider mb-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
          What to expect
        </p>
        <p className="text-[16px] font-medium mb-0.5" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
          {currentLeap.name}
        </p>
        {showFull ? (
          <button type="button" onClick={() => setExpanded(!expanded)} className="w-full text-left">
            <p className="text-[13px] mb-1.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
              {currentLeap.description}
            </p>
            <ul className="list-disc list-inside text-[13px] space-y-0.5" style={{ color: "var(--tx)", fontFamily: "system-ui, sans-serif" }}>
              {currentLeap.signs.slice(0, 3).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
            {expanded && (
              <div className="mt-2 pt-2 border-t border-[var(--bd)]">
                <p className="text-[12px] font-medium mb-1" style={{ color: "var(--mu)" }}>Tips</p>
                <ul className="list-disc list-inside text-[13px] space-y-0.5" style={{ color: "var(--tx)" }}>
                  {currentLeap.tips.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
            <span className="text-[11px]" style={{ color: "var(--mu)" }}>{expanded ? "Tap to collapse" : "Tap for more tips"}</span>
          </button>
        ) : (
          <>
            <p className="text-[13px] mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
              {freePreview}
            </p>
            <button
              type="button"
              onClick={() => setShowPaywall(true)}
              className="rounded-xl px-3 py-2 text-[13px] border"
              style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
            >
              See more
            </button>
          </>
        )}
        <div className="mt-2 text-[10px]" style={{ color: "var(--mu)", lineHeight: 1.45 }}>
          <span style={{ fontWeight: 600 }}>Sources: </span>
          {LEAP_SOURCE_LINKS.map((src, idx) => (
            <span key={src.url}>
              {idx > 0 ? <span> · </span> : null}
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--blue)", textDecoration: "underline", textUnderlineOffset: 2 }}
              >
                {src.label}
              </a>
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (nextLeap && nextLeap.inDays <= 7) {
    return (
      <div
        className="rounded-2xl border p-4 mb-3"
        style={{ background: "rgba(200, 168, 240, 0.1)", borderColor: "var(--bd)" }}
      >
        <p className="text-[11px] uppercase tracking-wider mb-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
          Coming soon
        </p>
        <p className="text-[15px] font-medium mb-0.5" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
          {nextLeap.leap.name}
        </p>
        <p className="text-[12px] mt-0.5" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
          {freePreview || `In about ${nextLeap.inDays} day${nextLeap.inDays !== 1 ? "s" : ""}`}
        </p>
        {!isPremium && (
          <button
            type="button"
            onClick={() => setShowPaywall(true)}
            className="rounded-xl px-3 py-2 text-[13px] border mt-2"
            style={{ borderColor: "var(--bd)", background: "var(--bg2)", color: "var(--tx)" }}
          >
            See more
          </button>
        )}
        <div className="mt-2 text-[10px]" style={{ color: "var(--mu)", lineHeight: 1.45 }}>
          <span style={{ fontWeight: 600 }}>Sources: </span>
          {LEAP_SOURCE_LINKS.map((src, idx) => (
            <span key={src.url}>
              {idx > 0 ? <span> · </span> : null}
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--blue)", textDecoration: "underline", textUnderlineOffset: 2 }}
              >
                {src.label}
              </a>
            </span>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
