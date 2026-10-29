import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DashboardHero from "./DashboardHero";

describe("DashboardHero", () => {
  it("renders the greeting, date, and message", () => {
    render(<DashboardHero greeting="Good morning" dateLabel="Thursday, October 29" message="here's what's new" />);

    expect(screen.getByText("Good morning")).toBeInTheDocument();
    expect(screen.getByText(/Thursday, October 29/)).toBeInTheDocument();
    expect(screen.getByText(/here's what's new/)).toBeInTheDocument();
  });

  it("falls back to a plain '?' avatar when no user is authenticated", () => {
    render(<DashboardHero greeting="Good evening" dateLabel="Friday, October 30" />);

    expect(screen.getByText("?")).toBeInTheDocument();
  });
});
