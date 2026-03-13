import { createBrowserRouter } from "react-router";
import { Dashboard } from "./pages/Dashboard";
import { Tracking } from "./pages/Tracking";
import { SleepTracking } from "./pages/SleepTracking";
import { FeedingTracking } from "./pages/FeedingTracking";
import { DiaperTracking } from "./pages/DiaperTracking";
import { TummyTime } from "./pages/TummyTime";
import { Login } from "./pages/Login";
import { Settings } from "./pages/Settings";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    Component: Dashboard,
  },
  {
    path: "/tracking",
    Component: Tracking,
  },
  {
    path: "/sleep",
    Component: SleepTracking,
  },
  {
    path: "/feeding",
    Component: FeedingTracking,
  },
  {
    path: "/diapers",
    Component: DiaperTracking,
  },
  {
    path: "/tummy-time",
    Component: TummyTime,
  },
  {
    path: "/settings",
    Component: Settings,
  },
]);