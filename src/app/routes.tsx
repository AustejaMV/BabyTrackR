import { createBrowserRouter } from "react-router";
import { ErrorBoundaryFallback } from "./components/ErrorBoundary";
import { AppLayout } from "./components/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { JourneyScreen } from "./pages/JourneyScreen";
import { MoreScreen } from "./pages/MoreScreen";
import { Tracking } from "./pages/Tracking";
import { SleepTracking } from "./pages/SleepTracking";
import { FeedingTracking } from "./pages/FeedingTracking";
import { DiaperTracking } from "./pages/DiaperTracking";
import { TummyTime } from "./pages/TummyTime";
import { Login } from "./pages/Login";
import { Settings } from "./pages/Settings";
import { HandoffPage } from "./pages/HandoffPage";
import { MumWellbeingScreen } from "./pages/MumWellbeingScreen";
import { GPSummaryScreen } from "./pages/GPSummaryScreen";
import { SkinTrackerScreen } from "./pages/SkinTrackerScreen";
import { TimeCapsuleWriteScreen } from "./pages/TimeCapsuleWriteScreen";
import { ReturnToWorkScreen } from "./pages/ReturnToWorkScreen";
import { LibraryScreen } from "./pages/LibraryScreen";
import { JaundiceMonitorScreen } from "./pages/JaundiceMonitorScreen";
import { MemoryBookScreen } from "./pages/MemoryBookScreen";
import { VillageScreen } from "./pages/VillageScreen";
import { VillagePlacesScreen } from "./pages/VillagePlacesScreen";
import { VillageGroupsScreen } from "./pages/VillageGroupsScreen";
import { VillageQAScreen } from "./pages/VillageQAScreen";
import { VillageGroupDetailScreen } from "./pages/VillageGroupDetailScreen";
import { VillageQuestionDetailScreen } from "./pages/VillageQuestionDetailScreen";
import { JoinRedirect } from "./pages/JoinRedirect";
import { HomeSwitch } from "./components/HomeSwitch";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <ErrorBoundaryFallback />,
    children: [
      { path: "login", Component: Login },
      { path: "join/:shortcode", Component: JoinRedirect },
      { path: "handoff/:sessionId", Component: HandoffPage },
      { path: "", Component: HomeSwitch },
      { path: "journey", Component: JourneyScreen },
      { path: "more", Component: MoreScreen },
      { path: "tracking", Component: Tracking },
      { path: "sleep", Component: SleepTracking },
      { path: "feeding", Component: FeedingTracking },
      { path: "diapers", Component: DiaperTracking },
      { path: "tummy-time", Component: TummyTime },
      { path: "mum", Component: MumWellbeingScreen },
      { path: "gp-summary", Component: GPSummaryScreen },
      { path: "skin", Component: SkinTrackerScreen },
      { path: "time-capsule/write", Component: TimeCapsuleWriteScreen },
      { path: "return-to-work", Component: ReturnToWorkScreen },
      { path: "library", Component: LibraryScreen },
      { path: "jaundice", Component: JaundiceMonitorScreen },
      { path: "memories", Component: MemoryBookScreen },
      { path: "village", Component: VillageScreen },
      { path: "village/places", Component: VillagePlacesScreen },
      { path: "village/groups", Component: VillageGroupsScreen },
      { path: "village/groups/:id", Component: VillageGroupDetailScreen },
      { path: "village/qa", Component: VillageQAScreen },
      { path: "village/qa/:id", Component: VillageQuestionDetailScreen },
      { path: "settings", Component: Settings },
    ],
  },
]);
