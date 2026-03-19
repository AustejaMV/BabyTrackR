import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeeklyNarrativeCard } from "./WeeklyNarrativeCard";

const BASE_PROPS = {
  babyName: "Lila",
  weekNumber: 12,
  summaryText: "Lila had 7 feeds a day and slept about 14h per day this week.",
  stats: { feedsPerDay: 7, sleepPerDay: "14h", nappiesPerDay: 6 },
  dailyBars: [0.6, 0.7, 0.5, 0.8, 0.4, 0.9, 0.6],
};

describe("WeeklyNarrativeCard", () => {
  it("renders week number", () => {
    render(<WeeklyNarrativeCard {...BASE_PROPS} />);
    expect(screen.getByText("Week 12")).toBeDefined();
  });

  it("renders summary sentence", () => {
    render(<WeeklyNarrativeCard {...BASE_PROPS} />);
    expect(
      screen.getByText(
        "Lila had 7 feeds a day and slept about 14h per day this week.",
      ),
    ).toBeDefined();
  });

  it("renders 3 stat cells (feeds, sleep, nappies)", () => {
    render(<WeeklyNarrativeCard {...BASE_PROPS} />);
    expect(screen.getByText("Feeds / day")).toBeDefined();
    expect(screen.getByText("Sleep / day")).toBeDefined();
    expect(screen.getByText("Nappies / day")).toBeDefined();
  });

  it("renders stat values", () => {
    render(<WeeklyNarrativeCard {...BASE_PROPS} />);
    expect(screen.getByText("7")).toBeDefined();
    expect(screen.getByText("14h")).toBeDefined();
    expect(screen.getByText("6")).toBeDefined();
  });

  it("renders 7 day labels", () => {
    render(<WeeklyNarrativeCard {...BASE_PROPS} />);
    const labels = screen.getAllByText(/^[MTWFS]$/);
    expect(labels.length).toBe(7);
  });

  it("renders 7 daily bars", () => {
    const { container } = render(<WeeklyNarrativeCard {...BASE_PROPS} />);
    const bars = container.querySelectorAll(
      'div[style*="background: #d4604a"]',
    );
    expect(bars.length).toBeGreaterThanOrEqual(7);
  });

  it("renders empty-data summary text", () => {
    render(
      <WeeklyNarrativeCard
        {...BASE_PROPS}
        summaryText="Log feeds and sleeps this week to see Lila's weekly summary."
      />,
    );
    expect(
      screen.getByText(
        "Log feeds and sleeps this week to see Lila's weekly summary.",
      ),
    ).toBeDefined();
  });
});
