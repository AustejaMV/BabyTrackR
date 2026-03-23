import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { MeScreen } from "./MeScreen";
import { getQuestionForWeek } from "../utils/weeklyReflectionStorage";

function renderMe() {
  return render(
    <MemoryRouter>
      <MeScreen />
    </MemoryRouter>,
  );
}

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
    renderMe();
    expect(screen.getByText(/Sarah/)).toBeDefined();
  });

  it("renders weeks postpartum", () => {
    renderMe();
    expect(screen.getByText(/\d+ weeks postpartum/)).toBeDefined();
  });

  it("renders 45-minute prompt", () => {
    renderMe();
    expect(screen.getByText(/45 minutes/)).toBeDefined();
  });

  it("renders 3 stat cells (Your sleep, Pelvic floor, Mood)", () => {
    renderMe();
    expect(screen.getByText("Your sleep")).toBeDefined();
    expect(screen.getByText("Pelvic floor")).toBeDefined();
    expect(screen.getByText("Mood")).toBeDefined();
  });

  it("renders mood check with 4 options", () => {
    renderMe();
    expect(screen.getByText("How are you feeling today?")).toBeDefined();
    expect(screen.getByText("Good")).toBeDefined();
    expect(screen.getByText("Okay")).toBeDefined();
    expect(screen.getByText("Struggling")).toBeDefined();
    expect(screen.getByText("Overwhelmed")).toBeDefined();
  });

  it("persists selected mood to localStorage", () => {
    renderMe();
    fireEvent.click(screen.getByText("😊"));
    const d = new Date();
    const key = `cradl-mood-today-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(localStorage.getItem(key)).toBe("good");
  });

  it("renders Your sleep this week chart", () => {
    renderMe();
    expect(screen.getByText("Your sleep this week")).toBeDefined();
    expect(screen.getByText("Log tonight →")).toBeDefined();
  });

  it("renders Cradl noticed section with support guidance", () => {
    renderMe();
    expect(screen.getByText(/local emergency or mental health crisis line/i)).toBeDefined();
  });

  it("renders Recovery section with 3 rows", () => {
    renderMe();
    expect(screen.getByText("Recovery")).toBeDefined();
    expect(screen.getByText("Body recovery")).toBeDefined();
    expect(screen.getByText("Postnatal check-up")).toBeDefined();
    expect(screen.getByText("Relationship check-in")).toBeDefined();
  });

  it("renders weekly reflection / time capsule card", () => {
    renderMe();
    // Mock baby is 56 days old → 8 weeks (matches BabyContext mock birthDate offset)
    const birthOffsetMs = 56 * 86400000;
    const weeks = Math.max(0, Math.floor(birthOffsetMs / (7 * 24 * 60 * 60 * 1000)));
    expect(screen.getByText(getQuestionForWeek(weeks))).toBeDefined();
    expect(screen.getByPlaceholderText("Write something...")).toBeDefined();
    expect(screen.getByText("Save →")).toBeDefined();
  });

  it("renders Tools & admin section with chips (Prompt 8: skin/meds on Health tab)", () => {
    renderMe();
    expect(screen.getByText("Tools & admin")).toBeDefined();
    expect(screen.getByText("Export data")).toBeDefined();
    expect(screen.getByText("Memory book")).toBeDefined();
    expect(screen.getByText("GP summary")).toBeDefined();
    expect(screen.getByText("Shopping list")).toBeDefined();
    expect(screen.getByText("Handoff")).toBeDefined();
    expect(screen.getByText("Return to work")).toBeDefined();
    expect(screen.getByText("Library")).toBeDefined();
    expect(screen.getByText("My notes to myself")).toBeDefined();
    expect(screen.getByText("Quick notes")).toBeDefined();
    expect(screen.getByText("Safety")).toBeDefined();
  });

  it("renders Settings link", () => {
    renderMe();
    expect(screen.getByText("Settings →")).toBeDefined();
  });

  it("renders sections in correct order", () => {
    const { container } = renderMe();
    const text = container.textContent ?? "";

    const heroIdx = text.indexOf("Sarah");
    const moodIdx = text.indexOf("How are you feeling");
    const sleepIdx = text.indexOf("Your sleep this week");
    const recoveryIdx = text.indexOf("Recovery");
    const capsuleIdx = text.indexOf("Save →");
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
