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

describe("OnboardingNavigator", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders 8 progress dots", () => {
    const { container } = render(
      <OnboardingNavigator onComplete={() => {}} />,
    );
    const dots = container.querySelectorAll(
      'div[style*="border-radius: 4"]',
    );
    expect(dots.length).toBe(8);
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

  it("shows baby setup fields on step 2", () => {
    render(<OnboardingNavigator onComplete={() => {}} />);
    fireEvent.click(screen.getByText("Get started"));
    vi.advanceTimersByTime(300);
    fireEvent.click(screen.getByText("Sounds good"));
    vi.advanceTimersByTime(300);
    expect(
      screen.getByText("Tell me about your little one"),
    ).toBeDefined();
    expect(screen.getByLabelText("Baby's name")).toBeDefined();
    expect(screen.getByLabelText("Birth date")).toBeDefined();
  });

  it('shows "And what\'s your name?" on step 3', () => {
    render(<OnboardingNavigator onComplete={() => {}} />);
    fireEvent.click(screen.getByText("Get started"));
    vi.advanceTimersByTime(300);
    fireEvent.click(screen.getByText("Sounds good"));
    vi.advanceTimersByTime(300);
    fireEvent.click(screen.getByText("Continue"));
    vi.advanceTimersByTime(300);
    expect(screen.getByText("And what's your name?")).toBeDefined();
  });

  it('shows preferences (date, time, language) on step 4', () => {
    render(<OnboardingNavigator onComplete={() => {}} />);
    fireEvent.click(screen.getByText("Get started"));
    vi.advanceTimersByTime(300);
    fireEvent.click(screen.getByText("Sounds good"));
    vi.advanceTimersByTime(300);
    fireEvent.click(screen.getByText("Continue"));
    vi.advanceTimersByTime(300);
    fireEvent.click(screen.getByText("Continue"));
    vi.advanceTimersByTime(300);
    expect(screen.getByText("How do you like your dates?")).toBeDefined();
    expect(screen.getByText("DD/MM/YYYY")).toBeDefined();
    expect(screen.getByText("MM/DD/YYYY")).toBeDefined();
    expect(screen.getByText("24-hour")).toBeDefined();
    expect(screen.getByText("12-hour")).toBeDefined();
    expect(screen.getByText("English")).toBeDefined();
  });

  it('shows "Log your first event" on step 5', () => {
    render(<OnboardingNavigator onComplete={() => {}} />);
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
    expect(screen.getByText("Log your first event")).toBeDefined();
    expect(screen.getByText("Log a feed now")).toBeDefined();
  });

  it("shows 4 quick-log alternatives on step 5", () => {
    render(<OnboardingNavigator onComplete={() => {}} />);
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
    expect(screen.getByText("Sleep")).toBeDefined();
    expect(screen.getByText("Nappy")).toBeDefined();
    expect(screen.getByText("Bottle")).toBeDefined();
    expect(screen.getByText("Tummy")).toBeDefined();
  });

  it('shows "Save your data" on step 6', () => {
    render(<OnboardingNavigator onComplete={() => {}} />);
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
    fireEvent.click(screen.getByText("Log a feed now"));
    vi.advanceTimersByTime(300);
    expect(screen.getByText("Save your data")).toBeDefined();
    expect(screen.getByText("Continue with Google")).toBeDefined();
    expect(screen.getByText("Continue with Email")).toBeDefined();
  });

  it('shows "You\'re ready!" and "Start tracking" on step 7', () => {
    render(<OnboardingNavigator onComplete={() => {}} />);
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
    fireEvent.click(screen.getByText("Log a feed now"));
    vi.advanceTimersByTime(300);
    fireEvent.click(screen.getByText("Continue without account"));
    vi.advanceTimersByTime(300);
    expect(screen.getByText("You're ready!")).toBeDefined();
    expect(screen.getByText("Start tracking")).toBeDefined();
  });

  it("shows 5 unlock features on step 7", () => {
    render(<OnboardingNavigator onComplete={() => {}} />);
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
    fireEvent.click(screen.getByText("Log a feed now"));
    vi.advanceTimersByTime(300);
    fireEvent.click(screen.getByText("Continue without account"));
    vi.advanceTimersByTime(300);
    expect(screen.getByText("Pattern hints")).toBeDefined();
    expect(screen.getByText("Nap predictor")).toBeDefined();
    expect(screen.getByText("Daily summary")).toBeDefined();
    expect(screen.getByText("Weekly narrative")).toBeDefined();
    expect(screen.getByText("Full insights")).toBeDefined();
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
    fireEvent.click(screen.getByText("Log a feed now"));
    vi.advanceTimersByTime(300);
    fireEvent.click(screen.getByText("Continue without account"));
    vi.advanceTimersByTime(300);
    fireEvent.click(screen.getByText("Start tracking"));
    expect(completed).toBe(true);
  });
});
