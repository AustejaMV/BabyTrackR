import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Baby, Check } from "lucide-react";
import { DATE_DISPLAY } from "../utils/dateUtils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { DEFAULT_MILESTONES } from "../utils/babyUtils";
import type { Milestone as MilestoneType } from "../types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** px per week along the timeline */
const PX_PER_WEEK = 18;
/** Vertical amplitude of the winding path (px) */
const WAVE_AMP = 32;
/** Vertical center of the path */
const PATH_CENTER_Y = 88;
/** Card size (node) */
const CARD_SIZE = 64;
/** Path stroke width */
const STROKE = 4;

interface MilestonesTimelineProps {
  birthDateMs: number;
  milestones: MilestoneType[];
  onSave: (milestones: MilestoneType[]) => void;
  /** Baby photo to show in achieved nodes; if missing, show baby icon */
  photoDataUrl?: string;
}

/** Spore-like horizontal timeline: winding path, nodes with baby face/icon when achieved. */
export function MilestonesTimeline({ birthDateMs, milestones, onSave, photoDataUrl }: MilestonesTimelineProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");

  const list = milestones.length > 0
    ? milestones
    : DEFAULT_MILESTONES.map((m) => ({ ...m, achievedAt: undefined as number | undefined }));

  const maxWeeks = useMemo(() => {
    const maxDays = Math.max(...list.map((m) => m.typicalDaysMax), 420);
    return Math.ceil(maxDays / 7);
  }, [list]);

  const totalWidth = maxWeeks * PX_PER_WEEK + CARD_SIZE * 2;

  const points = useMemo(() => {
    return list.map((m, i) => {
      const midDays = (m.typicalDaysMin + m.typicalDaysMax) / 2;
      const weeks = midDays / 7;
      const x = weeks * PX_PER_WEEK + CARD_SIZE;
      const y = PATH_CENTER_Y + WAVE_AMP * Math.sin(i * 0.65);
      return { ...m, x, y, weeks };
    });
  }, [list]);

  const pathD = useMemo(() => {
    if (points.length === 0) return "";
    const [first, ...rest] = points;
    let d = `M ${first.x} ${first.y}`;
    rest.forEach((p) => { d += ` L ${p.x} ${p.y}`; });
    return d;
  }, [points]);

  const handleSetAchieved = (id: string, dateStr: string) => {
    const ms = dateStr ? new Date(dateStr).getTime() : undefined;
    const next = list.map((m) => (m.id === id ? { ...m, achievedAt: ms } : m));
    onSave(next);
    setEditingId(null);
    setEditDate("");
  };

  const birthDayStart = new Date(birthDateMs);
  birthDayStart.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        Tap a milestone to set when your baby reached it. Your baby&apos;s face appears when achieved.
      </p>

      {/* Time axis + path (horizontal scroll) */}
      <div className="overflow-x-auto -mx-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gradient-to-b from-slate-50/80 to-slate-100/80 dark:from-gray-800/80 dark:to-gray-900/80" style={{ maxWidth: "100%" }}>
        <div className="relative flex-shrink-0 pl-4 pr-4 pt-6 pb-2" style={{ width: totalWidth, minHeight: 200 }}>
          {/* Axis labels (weeks) */}
          <div className="relative h-4 mb-1" style={{ width: totalWidth }}>
            {[0, 12, 24, 36, 48, 60].filter((w) => w <= maxWeeks).map((w) => (
              <span
                key={w}
                className="absolute text-[10px] text-gray-500 dark:text-gray-400"
                style={{ left: CARD_SIZE + w * PX_PER_WEEK, transform: "translateX(-50%)" }}
              >
                {w}w
              </span>
            ))}
          </div>

          {/* Winding path + nodes */}
          <div className="relative" style={{ width: totalWidth, height: 180 }}>
            <svg width={totalWidth} height={180} className="overflow-visible">
              <defs>
                <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#94a3b8" />
                  <stop offset="100%" stopColor="#64748b" />
                </linearGradient>
                <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2" />
                </filter>
              </defs>
              <path
                d={pathD}
                fill="none"
                stroke="url(#pathGrad)"
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {points.map((m) => {
              const achievedDays = m.achievedAt != null
                ? Math.floor((m.achievedAt - birthDayStart.getTime()) / MS_PER_DAY)
                : null;
              const isEditing = editingId === m.id;
              const achieved = !!m.achievedAt;

              return (
                <div
                  key={m.id}
                  className="absolute flex flex-col items-center"
                  style={{
                    left: m.x - CARD_SIZE / 2,
                    top: m.y - CARD_SIZE / 2,
                    width: CARD_SIZE,
                    height: CARD_SIZE,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditing) return;
                      setEditingId(m.id);
                      setEditDate(m.achievedAt ? format(m.achievedAt, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
                    }}
                    className={`w-full h-full rounded-2xl border-2 flex items-center justify-center overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      achieved
                        ? "bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 border-green-400 dark:border-green-500 shadow-md"
                        : "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                    }`}
                    style={{ filter: "url(#nodeShadow)" }}
                  >
                    {achieved ? (
                      photoDataUrl && photoDataUrl.startsWith("data:image") ? (
                        <img
                          src={photoDataUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-0.5">
                          <Baby className="w-8 h-8 text-green-600 dark:text-green-400" strokeWidth={1.5} />
                          <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                      )
                    ) : (
                      <Baby className="w-8 h-8 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
                    )}
                  </button>
                  <span className="text-[10px] font-medium text-center mt-1.5 text-gray-700 dark:text-gray-300 leading-tight max-w-[72px]">
                    {m.label}
                  </span>
                  <span className="text-[9px] text-gray-500 dark:text-gray-400">
                    {Math.round(m.typicalDaysMin / 7)}–{Math.round(m.typicalDaysMax / 7)}w
                  </span>
                  {achievedDays != null && (
                    <span className="text-[9px] text-green-600 dark:text-green-400">
                      {format(m.achievedAt!, DATE_DISPLAY)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Inline edit (below timeline) */}
      {editingId && (() => {
        const m = list.find((x) => x.id === editingId);
        if (!m) return null;
        return (
          <div className="flex flex-wrap items-center gap-2 mt-3 p-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium dark:text-white">{m.label}</span>
            <Input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="text-sm w-36"
            />
            <Button size="sm" onClick={() => handleSetAchieved(m.id, editDate)}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditDate(""); }}>Cancel</Button>
          </div>
        );
      })()}
    </div>
  );
}
