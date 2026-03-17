import { describe, it, expect } from "vitest";
import { useNetworkStatus } from "./networkStatus";

describe("networkStatus", () => {
  it("exports useNetworkStatus function", () => {
    expect(typeof useNetworkStatus).toBe("function");
  });
});
