import { describe, it, expect, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { DurationPicker, MAX_DURATION_HISTORY_MS } from "./DurationPicker";

function render(props: { valueMs: number; maxMs: number; onChange: (ms: number) => void }) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(createElement(DurationPicker, props));
  return { container, root };
}

/** Wait for React 18 createRoot to commit (async by default). */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("DurationPicker", () => {
  it("MAX_DURATION_HISTORY_MS is 23h 59m", () => {
    expect(MAX_DURATION_HISTORY_MS).toBe(23 * 60 * 60 * 1000 + 59 * 60 * 1000);
  });

  it("renders hours and minutes columns", async () => {
    const onChange = vi.fn();
    const { container, root } = render({
      valueMs: 0,
      maxMs: 2 * 60 * 60 * 1000,
      onChange,
    });
    await flush();
    expect(container.textContent).toContain("0h");
    expect(container.textContent).toContain("0m");
    root.unmount();
    document.body.removeChild(container);
  });

  it("shows current value within max", async () => {
    const onChange = vi.fn();
    const { container, root } = render({
      valueMs: 65 * 60 * 1000,
      maxMs: 4 * 60 * 60 * 1000,
      onChange,
    });
    await flush();
    expect(container.textContent).toContain("1h");
    expect(container.textContent).toContain("5m");
    root.unmount();
    document.body.removeChild(container);
  });

  it("calls onChange with clamped value when minute is clicked", async () => {
    const onChange = vi.fn();
    const { container, root } = render({
      valueMs: 0,
      maxMs: 60 * 60 * 1000,
      onChange,
    });
    await flush();
    const thirtyMin = Array.from(container.querySelectorAll("*")).find((el) => el.textContent === "30m");
    expect(thirtyMin).toBeDefined();
    (thirtyMin as HTMLElement).click();
    expect(onChange).toHaveBeenCalledWith(30 * 60 * 1000);
    root.unmount();
    document.body.removeChild(container);
  });

  it("calls onChange not above maxMs", async () => {
    const onChange = vi.fn();
    const maxMs = 60 * 60 * 1000;
    const { container, root } = render({ valueMs: 0, maxMs, onChange });
    await flush();
    const oneHour = Array.from(container.querySelectorAll("*")).find((el) => el.textContent === "1h");
    expect(oneHour).toBeDefined();
    (oneHour as HTMLElement).click();
    expect(onChange).toHaveBeenCalledWith(maxMs);
    root.unmount();
    document.body.removeChild(container);
  });
});
