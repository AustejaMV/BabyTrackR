import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dashboard } from "./Dashboard";

vi.mock("react-router", () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1" },
    session: { access_token: "tok" },
    loading: false,
    familyId: null,
  }),
}));

vi.mock("../contexts/PremiumContext", () => ({
  usePremium: () => ({ isPremium: false }),
}));

vi.mock("../contexts/BabyContext", () => ({
  useBaby: () => ({
    activeBaby: {
      id: "b1",
      name: "Lila",
      birthDate: Date.now() - 60 * 86400000,
      parentName: "Sarah",
    },
    babies: [],
  }),
}));

vi.mock("../contexts/FeedTimerContext", () => ({
  useFeedTimer: () => ({
    isRunning: false,
    elapsedMs: 0,
    side: null,
    startTimer: vi.fn(),
    stopTimer: vi.fn(),
    switchSide: vi.fn(),
  }),
}));

vi.mock("../components/AppLayout", () => ({
  useDesktop: () => ({ isDesktop: false }),
}));

vi.mock("../utils/dataSync", () => ({
  loadAllDataFromServer: vi.fn(() => Promise.resolve({ ok: false, data: {} })),
  saveData: vi.fn(),
  clearSyncedDataFromLocalStorage: vi.fn(),
  SYNCED_DATA_KEYS: [],
  SYNCED_DATA_DEFAULTS: {},
}));

vi.mock("../utils/notifications", () => ({
  requestNotificationPermission: vi.fn(),
  scheduleNotification: vi.fn(),
}));

vi.mock("../utils/medicationReminderScheduler", () => ({
  scheduleNextMedicationReminder: vi.fn(),
}));

vi.mock("../utils/sleepUtils", () => ({
  endCurrentSleepIfActive: vi.fn(),
}));

vi.mock("../components/LogDrawer", () => ({
  LogDrawer: () => null,
}));

vi.mock("../components/HealthLogDrawer", () => ({
  HealthLogDrawer: () => null,
}));

vi.mock("../components/SolidFoodDrawer", () => ({
  SolidFoodDrawer: () => null,
}));

vi.mock("../components/ActivityDrawer", () => ({
  ActivityDrawer: () => null,
}));

vi.mock("../components/SpitUpDrawer", () => ({
  SpitUpDrawer: () => null,
}));

vi.mock("../components/TodayTimelineModal", () => ({
  TodayTimelineModal: () => null,
}));

vi.mock("../components/LogEditSheet", () => ({
  LogEditSheet: () => null,
}));

vi.mock("../components/CreateCustomTrackerSheet", () => ({
  CreateCustomTrackerSheet: () => null,
}));

vi.mock("../components/CustomTrackerDrawer", () => ({
  CustomTrackerDrawer: () => null,
}));

describe("Dashboard (Today tab)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("feedingHistory", "[]");
    localStorage.setItem("sleepHistory", "[]");
    localStorage.setItem("diaperHistory", "[]");
    localStorage.setItem("tummyTimeHistory", "[]");
    localStorage.setItem("bottleHistory", "[]");
  });

  it("renders greeting with parent name", () => {
    render(<Dashboard />);
    expect(screen.getByText(/Sarah/)).toBeDefined();
  });

  it("renders baby name and age subtitle", () => {
    render(<Dashboard />);
    expect(screen.getByText(/Lila/)).toBeDefined();
  });

  it("renders Sleep sweet spot section", () => {
    render(<Dashboard />);
    expect(screen.getByText("Sleep sweet spot")).toBeDefined();
  });

  it("renders Log section label", () => {
    render(<Dashboard />);
    expect(screen.getByText("Log")).toBeDefined();
  });

  it("renders 6 log buttons (Feed, Sleep, Nappy, Tummy, Bottle, More)", () => {
    render(<Dashboard />);
    expect(screen.getByText("Nurse")).toBeDefined();
    expect(screen.getByText("Sleep")).toBeDefined();
    expect(screen.getByText("Nappy")).toBeDefined();
    expect(screen.getByText("Tummy")).toBeDefined();
    expect(screen.getByText("Bottle")).toBeDefined();
    expect(screen.getByText("More")).toBeDefined();
  });

  it("renders Why is she crying? card", () => {
    render(<Dashboard />);
    expect(screen.getByText("Why is she crying?")).toBeDefined();
  });

  it("renders handoff strip when signed in", () => {
    render(<Dashboard />);
    expect(screen.getByText(/Leaving now/)).toBeDefined();
    expect(screen.getByText(/Share →/)).toBeDefined();
  });

  it("does NOT render removed components (WarningIndicators, WellbeingCard, LeapsCard)", () => {
    render(<Dashboard />);
    expect(screen.queryByText("Warning Indicators")).toBeNull();
    expect(screen.queryByText("Wellbeing")).toBeNull();
    expect(screen.queryByText("Developmental Leaps")).toBeNull();
  });

  it("renders sections in correct order", () => {
    const { container } = render(<Dashboard />);
    const allText = container.textContent ?? "";
    const greetingIdx = allText.indexOf("Sarah");
    const logIdx = allText.indexOf("Log");
    const sweetSpotIdx = allText.indexOf("Sleep sweet spot");
    const cryingIdx = allText.indexOf("Why is she crying?");
    const noticedIdx = allText.indexOf("Cradl noticed");
    const handoffIdx = allText.indexOf("Leaving now");

    expect(greetingIdx).toBeGreaterThanOrEqual(0);
    expect(greetingIdx).toBeLessThan(logIdx);
    expect(logIdx).toBeLessThan(sweetSpotIdx);
    expect(sweetSpotIdx).toBeLessThan(cryingIdx);
    expect(cryingIdx).toBeLessThan(noticedIdx);
    expect(noticedIdx).toBeLessThan(handoffIdx);
  });
});
