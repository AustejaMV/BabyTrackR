import { createBrowserRouter } from "react-router";
import { ErrorBoundaryFallback } from "./components/ErrorBoundary";
import { AppLayout } from "./components/AppLayout";
import { JourneyScreen } from "./pages/JourneyScreen";
import { MeScreen } from "./pages/MeScreen";
import { Login } from "./pages/Login";
import { Settings } from "./pages/Settings";
import { HandoffPage } from "./pages/HandoffPage";
import { GPSummaryScreen } from "./pages/GPSummaryScreen";
import { SkinTrackerScreen } from "./pages/SkinTrackerScreen";
import { JaundiceMonitorScreen } from "./pages/JaundiceMonitorScreen";
import { TimeCapsuleWriteScreen } from "./pages/TimeCapsuleWriteScreen";
import { ReturnToWorkScreen } from "./pages/ReturnToWorkScreen";
import { MemoryBookScreen } from "./pages/MemoryBookScreen";
import { VillageScreen } from "./pages/VillageScreen";
import { VillagePlacesScreen } from "./pages/VillagePlacesScreen";
import { VillageGroupsScreen } from "./pages/VillageGroupsScreen";
import { VillageQAScreen } from "./pages/VillageQAScreen";
import { VillageGroupDetailScreen } from "./pages/VillageGroupDetailScreen";
import { VillageQuestionDetailScreen } from "./pages/VillageQuestionDetailScreen";
import { JoinRedirect } from "./pages/JoinRedirect";
import { SafetyScreen } from "./pages/SafetyScreen";
import { HomeSwitch } from "./components/HomeSwitch";
import { LibraryScreen } from "./pages/LibraryScreen";
import { MumHealthScreen } from "./pages/MumHealthScreen";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { ShoppingListScreen } from "./pages/ShoppingListScreen";
import { NotesScreen } from "./pages/NotesScreen";
import { JoinFamilyPage } from "./pages/JoinFamilyPage";
import { PremiumScreen } from "./pages/PremiumScreen";
import { HealthScreen } from "./pages/HealthScreen";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <ErrorBoundaryFallback />,
    children: [
      { path: "login", Component: Login },
      { path: "auth/callback", Component: AuthCallbackPage },
      { path: "join/:shortcode", Component: JoinRedirect },
      { path: "join-family/:token", Component: JoinFamilyPage },
      { path: "handoff/:sessionId", Component: HandoffPage },
      { path: "", Component: HomeSwitch },
      { path: "journey", Component: JourneyScreen },
      { path: "health", Component: HealthScreen },
      { path: "more", Component: MeScreen },
      { path: "gp-summary", Component: GPSummaryScreen },
      { path: "skin", Component: SkinTrackerScreen },
      { path: "jaundice", Component: JaundiceMonitorScreen },
      { path: "time-capsule/write", Component: TimeCapsuleWriteScreen },
      { path: "return-to-work", Component: ReturnToWorkScreen },
      { path: "memories", Component: MemoryBookScreen },
      { path: "village", Component: VillageScreen },
      { path: "village/places", Component: VillagePlacesScreen },
      { path: "village/groups", Component: VillageGroupsScreen },
      { path: "village/groups/:id", Component: VillageGroupDetailScreen },
      { path: "village/qa", Component: VillageQAScreen },
      { path: "village/qa/:id", Component: VillageQuestionDetailScreen },
      { path: "library", Component: LibraryScreen },
      { path: "mum-health", Component: MumHealthScreen },
      { path: "safety", Component: SafetyScreen },
      { path: "settings", Component: Settings },
      { path: "shopping-list", Component: ShoppingListScreen },
      { path: "notes", Component: NotesScreen },
      { path: "premium", Component: PremiumScreen },
    ],
  },
]);
