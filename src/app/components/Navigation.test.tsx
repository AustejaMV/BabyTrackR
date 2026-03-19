import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Navigation } from "./Navigation";

describe("Navigation", () => {
  it("renders exactly 4 tab labels", () => {
    render(<Navigation />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);
  });

  it('renders "Today", "Story", "Village", and "Me" tabs', () => {
    render(<Navigation />);
    expect(screen.getByText("Today")).toBeDefined();
    expect(screen.getByText("Story")).toBeDefined();
    expect(screen.getByText("Village")).toBeDefined();
    expect(screen.getByText("Me")).toBeDefined();
  });

  it('does NOT render "More" or "Home" labels', () => {
    render(<Navigation />);
    expect(screen.queryByText("More")).toBeNull();
    expect(screen.queryByText("Home")).toBeNull();
  });

  it('Today tab links to "/"', () => {
    render(<Navigation />);
    const todayLink = screen.getByText("Today").closest("a");
    expect(todayLink?.getAttribute("href")).toBe("/");
  });

  it('Story tab links to "/journey"', () => {
    render(<Navigation />);
    const storyLink = screen.getByText("Story").closest("a");
    expect(storyLink?.getAttribute("href")).toBe("/journey");
  });

  it('Village tab links to "/village"', () => {
    render(<Navigation />);
    const villageLink = screen.getByText("Village").closest("a");
    expect(villageLink?.getAttribute("href")).toBe("/village");
  });

  it('Me tab links to "/more"', () => {
    render(<Navigation />);
    const meLink = screen.getByText("Me").closest("a");
    expect(meLink?.getAttribute("href")).toBe("/more");
  });
});
