/**
 * 7-day bar chart of mum's sleep categories + support card + "Ask someone to cover" share.
 */

import { useState } from "react";
import { getMumSleepHistory } from "../utils/mumSleepStorage";
import { formatDayMonthShort } from "../utils/dateUtils";
import { getLanguage } from "../utils/languageStorage";
import { analyseMumSleep, wasSupportCardShownRecently, markSupportCardShown } from "../utils/mumSleepAnalysis";

const RANGE_HEIGHTS: Record<string, number> = {
  under_2h: 0.25,
  "2_to_4h": 0.5,
  "4_to_6h": 0.75,
  "6h_plus": 1,
};

export function MumSleepHistory({ babyName }: { babyName?: string | null }) {
  const [dismissed, setDismissed] = useState(false);
  const history = getMumSleepHistory();
  const summary = analyseMumSleep(history, babyName);
  const showSupport = summary?.shouldShowSupportCard === true && !wasSupportCardShownRecently() && !dismissed;

  if (!summary || history.length < 3) {
    return (
      <div className="rounded-2xl border p-4 mb-3" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
        <p className="text-[13px]" style={{ color: "var(--mu)" }}>
          Log at least 3 nights to see your sleep pattern.
        </p>
      </div>
    );
  }

  const last7 = summary.last7DaysEntries;
  const name = babyName ?? "baby";

  return (
    <div className="rounded-2xl border p-4 mb-3" style={{ background: "var(--card)", borderColor: "var(--bd)" }}>
      <p className="text-[13px] font-medium mb-2" style={{ color: "var(--tx)" }}>
        Your sleep (last 7 days)
      </p>
      <div className="flex items-end gap-1 h-16 mb-3">
        {last7.map((e) => (
          <div key={e.id} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className="w-full rounded-t min-h-[4px] transition-all"
              style={{
                height: `${(RANGE_HEIGHTS[e.sleepRange] ?? 0.5) * 48}px`,
                background: "linear-gradient(180deg, rgba(147,112,219,0.4) 0%, rgba(147,112,219,0.8) 100%)",
              }}
            />
            <span className="text-[10px]" style={{ color: "var(--mu)" }}>
              {formatDayMonthShort(new Date(e.date).getTime(), locale)}
            </span>
          </div>
        ))}
      </div>
      {showSupport && summary.supportMessage && (
        <div className="mt-3 p-3 rounded-xl border flex flex-col gap-2" style={{ background: "rgba(147,112,219,0.1)", borderColor: "var(--bd)" }}>
          <p className="text-[13px] leading-snug" style={{ color: "var(--tx)" }}>
            {summary.supportMessage}
          </p>
          <button
            type="button"
            onClick={() => {
              markSupportCardShown();
              setDismissed(true);
              if (typeof navigator !== "undefined" && navigator.share) {
                navigator.share({
                  text: `Hey, I'm really struggling with sleep today. Could you take ${name} for an hour or two so I can rest? (please)`,
                  title: "Need a break",
                }).catch(() => {});
              }
            }}
            className="py-2 px-3 rounded-lg text-sm font-medium w-fit"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            Ask someone to cover
          </button>
          <button type="button" onClick={() => { markSupportCardShown(); setDismissed(true); }} className="text-xs opacity-70" style={{ color: "var(--mu)" }}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
