import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GrowthSection } from "./GrowthSection";

const BASE_PROPS = {
  babyName: "Lila",
  weight: null,
  length: null,
  headCirc: null,
  weightGainGrams: null,
  weeksSinceLastMeasure: null,
};

describe("GrowthSection", () => {
  it("shows empty state when no measurements", () => {
    render(<GrowthSection {...BASE_PROPS} />);
    expect(
      screen.getByText(/No measurements yet/),
    ).toBeDefined();
  });

  it("shows growth heading with baby name", () => {
    render(
      <GrowthSection
        {...BASE_PROPS}
        weight={{ value: 4.2, percentile: 50 }}
      />,
    );
    expect(screen.getByText("Lila is growing well")).toBeDefined();
  });

  it('shows "Lighter than most" for percentile < 25', () => {
    render(
      <GrowthSection
        {...BASE_PROPS}
        weight={{ value: 3.1, percentile: 10 }}
      />,
    );
    expect(screen.getByText("Lighter than most")).toBeDefined();
  });

  it('shows "Average" for percentile 25–75', () => {
    render(
      <GrowthSection
        {...BASE_PROPS}
        weight={{ value: 4.2, percentile: 50 }}
      />,
    );
    expect(screen.getByText("Average")).toBeDefined();
  });

  it('shows "Heavier than most" for percentile > 75', () => {
    render(
      <GrowthSection
        {...BASE_PROPS}
        weight={{ value: 5.5, percentile: 90 }}
      />,
    );
    expect(screen.getByText("Heavier than most")).toBeDefined();
  });

  it('shows "Shorter than most" for length percentile < 25', () => {
    render(
      <GrowthSection
        {...BASE_PROPS}
        length={{ value: 48, percentile: 10 }}
      />,
    );
    expect(screen.getByText("Shorter than most")).toBeDefined();
  });

  it('shows "Taller than most" for length percentile > 75', () => {
    render(
      <GrowthSection
        {...BASE_PROPS}
        length={{ value: 62, percentile: 90 }}
      />,
    );
    expect(screen.getByText("Taller than most")).toBeDefined();
  });

  it('shows "+ Log measurement" link', () => {
    render(
      <GrowthSection
        {...BASE_PROPS}
        weight={{ value: 4.2, percentile: 50 }}
      />,
    );
    expect(screen.getByText("+ Log measurement")).toBeDefined();
  });

  it("shows weight gain trend when data available", () => {
    render(
      <GrowthSection
        {...BASE_PROPS}
        weight={{ value: 4.2, percentile: 50 }}
        weightGainGrams={400}
        weeksSinceLastMeasure={2}
      />,
    );
    expect(screen.getByText(/Gaining ~200g\/week/)).toBeDefined();
  });
});
