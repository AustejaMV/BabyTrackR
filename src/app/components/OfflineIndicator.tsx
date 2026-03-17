/**
 * Top banner when offline; "Back online — syncing..." for 2s when coming back. Skip animation if reduce-motion.
 */

import { useNetworkStatus } from "../utils/networkStatus";
import { WifiOff } from "lucide-react";

const REDUCE_MOTION_KEY = "cradl-reduce-motion";

function prefersReduceMotion(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem(REDUCE_MOTION_KEY);
    if (stored !== null) return stored === "true";
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function OfflineIndicator() {
  const { isOnline, wasOffline } = useNetworkStatus();
  const reduceMotion = prefersReduceMotion();

  if (isOnline && !wasOffline) return null;

  const showSyncing = isOnline && wasOffline;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={showSyncing ? "Back online, syncing" : "You are offline"}
      className={`w-full py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium ${reduceMotion ? "" : "animate-in slide-in-from-top-2 duration-300"}`}
      style={{
        background: showSyncing ? "var(--grn)" : "var(--ro)",
        color: "white",
      }}
    >
      {showSyncing ? (
        <>
          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
          Back online — syncing...
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-5 flex-shrink-0" aria-hidden />
          Saved locally. You&apos;re offline.
        </>
      )}
    </div>
  );
}
