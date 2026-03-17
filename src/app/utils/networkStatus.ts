/**
 * Network status for offline indicator. Web: navigator.onLine; unknown treated as online.
 */

import { useState, useEffect, useRef } from "react";

export function useNetworkStatus(): { isOnline: boolean; wasOffline: boolean } {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === "undefined") return true;
    return navigator.onLine;
  });
  const [wasOffline, setWasOffline] = useState(false);
  const wasOfflineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      if (wasOfflineTimerRef.current) clearTimeout(wasOfflineTimerRef.current);
      wasOfflineTimerRef.current = setTimeout(() => setWasOffline(false), 2000);
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (wasOfflineTimerRef.current) clearTimeout(wasOfflineTimerRef.current);
    };
  }, []);

  return { isOnline, wasOffline };
}