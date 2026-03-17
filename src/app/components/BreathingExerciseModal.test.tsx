import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { BreathingExerciseModal } from "./BreathingExerciseModal";

describe("BreathingExerciseModal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows first phase label (Breathe in...)", () => {
    const onClose = vi.fn();
    render(<BreathingExerciseModal onClose={onClose} />);
    expect(screen.getByText("Breathe in...")).toBeInTheDocument();
    expect(screen.getByText("Round 1 of 4")).toBeInTheDocument();
  });

  it("advances through phases in correct order", async () => {
    const onClose = vi.fn();
    render(<BreathingExerciseModal onClose={onClose} />);
    expect(screen.getByText("Breathe in...")).toBeInTheDocument();
    await act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.getByText("Hold...")).toBeInTheDocument();
    await act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.getByText("Breathe out...")).toBeInTheDocument();
    await act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.getByText("Rest...")).toBeInTheDocument();
    await act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByText("Breathe in...")).toBeInTheDocument();
    expect(screen.getByText("Round 2 of 4")).toBeInTheDocument();
  });

  it("completes 4 cycles then shows done state", async () => {
    const onClose = vi.fn();
    render(<BreathingExerciseModal onClose={onClose} />);
    const oneRoundMs = 4000 + 4000 + 4000 + 2000;
    for (let r = 0; r < 4; r++) {
      await act(() => { vi.advanceTimersByTime(oneRoundMs); });
    }
    expect(screen.getByText("Take your time. You're doing great.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /done/i })).toBeInTheDocument();
  });

  it("Skip button calls onClose", () => {
    const onClose = vi.fn();
    render(<BreathingExerciseModal onClose={onClose} />);
    fireEvent.click(screen.getByText("Skip"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
