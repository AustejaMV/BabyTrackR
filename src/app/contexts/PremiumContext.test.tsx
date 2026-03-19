import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { PremiumProvider, usePremium, daysLeftOnAdReward } from "./PremiumContext";

function TestConsumer() {
  const { isPremium, purchaseSource, unlockViaAd } = usePremium();
  return (
    <div>
      <span data-testid="isPremium">{String(isPremium)}</span>
      <span data-testid="purchaseSource">{String(purchaseSource)}</span>
      <button onClick={unlockViaAd}>unlock</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <PremiumProvider>
      <TestConsumer />
    </PremiumProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("PremiumContext", () => {
  it("isPremium returns false by default", () => {
    renderWithProvider();
    expect(screen.getByTestId("isPremium").textContent).toBe("false");
  });

  it("isPremium returns true when testing flag is set", () => {
    localStorage.setItem("cradl-premium", "true");
    renderWithProvider();
    expect(screen.getByTestId("isPremium").textContent).toBe("true");
  });

  it("purchaseSource is 'testing' when test flag is set", () => {
    localStorage.setItem("cradl-premium", "true");
    renderWithProvider();
    expect(screen.getByTestId("purchaseSource").textContent).toBe("testing");
  });

  it("isPremium returns true after unlockViaAd()", () => {
    renderWithProvider();
    expect(screen.getByTestId("isPremium").textContent).toBe("false");

    act(() => {
      screen.getByText("unlock").click();
    });

    expect(screen.getByTestId("isPremium").textContent).toBe("true");
  });

  it("purchaseSource is 'ad_reward' after unlockViaAd()", () => {
    renderWithProvider();

    act(() => {
      screen.getByText("unlock").click();
    });

    expect(screen.getByTestId("purchaseSource").textContent).toBe("ad_reward");
  });

  it("isPremium returns false when ad reward has expired", () => {
    const pastExpiry = Date.now() - 1000;
    localStorage.setItem("cradl-ad-reward-expires", String(pastExpiry));
    renderWithProvider();
    expect(screen.getByTestId("isPremium").textContent).toBe("false");
  });

  it("purchaseSource is null when no premium source active", () => {
    renderWithProvider();
    expect(screen.getByTestId("purchaseSource").textContent).toBe("null");
  });

  it("daysLeftOnAdReward returns correct days", () => {
    const fiveDaysFromNow = Date.now() + 5 * 86_400_000;
    localStorage.setItem("cradl-ad-reward-expires", String(fiveDaysFromNow));
    expect(daysLeftOnAdReward()).toBe(5);
  });

  it("daysLeftOnAdReward returns 0 when no reward set", () => {
    expect(daysLeftOnAdReward()).toBe(0);
  });

  it("daysLeftOnAdReward returns 0 when reward expired", () => {
    localStorage.setItem("cradl-ad-reward-expires", String(Date.now() - 1000));
    expect(daysLeftOnAdReward()).toBe(0);
  });

  it("usePremium returns safe defaults when used outside provider", () => {
    function Bare() {
      const ctx = usePremium();
      return <span data-testid="bare">{String(ctx.isPremium)}</span>;
    }
    render(<Bare />);
    expect(screen.getByTestId("bare").textContent).toBe("false");
  });
});
