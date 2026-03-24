import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SleepSweetSpot } from "./SleepSweetSpot";
import type { SweetSpotPrediction } from "../utils/napPrediction";

function makePrediction(
  opensOffset: number,
  closesOffset: number,
): SweetSpotPrediction {
  const now = Date.now();
  return {
    opensAt: new Date(now + opensOffset),
    closesAt: new Date(now + closesOffset),
    hasPersonalisedData: false,
    personalisedTime: null,
    ageInWeeks: 8,
    status: "green",
  };
}

describe("SleepSweetSpot", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows empty state when no prediction", () => {
    render(
      <SleepSweetSpot
        prediction={null}
        onStartSleep={() => {}}
        babyName="Lila"
      />,
    );
    expect(screen.getByText(/Sleep sweet spot/)).toBeDefined();
    expect(screen.getByText(/log a sleep to activate/i)).toBeDefined();
  });

  it('renders "Open now" tag in green state', () => {
    const pred = makePrediction(-10 * 60000, 30 * 60000);
    render(
      <SleepSweetSpot
        prediction={pred}
        onStartSleep={() => {}}
        babyName="Lila"
      />,
    );
    expect(screen.getByText(/Open now/)).toBeDefined();
  });

  it("renders green action bar with Start sleep", () => {
    const pred = makePrediction(-10 * 60000, 30 * 60000);
    localStorage.setItem("cradl-nap-explainer-seen", "true");
    render(
      <SleepSweetSpot
        prediction={pred}
        onStartSleep={() => {}}
        babyName="Lila"
      />,
    );
    expect(screen.getByText(/Start sleep/)).toBeDefined();
  });

  it('renders "Closing soon" tag in amber state', () => {
    const pred = makePrediction(-60 * 60000, -5 * 60000);
    localStorage.setItem("cradl-nap-explainer-seen", "true");
    render(
      <SleepSweetSpot
        prediction={pred}
        onStartSleep={() => {}}
        babyName="Lila"
      />,
    );
    expect(screen.getByText(/Closing soon/)).toBeDefined();
  });

  it("shows amber suggestion about nap routine", () => {
    const pred = makePrediction(-60 * 60000, -5 * 60000);
    localStorage.setItem("cradl-nap-explainer-seen", "true");
    render(
      <SleepSweetSpot
        prediction={pred}
        onStartSleep={() => {}}
        babyName="Lila"
      />,
    );
    expect(screen.getByText(/start your nap routine now/)).toBeDefined();
  });

  it('renders "Overtired now" tag in red state', () => {
    const pred = makePrediction(-120 * 60000, -60 * 60000);
    localStorage.setItem("cradl-nap-explainer-seen", "true");
    render(
      <SleepSweetSpot
        prediction={pred}
        onStartSleep={() => {}}
        babyName="Lila"
      />,
    );
    expect(screen.getByText(/Overtired now/)).toBeDefined();
  });

  it("shows red soothing tip", () => {
    const pred = makePrediction(-120 * 60000, -60 * 60000);
    localStorage.setItem("cradl-nap-explainer-seen", "true");
    render(
      <SleepSweetSpot
        prediction={pred}
        onStartSleep={() => {}}
        babyName="Lila"
      />,
    );
    expect(screen.getByText(/Try extra soothing/)).toBeDefined();
  });

  it("shows first-time explainer card when not seen", () => {
    const pred = makePrediction(-10 * 60000, 30 * 60000);
    render(
      <SleepSweetSpot
        prediction={pred}
        onStartSleep={() => {}}
        babyName="Lila"
      />,
    );
    expect(screen.getByText(/Why timing matters/)).toBeDefined();
    expect(screen.getByText(/Got it/)).toBeDefined();
  });

  it("hides explainer card when already seen", () => {
    localStorage.setItem("cradl-nap-explainer-seen", "true");
    const pred = makePrediction(-10 * 60000, 30 * 60000);
    render(
      <SleepSweetSpot
        prediction={pred}
        onStartSleep={() => {}}
        babyName="Lila"
      />,
    );
    expect(screen.queryByText(/Why timing matters/)).toBeNull();
  });

  it("dismisses explainer card on click and persists to localStorage", () => {
    const pred = makePrediction(-10 * 60000, 30 * 60000);
    render(
      <SleepSweetSpot
        prediction={pred}
        onStartSleep={() => {}}
        babyName="Lila"
      />,
    );
    const dismiss = screen.getByText(/Got it — show me her sweet spot/);
    fireEvent.click(dismiss);
    expect(screen.queryByText(/Why timing matters/)).toBeNull();
    expect(localStorage.getItem("cradl-nap-explainer-seen")).toBe("true");
  });

  it("calls onStartSleep when green action bar is clicked", () => {
    localStorage.setItem("cradl-nap-explainer-seen", "true");
    const pred = makePrediction(-10 * 60000, 30 * 60000);
    const handler = { fn: () => {} };
    let called = false;
    handler.fn = () => {
      called = true;
    };
    render(
      <SleepSweetSpot
        prediction={pred}
        onStartSleep={handler.fn}
        babyName="Lila"
      />,
    );
    const startBtn = screen.getByText(/Start sleep/);
    fireEvent.click(startBtn.closest('[role="button"]')!);
    expect(called).toBe(true);
  });

  it("shows three zone cards in explainer (Sweet spot, Closing, Overtired)", () => {
    const pred = makePrediction(-10 * 60000, 30 * 60000);
    render(
      <SleepSweetSpot
        prediction={pred}
        onStartSleep={() => {}}
        babyName="Lila"
      />,
    );
    expect(screen.getByText("Sweet spot open")).toBeDefined();
    expect(screen.getByText("Approaching — act soon")).toBeDefined();
    expect(screen.getByText("Overtired — harder now")).toBeDefined();
  });
});
