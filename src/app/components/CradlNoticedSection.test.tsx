import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CradlNoticedSection, type NoticeCard } from "./CradlNoticedSection";

function makeNotice(overrides: Partial<NoticeCard> = {}): NoticeCard {
  return {
    id: "notice-1",
    color: "coral",
    title: "Sleep dip detected",
    body: "Lila slept 2 fewer hours than her weekly average.",
    ...overrides,
  };
}

describe("CradlNoticedSection", () => {
  it("returns null when notices array is empty", () => {
    const { container } = render(<CradlNoticedSection notices={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it('renders "CRADL NOTICED" header with coral dot', () => {
    render(<CradlNoticedSection notices={[makeNotice()]} />);
    expect(screen.getByText(/cradl noticed/i)).toBeDefined();
  });

  it("renders notice cards with correct border colors", () => {
    const colors = ["amber", "green", "blue", "purple", "coral"] as const;
    const borderMap: Record<string, string> = {
      amber: "#d4904a",
      green: "#4a8a4a",
      blue: "#4a6ab4",
      purple: "#7a4ab4",
      coral: "#d4604a",
    };

    const notices: NoticeCard[] = colors.map((color, i) =>
      makeNotice({ id: `n-${i}`, color, title: `Title ${color}` }),
    );

    const { container } = render(<CradlNoticedSection notices={notices} />);
    const cards = container.querySelectorAll<HTMLElement>(
      '[style*="border-left"]',
    );

    expect(cards.length).toBe(5);
    colors.forEach((color, i) => {
      expect(cards[i].style.borderLeft).toContain(borderMap[color]);
    });
  });

  it("renders CTA when provided", () => {
    const onClick = vi.fn();
    const notice = makeNotice({
      cta: { label: "Try white noise", action: "Play", onClick },
    });

    render(<CradlNoticedSection notices={[notice]} />);
    expect(screen.getByText("Try white noise")).toBeDefined();
    expect(screen.getByText(/Play/)).toBeDefined();
  });

  it("renders dismiss button when dismissible=true", () => {
    const notice = makeNotice({ dismissible: true });
    render(<CradlNoticedSection notices={[notice]} />);
    expect(screen.getByText(/dismiss/i)).toBeDefined();
  });

  it("dismissing a card removes it from view", () => {
    const onDismiss = vi.fn();
    const notice = makeNotice({ dismissible: true, onDismiss });

    render(<CradlNoticedSection notices={[notice]} />);
    expect(screen.getByText("Sleep dip detected")).toBeDefined();

    fireEvent.click(screen.getByText(/dismiss/i));

    expect(screen.queryByText("Sleep dip detected")).toBeNull();
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
