import { useState, useEffect, useRef, useCallback } from "react";
import { addHandoffLog } from "../utils/handoffApi";
import { addLocalHandoffLog } from "../utils/handoffGenerator";

const IconBreastL = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10c0-3.5 3.5-6 8-6s8 2.5 8 6c0 4.5-3.5 9-8 11C7.5 19 4 14.5 4 10z" />
    <circle cx="12" cy="14" r="1.2" fill="var(--coral)" stroke="none" />
  </svg>
);
const IconBreastR = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10c0-3.5 3.5-6 8-6s8 2.5 8 6c0 4.5-3.5 9-8 11C7.5 19 4 14.5 4 10z" />
    <circle cx="12" cy="14" r="1.2" fill="var(--coral)" stroke="none" />
  </svg>
);
const IconBottle = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2h8v4H8z" /><path d="M6 6h12v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6z" /><path d="M6 12h12" />
  </svg>
);
const IconDroplet = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--grn)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
  </svg>
);
const IconPoop = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8a6b5b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 4c1 1.5 4 2 4 4s-2 2-2 2h2c2 0 3 1.5 3 3s-1 2-1 2h1c2 0 3 2 3 3.5S18 21 14 21H9c-4 0-5-1.5-5-3.5S5 15 7 15h1c0 0-1-1-1-2s1-3 3-3c0 0-1.5-.5-1.5-2S9 4 10 4z" />
  </svg>
);
const IconBoth = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2.69l3.4 3.4a4.8 4.8 0 11-6.8 0z" stroke="var(--grn)" />
    <path d="M16 8c.6.9 2.4 1.2 2.4 2.4s-1.2 1.2-1.2 1.2h1.2c1.2 0 1.8.9 1.8 1.8s-.6 1.2-.6 1.2h.6c1.2 0 1.8 1.2 1.8 2.1S20.4 19 17.6 19h-3c-2.4 0-3-.9-3-2.1s.6-1.5 1.8-1.5h.6s-.6-.6-.6-1.2.6-1.8 1.8-1.8c0 0-.9-.3-.9-1.2S15.4 8 16 8z" stroke="#8a6b5b" />
  </svg>
);

const VOLUME_PRESETS = [30, 60, 90, 120, 150, 180];

export function HandoffLogSheet({
  type,
  sessionId,
  caregiverName,
  onSaved,
  onClose,
  isSleeping = false,
}: {
  type: "feed" | "nappy" | "sleep";
  sessionId: string;
  caregiverName?: string;
  onSaved: () => void;
  onClose: () => void;
  isSleeping?: boolean;
}) {
  const [feedChoice, setFeedChoice] = useState<"left" | "right" | "bottle" | null>(null);
  const [bottleVolume, setBottleVolume] = useState<number | null>(null);
  const [nappyChoice, setNappyChoice] = useState<"wet" | "dirty" | "both" | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sleepElapsed, setSleepElapsed] = useState(0);
  const sleepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sleepStartRef = useRef(Date.now());

  useEffect(() => {
    if (type === "sleep" && isSleeping) {
      sleepStartRef.current = Date.now();
      sleepTimerRef.current = setInterval(() => {
        setSleepElapsed(Math.floor((Date.now() - sleepStartRef.current) / 1000));
      }, 1000);
    }
    return () => {
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    };
  }, [type, isSleeping]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleSave = useCallback(async (noteOverride?: string) => {
    if (saving) return;
    setSaving(true);
    const name = caregiverName?.trim() || "Carer";

    let note: string | null = null;
    if (type === "feed") {
      if (feedChoice === "bottle") {
        note = bottleVolume ? `Bottle ${bottleVolume}ml` : "Bottle";
      } else if (feedChoice) {
        note = `${feedChoice.charAt(0).toUpperCase() + feedChoice.slice(1)} breast`;
      }
    } else if (type === "nappy" && nappyChoice) {
      note = nappyChoice.charAt(0).toUpperCase() + nappyChoice.slice(1);
    }

    if (noteOverride) note = noteOverride;

    const logType = type === "nappy" ? "diaper" : type;
    let result = await addHandoffLog(sessionId, { type: logType, loggedByName: name, note });

    if (!result) {
      result = addLocalHandoffLog(sessionId, { type: logType, loggedByName: name, note });
    }

    if (result) {
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onSaved();
        onClose();
      }, 1500);
    }
    setSaving(false);
  }, [saving, caregiverName, type, feedChoice, bottleVolume, nappyChoice, sessionId, onSaved, onClose]);

  const canSaveFeed = feedChoice === "left" || feedChoice === "right" || (feedChoice === "bottle" && bottleVolume != null);
  const canSaveNappy = nappyChoice != null;

  const cardStyle = (selected: boolean, accentVar: string): React.CSSProperties => ({
    background: selected ? `color-mix(in srgb, var(${accentVar}) 15%, var(--card))` : "var(--card)",
    borderColor: selected ? `var(${accentVar})` : "var(--bd)",
    borderWidth: selected ? 2 : 1,
    borderStyle: "solid",
    borderRadius: 14,
    padding: "18px 12px",
    textAlign: "center",
    cursor: "pointer",
    flex: 1,
    fontFamily: "system-ui, sans-serif",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl border-t"
        style={{ background: "var(--card)", borderColor: "var(--bd)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-8">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: "var(--bd)" }} />

          {/* FEED */}
          {type === "feed" && (
            <>
              <h3
                className="mb-4"
                style={{ fontFamily: "Georgia, serif", fontSize: 16, color: "var(--tx)", fontWeight: 500 }}
              >
                Log a feed
              </h3>

              <div className="flex gap-3 mb-4">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => { setFeedChoice("left"); setBottleVolume(null); }}
                  onKeyDown={(e) => e.key === "Enter" && setFeedChoice("left")}
                  style={cardStyle(feedChoice === "left", "--coral")}
                >
                  <div className="mb-1 flex justify-center"><IconBreastL /></div>
                  <div className="text-[13px] font-medium" style={{ color: "var(--tx)" }}>Left breast</div>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => { setFeedChoice("right"); setBottleVolume(null); }}
                  onKeyDown={(e) => e.key === "Enter" && setFeedChoice("right")}
                  style={cardStyle(feedChoice === "right", "--coral")}
                >
                  <div className="mb-1 flex justify-center"><IconBreastR /></div>
                  <div className="text-[13px] font-medium" style={{ color: "var(--tx)" }}>Right breast</div>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setFeedChoice("bottle")}
                  onKeyDown={(e) => e.key === "Enter" && setFeedChoice("bottle")}
                  style={cardStyle(feedChoice === "bottle", "--coral")}
                >
                  <div className="mb-1 flex justify-center"><IconBottle /></div>
                  <div className="text-[13px] font-medium" style={{ color: "var(--tx)" }}>Bottle</div>
                </div>
              </div>

              {feedChoice === "bottle" && (
                <div className="mb-4">
                  <p className="text-[13px] mb-2" style={{ color: "var(--mu)", fontFamily: "system-ui, sans-serif" }}>
                    Volume (ml)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {VOLUME_PRESETS.map((ml) => (
                      <button
                        key={ml}
                        type="button"
                        onClick={() => setBottleVolume(ml)}
                        className="rounded-lg border px-3 py-2 text-[13px]"
                        style={{
                          borderColor: bottleVolume === ml ? "var(--coral)" : "var(--bd)",
                          background: bottleVolume === ml ? "color-mix(in srgb, var(--coral) 15%, var(--card))" : "var(--card)",
                          color: "var(--tx)",
                          fontFamily: "system-ui, sans-serif",
                          fontWeight: bottleVolume === ml ? 600 : 400,
                        }}
                      >
                        {ml}ml
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleSave()}
                disabled={!canSaveFeed || saving}
                className="w-full py-3 rounded-xl text-[15px] font-medium"
                style={{
                  background: saved ? "var(--grn)" : "var(--coral)",
                  color: "#fff",
                  opacity: !canSaveFeed || saving ? 0.5 : 1,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {saved ? "Saved! \u2713" : saving ? "Saving..." : "Save"}
              </button>
            </>
          )}

          {/* NAPPY */}
          {type === "nappy" && (
            <>
              <h3
                className="mb-4"
                style={{ fontFamily: "Georgia, serif", fontSize: 16, color: "var(--tx)", fontWeight: 500 }}
              >
                Log a nappy
              </h3>

              <div className="flex gap-3 mb-5">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setNappyChoice("wet")}
                  onKeyDown={(e) => e.key === "Enter" && setNappyChoice("wet")}
                  style={cardStyle(nappyChoice === "wet", "--grn")}
                >
                  <div className="mb-1 flex justify-center"><IconDroplet /></div>
                  <div className="text-[13px] font-medium" style={{ color: "var(--tx)" }}>Wet</div>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setNappyChoice("dirty")}
                  onKeyDown={(e) => e.key === "Enter" && setNappyChoice("dirty")}
                  style={cardStyle(nappyChoice === "dirty", "--grn")}
                >
                  <div className="mb-1 flex justify-center"><IconPoop /></div>
                  <div className="text-[13px] font-medium" style={{ color: "var(--tx)" }}>Dirty</div>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setNappyChoice("both")}
                  onKeyDown={(e) => e.key === "Enter" && setNappyChoice("both")}
                  style={cardStyle(nappyChoice === "both", "--grn")}
                >
                  <div className="mb-1 flex justify-center"><IconBoth /></div>
                  <div className="text-[13px] font-medium" style={{ color: "var(--tx)" }}>Both</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSave()}
                disabled={!canSaveNappy || saving}
                className="w-full py-3 rounded-xl text-[15px] font-medium"
                style={{
                  background: saved ? "var(--grn)" : "var(--grn)",
                  color: "#fff",
                  opacity: !canSaveNappy || saving ? 0.5 : 1,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {saved ? "Saved! \u2713" : saving ? "Saving..." : "Save"}
              </button>
            </>
          )}

          {/* SLEEP */}
          {type === "sleep" && (
            <>
              <h3
                className="mb-4"
                style={{ fontFamily: "Georgia, serif", fontSize: 16, color: "var(--tx)", fontWeight: 500 }}
              >
                {isSleeping ? "Currently sleeping" : "Sleep"}
              </h3>

              {!isSleeping ? (
                <button
                  type="button"
                  onClick={() => handleSave("Fell asleep")}
                  disabled={saving}
                  className="w-full py-4 rounded-xl text-[15px] font-medium"
                  style={{
                    background: saved ? "var(--grn)" : "var(--blue)",
                    color: "#fff",
                    opacity: saving ? 0.7 : 1,
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {saved ? "Saved! \u2713" : saving ? "Saving..." : "She fell asleep just now"}
                </button>
              ) : (
                <div className="text-center">
                  <p
                    className="text-[36px] font-medium mb-4"
                    style={{ fontFamily: "ui-monospace, monospace", color: "var(--blue)" }}
                  >
                    {formatTimer(sleepElapsed)}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSave("Woke up")}
                    disabled={saving}
                    className="w-full py-4 rounded-xl text-[15px] font-medium"
                    style={{
                      background: saved ? "var(--grn)" : "var(--blue)",
                      color: "#fff",
                      opacity: saving ? 0.7 : 1,
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {saved ? "Saved! \u2713" : saving ? "Saving..." : "She just woke up"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
