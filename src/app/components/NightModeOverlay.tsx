import { useRef, useState, useEffect } from "react";
import { X } from "lucide-react";
import { BreathingExerciseModal } from "./BreathingExerciseModal";
import {
  getNightPingConsent,
  setNightPingConsent,
  villageNightPing,
  formatNightCount,
} from "../utils/villageApi";

interface NightModeOverlayProps {
  /** Show the overlay when true (isNightHours() && !hasActiveTimer). */
  shouldShow: boolean;
  message: string;
  onDismiss?: () => void;
  /** When set and consent given, call night-ping and show count. */
  accessToken?: string | null;
}

export function NightModeOverlay({ shouldShow, message, onDismiss, accessToken }: NightModeOverlayProps) {
  const hasShownThisSessionRef = useRef(false);
  const [showBreathing, setShowBreathing] = useState(false);
  const [consent, setConsent] = useState<boolean | null>(null);
  const [nightCount, setNightCount] = useState<number | null>(null);
  const pingedThisSessionRef = useRef(false);

  const visible = shouldShow && !hasShownThisSessionRef.current;

  useEffect(() => {
    if (visible) hasShownThisSessionRef.current = true;
  }, [visible]);

  useEffect(() => {
    setConsent(getNightPingConsent());
  }, [visible]);

  useEffect(() => {
    if (!visible || consent !== true || !accessToken || pingedThisSessionRef.current) return;
    pingedThisSessionRef.current = true;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 1000) / 1000;
        const lng = Math.round(pos.coords.longitude * 1000) / 1000;
        villageNightPing(lat, lng, accessToken)
          .then(({ count }) => setNightCount(count))
          .catch(() => setNightCount(0));
      },
      () => setNightCount(0),
      { maximumAge: 60000, timeout: 10000 }
    );
  }, [visible, consent, accessToken]);

  const handleConsent = (value: boolean) => {
    setNightPingConsent(value);
    setConsent(value);
  };

  const handleDismiss = () => {
    onDismiss?.();
  };

  if (!visible && !showBreathing) return null;

  const countText = nightCount != null && nightCount > 0 ? formatNightCount(nightCount) : "";
  const countLabel =
    countText === ""
      ? null
      : `${countText} other parent${countText === "1" ? "" : "s"} nearby logged a feed in the last hour. You're not alone.`;

  return (
    <>
      {visible && (
        <div
          className="fixed top-0 left-0 right-0 z-40 p-4 pt-6 animate-in slide-in-from-top-2 duration-300"
          role="region"
          aria-label="Night mode message"
        >
          <div
            className="absolute inset-0 -z-10"
            style={{ background: "rgba(0,0,0,0.15)" }}
          />
          <div
            className="relative rounded-2xl border p-5 pb-6 max-w-lg mx-auto"
            style={{
              background: "var(--card)",
              borderColor: "var(--bd)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            }}
          >
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center opacity-70 hover:opacity-100"
              style={{ color: "var(--mu)" }}
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
            {consent === null ? (
              <p className="text-center text-[16px] pr-8" style={{ fontFamily: "Georgia, serif", color: "var(--tx)" }}>
                {message}
              </p>
            ) : consent === false ? (
              <>
                <p className="text-center text-[16px] pr-8" style={{ fontFamily: "Georgia, serif", color: "var(--tx)" }}>
                  {message}
                </p>
                <p className="text-center text-[14px] mt-3" style={{ color: "var(--mu)" }}>
                  Want to know if other parents nearby are also up?
                </p>
                <div className="mt-3 flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => handleConsent(true)}
                    className="py-2 px-4 rounded-xl text-[14px] font-medium"
                    style={{ background: "var(--pink)", color: "white" }}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConsent(false)}
                    className="py-2 px-4 rounded-xl border text-[14px]"
                    style={{ borderColor: "var(--bd)", color: "var(--tx)" }}
                  >
                    No thanks
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-center text-[16px] pr-8" style={{ fontFamily: "Georgia, serif", color: "var(--tx)" }}>
                  {message}
                </p>
                {countLabel && (
                  <p className="text-center text-[11px] mt-2" style={{ color: "var(--mu)" }}>
                    {countLabel}
                  </p>
                )}
              </>
            )}
            <button
              type="button"
              onClick={() => setShowBreathing(true)}
              className="mt-4 w-full py-2.5 rounded-xl border text-[14px] font-medium"
              style={{ borderColor: "var(--bd)", color: "var(--tx)" }}
            >
              I need a moment
            </button>
          </div>
        </div>
      )}
      {showBreathing && (
        <BreathingExerciseModal onClose={() => setShowBreathing(false)} />
      )}
    </>
  );
}
