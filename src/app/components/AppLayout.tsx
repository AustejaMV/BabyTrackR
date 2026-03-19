import { useEffect, useRef, createContext, useContext, useCallback } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { OfflineIndicator } from "./OfflineIndicator";
import { Navigation } from "./Navigation";
import { DesktopTopBar } from "./DesktopTopBar";
import { AskCradlFloatingButton } from "./AskCradlFloatingButton";
import { VoiceCommandButton } from "./VoiceCommandButton";
import { useNetworkStatus } from "../utils/networkStatus";
import { useAuth } from "../contexts/AuthContext";
import { useBaby } from "../contexts/BabyContext";
import { flushPendingSaves } from "../utils/dataSync";
import { useIsDesktop } from "../hooks/useIsDesktop";

interface DesktopContextValue {
  isDesktop: boolean;
}

const DesktopContext = createContext<DesktopContextValue>({ isDesktop: false });

export function useDesktop(): DesktopContextValue {
  return useContext(DesktopContext);
}

export function AppLayout() {
  const { session } = useAuth();
  const { activeBaby } = useBaby();
  const { wasOffline } = useNetworkStatus();
  const flushedRef = useRef(false);
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!wasOffline || !session?.access_token) return;
    if (flushedRef.current) return;
    flushedRef.current = true;
    flushPendingSaves(session.access_token);
  }, [wasOffline, session?.access_token]);

  useEffect(() => {
    if (!wasOffline) flushedRef.current = false;
  }, [wasOffline]);

  const handleTabChange = useCallback(
    (tab: string) => {
      navigate(tab);
    },
    [navigate]
  );

  const activeTab = location.pathname;

  return (
    <DesktopContext.Provider value={{ isDesktop }}>
      <OfflineIndicator />

      {isDesktop && (
        <DesktopTopBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          babyName={activeBaby?.name}
        />
      )}

      <Outlet />

      <VoiceCommandButton />
      <AskCradlFloatingButton />

      {!isDesktop && <Navigation />}
    </DesktopContext.Provider>
  );
}
