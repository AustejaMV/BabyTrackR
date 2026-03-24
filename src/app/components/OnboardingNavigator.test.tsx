import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OnboardingNavigator } from "./OnboardingNavigator";

vi.mock("../contexts/BabyContext", () => ({
  useBaby: () => ({
    addBaby: vi.fn(() => ({ id: "test-baby-1" })),
    setActiveBabyId: vi.fn(),
    updateActiveBaby: vi.fn(),
    activeBaby: null,
    babies: [],
  }),
}));

vi.mock("../utils/onboardingStorage", () => ({
  getOnboardingStep: () => 0,
  saveOnboardingStep: vi.fn(),
  markOnboardingComplete: vi.fn(),
  clearOnboardingStep: vi.fn(),
}));

vi.mock("../utils/imageCompress", () => ({
  compressBabyPhoto: vi.fn(),
}));

/** Navigate: Welcome → Why Cradl → Preferences → Baby → Parent name → (caller continues from step 5). */
function advanceThroughParentName() {
  fireEvent.click(screen.getByText("Get started"));
  vi.advanceTimersByTime(300);
  fireEvent.click(screen.getByText("Sounds good"));
  vi.advanceTimersByTime(300);
  fireEvent.click(screen.getByText("Continue"));
  vi.advanceTimersByTime(300);
  fireEvent.click(screen.getByText("Continue"));
  vi.advanceTimersByTime(300);
  fireEvent.click(screen.getByText("Continue"));
  vi.advanceTimersByTime(300);
}

describe("OnboardingNavigator", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders 7 progress dots (steps 0–6)", () => {
    const { container } = render(<OnboardingNavigator onComplete={() => {}} />);
    const dots = container.querySelectorAll('div[style*="border-radius: 4"]');
    expect(dots.length).toBe(7);
  });

  it('shows "Get started" button on step 0 (Welcome)', () => {
    render(<OnboardingNavigator onComplete={() => {}} />);
    expect(screen.getByText("Get started")).toBeDefined();
    expect(screen.getByAltText("Cradl")).toBeDefined();
  });

  it('shows "I already have an account" link on step 0', () => {
    render(<OnboardingNavigator onComplete={() => {}} />);
    expect(screen.getByText("I already have an account")).toBeDefined();
  });

  it('advances to step 1 (Why Cradl) with "Built for 3am."', () => {
    render(<OnboardingNavigator onComplete={() => {}} />);
    fireEvent.click(screen.getByText("Get started"));
    vi.advanceTimersByTime(300);
    expect(screen.getByText("Built for 3am.")).toBeDefined();
    expect(screen.getByText("Sounds good")).toBeDefined();
  });

  it("shows 3 value props on step 1", () => {
    render(<OnboardingNavigator onComplete={() => {}} />);
    fireEvent.click(screen.getByText("Get started"));
    vi.advanceTimersByTime(300);
    expect(screen.getByText("Why they're crying")).toBeDefined();
    expect(screen.getByText("Nap predictions")).toBeDefined();
    expect(screen.getByText("You matter too")).toBeDefined();
  });

  it("shows preferences on step 2", () => {
    render(<OnboardingNavigator onComplete={() => {}} />);
    fireEvent.click(screen.getByText("Get started"));
    vi.advanceTimersByTime(300);
    fireEvent.click(screen.getByText("Sounds good"));
    vi.advanceTimersByTime(300);
    expect(screen.getByText("How do you like your dates?")).toBeDefined();
    expect(screen.getByText("DD/MM/YYYY")).toBeDefined();
    expect(screen.getByText("MM/DD/YYYY")).toBeDefined();
    expect(screen.getByText("24-hour")).toBeDefined();
    expect(screen.getByText("12-hour")).toBeDefined();
    expect(screen.getByText("English")).toBeDefined();
  });

  it("shows baby setup fields on step 3", () => {
    render(<OnboardingNavigator onComplete={() => {}} />);
    fireEvent.click(screen.getByText("Get started"));
    vi.advanceTimersByTime(300);
    fireEvent.click(screen.getByText("Sounds good"));
    vi.advanceTimersByTime(300);
    fireEvent.click(screen.getByText("Continue"));
    vi.advanceTimersByTime(300);
    expect(screen.getByText("Tell me about your little one")).toBeDefined();
    expect(screen.getByLabelText("Baby's name")).toBeDefined();
    expect(screen.getByLabelText("Birth date")).toBeDefined();
  });

  it('shows "What\'s your name?" on step 4', () => {
    render(<OnboardingNavigator onComplete={() => {}} />);
    advanceThroughParentName();
    expect(screen.getByText("What's your name?")).toBeDefined();
  });

  it('shows quick tour with 4 cards on step 5', () => {
    render(<OnboardingNavigator onComplete={() => {}} />);
    advanceThroughParentName();
    expect(screen.getByText("Here's how Cradl works")).toBeDefined();
    expect(screen.getByText("Tap to log")).toBeDefined();
    expect(screen.getByText("Patterns emerge")).toBeDefined();
    expect(screen.getByText("3am mode")).toBeDefined();
    expect(screen.getByText("Got it")).toBeDefined();
  });

  it('shows "You\'re all set!" and "Start tracking" on step 6', () => {
    render(<OnboardingNavigator onComplete={() => {}} />);
    advanceThroughParentName();
    fireEvent.click(screen.getByText("Got it"));
    vi.advanceTimersByTime(300);
    expect(screen.getByText("You're all set!")).toBeDefined();
    expect(screen.getByText("Start tracking")).toBeDefined();
  });

  it("shows backup upsell on step 6", () => {
    render(<OnboardingNavigator onComplete={() => {}} />);
    advanceThroughParentName();
    fireEvent.click(screen.getByText("Got it"));
    vi.advanceTimersByTime(300);
    expect(screen.getByText("Want to back up your data?")).toBeDefined();
    expect(screen.getByText("Create account")).toBeDefined();
  });

  it('calls onComplete when "Start tracking" is clicked', () => {
    let completed = false;
    render(
      <OnboardingNavigator
        onComplete={() => {
          completed = true;
        }}
      />,
    );
    advanceThroughParentName();
    fireEvent.click(screen.getByText("Got it"));
    vi.advanceTimersByTime(300);
    fireEvent.click(screen.getByText("Start tracking"));
    expect(completed).toBe(true);
  });
});
