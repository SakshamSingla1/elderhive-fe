import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WeeklyAvailabilityView from "./WeeklyAvailabilityView";

describe("WeeklyAvailabilityView", () => {
  it("shows a message when there are no slots at all", () => {
    render(<WeeklyAvailabilityView slots={[]} />);
    expect(screen.getByText("This caretaker hasn't shared their weekly availability yet.")).toBeInTheDocument();
  });

  it("renders every day of the week, marking days with no slots as Unavailable", () => {
    render(
      <WeeklyAvailabilityView
        slots={[
          { id: 1, caretakerId: 10, dayOfWeek: "MONDAY", startTime: "09:00:00", endTime: "17:00:00" },
        ]}
      />
    );

    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("09:00–17:00")).toBeInTheDocument();
    // Every other day of the week shows "Unavailable" (6 of the 7 days).
    expect(screen.getAllByText("Unavailable")).toHaveLength(6);
  });

  it("groups multiple slots for the same day under that day", () => {
    render(
      <WeeklyAvailabilityView
        slots={[
          { id: 1, caretakerId: 10, dayOfWeek: "MONDAY", startTime: "09:00:00", endTime: "12:00:00" },
          { id: 2, caretakerId: 10, dayOfWeek: "MONDAY", startTime: "13:00:00", endTime: "17:00:00" },
        ]}
      />
    );

    expect(screen.getByText("09:00–12:00")).toBeInTheDocument();
    expect(screen.getByText("13:00–17:00")).toBeInTheDocument();
  });
});
