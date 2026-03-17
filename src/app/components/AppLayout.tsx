import { useEffect, useRef } from "react";
import { Outlet } from "react-router";
import { OfflineIndicator } from "./OfflineIndicator";
import { useNetworkStatus } from "../utils/networkStatus";
import { useAuth } from "../contexts/AuthContext";
import { flushPendingSaves } from "../utils/dataSync";

export function AppLayout() {
  const { session } = useAuth();
  const { wasOffline } = useNetworkStatus();
  const flushedRef = useRef(false);

  useEffect(() => {
    if (!wasOffline || !session?.access_token) return;
    if (flushedRef.current) return;
    flushedRef.current = true;
    flushPendingSaves(session.access_token);
  }, [wasOffline, session?.access_token]);

  useEffect(() => {
    if (!wasOffline) flushedRef.current = false;
  }, [wasOffline]);

  return (
    <>
      <OfflineIndicator />
      <Outlet />
    </>
  );
}
