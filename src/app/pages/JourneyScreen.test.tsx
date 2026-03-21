import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { JourneyScreen } from "./JourneyScreen";
import { LanguageProvider } from "../contexts/LanguageContext";

function renderJourney() {
  return render(
    <LanguageProvider>
      <JourneyScreen />
    </LanguageProvider>,
  );
}

vi.mock("../contexts/BabyContext", () => ({
  useBaby: () => ({
    activeBaby: {
      id: "b1",
      name: "Lila",
      birthDate: Date.now() - 84 * 86400000,
      parentName: "Sarah",
      weight: 4.5,
      height: 55,
    },
    babies: [],
  }),
}));

vi.mock("../contexts/PremiumContext", () => ({
  usePremium: () => ({ isPremium: false }),
}));

vi.mock("../components/PremiumGate", () => ({
  PremiumGate: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("JourneyScreen (Story tab)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("feedingHistory", "[]");
    localStorage.setItem("sleepHistory", "[]");
    localStorage.setItem("diaperHistory", "[]");
    localStorage.setItem("tummyTimeHistory", "[]");
    localStorage.setItem("cradl-milestones", "{}");
  });

  it("renders header with baby name and 'story'", () => {
    renderJourney();
    expect(screen.getByText("Lila's story")).toBeDefined();
  });

  it("renders weekly narrative card with week number", () => {
    renderJourney();
    expect(screen.getByText(/Week \d+/)).toBeDefined();
  });

  it("renders Growth section", () => {
    renderJourney();
    expect(screen.getByText("Growth")).toBeDefined();
  });

  it("renders Is this normal? section", () => {
    render(<JourneyScreen />);
    expect(screen.getByText("Is this normal?")).toBeDefined();
  });

  it("renders Milestones section", () => {
    renderJourney();
    expect(screen.getByText("Milestones")).toBeDefined();
  });

  it("renders Suggested schedule section", () => {
    renderJourney();
    expect(screen.getByText("Suggested schedule")).toBeDefined();
  });

  it("does NOT render old removed components", () => {
    renderJourney();
    expect(screen.queryByText("Teeth Tracker")).toBeNull();
    expect(screen.queryByText("Supply Monitor")).toBeNull();
    expect(screen.queryByText("Playbook")).toBeNull();
  });

  it("renders sections in correct order", () => {
    const { container } = renderJourney();
    const text = container.textContent ?? "";

    const storyIdx = text.indexOf("Lila's story");
    const weekIdx = text.indexOf("Week");
    const growthIdx = text.indexOf("Growth");
    const normalIdx = text.indexOf("Is this normal?");
    const milestonesIdx = text.indexOf("Milestones");
    const scheduleIdx = text.indexOf("Suggested schedule");

    expect(storyIdx).toBeLessThan(weekIdx);
    expect(weekIdx).toBeLessThan(growthIdx);
    expect(growthIdx).toBeLessThan(normalIdx);
    expect(normalIdx).toBeLessThan(milestonesIdx);
    expect(milestonesIdx).toBeLessThan(scheduleIdx);
  });

  it("shows empty-data narrative when no feeds", () => {
    renderJourney();
    expect(screen.getByText(/Log feeds and sleeps/)).toBeDefined();
  });
});
