import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { IsThisNormalCard, type NormalMetric } from "./IsThisNormalCard";

const METRIC_TEMPLATES: Record<string, Omit<NormalMetric, "tag" | "suggestion">> = {
  Feeds: { name: "Feeds", value: 7, min: 0, max: 14, typicalMin: 5, typicalMax: 8, description: "7 feeds today" },
  Sleep: { name: "Sleep", value: 4, min: 0, max: 8, typicalMin: 3, typicalMax: 5, description: "4 naps today" },
  Nappies: { name: "Nappies", value: 6, min: 0, max: 12, typicalMin: 4, typicalMax: 8, description: "6 nappy changes" },
  "Tummy time": { name: "Tummy time", value: 10, min: 0, max: 30, typicalMin: 5, typicalMax: 15, description: "10 min tummy time" },
};

function normalMetric(name: string): NormalMetric {
  return { ...METRIC_TEMPLATES[name], tag: "Normal" };
}

function lowMetric(name: string, suggestion: string): NormalMetric {
  return { ...METRIC_TEMPLATES[name], tag: "A little low", value: 1, suggestion };
}

describe("IsThisNormalCard", () => {
  it("returns null when metrics array is empty", () => {
    const { container } = render(
      <IsThisNormalCard ageLabel="0–3 months" metrics={[]} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders all 4 metric types", () => {
    const metrics = Object.keys(METRIC_TEMPLATES).map(normalMetric);
    render(<IsThisNormalCard ageLabel="0–3 months" metrics={metrics} />);

    expect(screen.getByText("Feeds")).toBeDefined();
    expect(screen.getByText("Sleep")).toBeDefined();
    expect(screen.getByText("Nappies")).toBeDefined();
    expect(screen.getByText("Tummy time")).toBeDefined();
  });

  it('renders "Normal" tag with green styling', () => {
    render(
      <IsThisNormalCard ageLabel="0–3 months" metrics={[normalMetric("Feeds")]} />,
    );

    const tag = screen.getByText("Normal");
    expect(tag).toBeDefined();
    expect(tag.style.background).toBe("rgb(228, 244, 228)"); // #e4f4e4
    expect(tag.style.color).toBe("rgb(42, 106, 42)"); // #2a6a2a
  });

  it('renders "A little low" tag with amber styling', () => {
    render(
      <IsThisNormalCard
        ageLabel="0–3 months"
        metrics={[lowMetric("Feeds", "Try offering more feeds")]}
      />,
    );

    const tag = screen.getByText("A little low");
    expect(tag).toBeDefined();
    expect(tag.style.background).toBe("rgb(254, 244, 228)"); // #fef4e4
    expect(tag.style.color).toBe("rgb(138, 90, 0)"); // #8a5a00
  });

  it("shows suggestion box for non-normal metrics", () => {
    const suggestion = "Try offering more feeds during the day";
    render(
      <IsThisNormalCard
        ageLabel="0–3 months"
        metrics={[lowMetric("Feeds", suggestion)]}
      />,
    );

    expect(screen.getByText(suggestion)).toBeDefined();
  });

  it("does not show suggestion box for normal metrics", () => {
    const metric: NormalMetric = {
      ...normalMetric("Feeds"),
      suggestion: "This should not appear",
    };
    render(
      <IsThisNormalCard ageLabel="0–3 months" metrics={[metric]} />,
    );

    expect(screen.queryByText("This should not appear")).toBeNull();
  });

  it("shows WHO age label intro text", () => {
    render(
      <IsThisNormalCard
        ageLabel="3–6 months"
        metrics={[normalMetric("Feeds")]}
      />,
    );

    expect(screen.getByText("Based on WHO data for 3–6 months")).toBeDefined();
  });
});
