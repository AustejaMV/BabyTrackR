import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { HandoffPage } from "./HandoffPage";

vi.mock("../utils/handoffGenerator", () => ({
  getHandoffSessionFromLocal: vi.fn(),
  isHandoffSessionExpired: vi.fn(),
  updateHandoffSessionLogs: vi.fn(),
}));

vi.mock("../utils/handoffApi", () => ({
  fetchHandoffSession: vi.fn(),
  addHandoffLog: vi.fn(),
  fetchHandoffLogs: vi.fn(() => Promise.resolve([])),
}));

import { getHandoffSessionFromLocal, isHandoffSessionExpired } from "../utils/handoffGenerator";
import { fetchHandoffSession } from "../utils/handoffApi";

const validSession = {
  id: "handoff_123",
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
  babyName: "Baby",
  lastFeed: null,
  nextFeedEta: null,
  lastNap: null,
  napWindowStatus: "unknown" as const,
  lastDiaper: null,
  moodNote: null,
  headsUp: null,
  logs: [],
};

function renderHandoff(sessionId: string) {
  return render(
    <MemoryRouter initialEntries={[`/handoff/${sessionId}`]}>
      <Routes>
        <Route path="/handoff/:sessionId" element={<HandoffPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("HandoffPage", () => {
  beforeEach(() => {
    vi.mocked(getHandoffSessionFromLocal).mockReturnValue(null);
    vi.mocked(fetchHandoffSession).mockResolvedValue(null);
    vi.mocked(isHandoffSessionExpired).mockReturnValue(false);
  });

  it("renders session not found when session id missing from local and API", async () => {
    vi.mocked(fetchHandoffSession).mockResolvedValue(null);
    renderHandoff("missing-id");
    const msg = await screen.findByText(/session not found/i, {}, { timeout: 3000 });
    expect(msg).toBeTruthy();
    expect(msg.textContent).toMatch(/session not found/i);
  });

  it("renders with valid session from local", async () => {
    vi.mocked(getHandoffSessionFromLocal).mockReturnValue(validSession as any);
    renderHandoff("handoff_123");
    const el = await screen.findByText("Baby", {}, { timeout: 2000 });
    expect(el).toBeTruthy();
  });

  it("renders expired copy when session is expired", async () => {
    vi.mocked(getHandoffSessionFromLocal).mockReturnValue(validSession as any);
    vi.mocked(isHandoffSessionExpired).mockReturnValue(true);
    renderHandoff("handoff_123");
    const el = await screen.findByText(/this handoff card has expired/i, {}, { timeout: 2000 });
    expect(el).toBeTruthy();
  });
});
