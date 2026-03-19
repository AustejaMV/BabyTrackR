import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MeScreen } from "./MeScreen";

vi.mock("../contexts/BabyContext", () => ({
  useBaby: () => ({
    activeBaby: {
      id: "b1",
      name: "Lila",
      birthDate: Date.now() - 56 * 86400000,
      parentName: "Sarah",
    },
    babies: [],
  }),
}));

describe("MeScreen (Me tab)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders personal hero card with parent name", () => {
    render(<MeScreen />);
    expect(screen.getByText(/Sarah/)).toBeDefined();
  });

  it("renders weeks postpartum", () => {
    render(<MeScreen />);
    expect(screen.getByText(/\d+ weeks postpartum/)).toBeDefined();
  });

  it("renders 45-minute prompt", () => {
    render(<MeScreen />);
    expect(screen.getByText(/45 minutes/)).toBeDefined();
  });

  it("renders 3 stat cells (Your sleep, Pelvic floor, Mood)", () => {
    render(<MeScreen />);
    expect(screen.getByText("Your sleep")).toBeDefined();
    expect(screen.getByText("Pelvic floor")).toBeDefined();
    expect(screen.getByText("Mood")).toBeDefined();
  });

  it("renders mood check with 4 options", () => {
    render(<MeScreen />);
    expect(screen.getByText("How are you feeling today?")).toBeDefined();
    expect(screen.getByText("Good")).toBeDefined();
    expect(screen.getByText("Okay")).toBeDefined();
    expect(screen.getByText("Struggling")).toBeDefined();
    expect(screen.getByText("Overwhelmed")).toBeDefined();
  });

  it("persists selected mood to localStorage", () => {
    render(<MeScreen />);
    fireEvent.click(screen.getByText("😊"));
    const d = new Date();
    const key = `cradl-mood-today-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(localStorage.getItem(key)).toBe("good");
  });

  it("renders Your sleep this week chart", () => {
    render(<MeScreen />);
    expect(screen.getByText("Your sleep this week")).toBeDefined();
    expect(screen.getByText("Log tonight →")).toBeDefined();
  });

  it("renders Cradl noticed section with PANDAS helpline", () => {
    render(<MeScreen />);
    expect(screen.getByText(/0808 1961 776/)).toBeDefined();
  });

  it("renders Recovery section with 3 rows", () => {
    render(<MeScreen />);
    expect(screen.getByText("Recovery")).toBeDefined();
    expect(screen.getByText("Body recovery")).toBeDefined();
    expect(screen.getByText("Postnatal check-up")).toBeDefined();
    expect(screen.getByText("Relationship check-in")).toBeDefined();
  });

  it("renders time capsule card", () => {
    render(<MeScreen />);
    expect(
      screen.getByText("Write a note to your future self →"),
    ).toBeDefined();
  });

  it("renders Tools & admin section with 9 chips", () => {
    render(<MeScreen />);
    expect(screen.getByText("Tools & admin")).toBeDefined();
    expect(screen.getByText("Export data")).toBeDefined();
    expect(screen.getByText("GP summary")).toBeDefined();
    expect(screen.getByText("Skin tracker")).toBeDefined();
    expect(screen.getByText("Safety")).toBeDefined();
    expect(screen.getByText("Handoff")).toBeDefined();
    expect(screen.getByText("Return to work")).toBeDefined();
  });

  it("renders Settings link", () => {
    render(<MeScreen />);
    expect(screen.getByText("Settings →")).toBeDefined();
  });

  it("renders sections in correct order", () => {
    const { container } = render(<MeScreen />);
    const text = container.textContent ?? "";

    const heroIdx = text.indexOf("Sarah");
    const moodIdx = text.indexOf("How are you feeling");
    const sleepIdx = text.indexOf("Your sleep this week");
    const recoveryIdx = text.indexOf("Recovery");
    const capsuleIdx = text.indexOf("Write a note");
    const toolsIdx = text.indexOf("Tools & admin");
    const settingsIdx = text.indexOf("Settings →");

    expect(heroIdx).toBeLessThan(moodIdx);
    expect(moodIdx).toBeLessThan(sleepIdx);
    expect(sleepIdx).toBeLessThan(recoveryIdx);
    expect(recoveryIdx).toBeLessThan(capsuleIdx);
    expect(capsuleIdx).toBeLessThan(toolsIdx);
    expect(toolsIdx).toBeLessThan(settingsIdx);
  });
});
