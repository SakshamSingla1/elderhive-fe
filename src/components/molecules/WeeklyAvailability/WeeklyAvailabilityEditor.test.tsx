import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WeeklyAvailabilityEditor from "./WeeklyAvailabilityEditor";
import { useCaretakerService } from "../../../services/useCaretakerService";

vi.mock("../../../services/useCaretakerService", () => ({
  useCaretakerService: vi.fn(),
}));

const mockedUseCaretakerService = vi.mocked(useCaretakerService);

describe("WeeklyAvailabilityEditor", () => {
  let getAvailability: ReturnType<typeof vi.fn>;
  let addAvailabilitySlot: ReturnType<typeof vi.fn>;
  let updateAvailabilitySlot: ReturnType<typeof vi.fn>;
  let removeAvailabilitySlot: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getAvailability = vi.fn().mockResolvedValue([
      { id: 1, caretakerId: 10, dayOfWeek: "MONDAY", startTime: "09:00:00", endTime: "17:00:00" },
    ]);
    addAvailabilitySlot = vi.fn();
    updateAvailabilitySlot = vi.fn();
    removeAvailabilitySlot = vi.fn().mockResolvedValue("Deleted");
    mockedUseCaretakerService.mockReturnValue(
      { getAvailability, addAvailabilitySlot, updateAvailabilitySlot, removeAvailabilitySlot } as unknown as ReturnType<
        typeof useCaretakerService
      >
    );
  });

  it("loads and shows every day of the week with Monday's existing slot", async () => {
    render(<WeeklyAvailabilityEditor caretakerId={10} />);

    expect(await screen.findByText("09:00 – 17:00")).toBeInTheDocument();
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Sun")).toBeInTheDocument();
    expect(getAvailability).toHaveBeenCalledWith(10);
  });

  it("adding a slot to a day with no existing slots calls addAvailabilitySlot with that day", async () => {
    addAvailabilitySlot.mockResolvedValue({ id: 2, caretakerId: 10, dayOfWeek: "TUESDAY", startTime: "09:00:00", endTime: "17:00:00" });
    const user = userEvent.setup();
    render(<WeeklyAvailabilityEditor caretakerId={10} />);
    await screen.findByText("09:00 – 17:00");

    await user.click(screen.getByLabelText("Add TUESDAY slot"));
    await user.click(screen.getByLabelText("Save slot"));

    await waitFor(() =>
      expect(addAvailabilitySlot).toHaveBeenCalledWith({ dayOfWeek: "TUESDAY", startTime: "09:00", endTime: "17:00" })
    );
  });

  it("editing an existing slot calls updateAvailabilitySlot with its id", async () => {
    updateAvailabilitySlot.mockResolvedValue({ id: 1, caretakerId: 10, dayOfWeek: "MONDAY", startTime: "10:00:00", endTime: "18:00:00" });
    const user = userEvent.setup();
    render(<WeeklyAvailabilityEditor caretakerId={10} />);
    await screen.findByText("09:00 – 17:00");

    await user.click(screen.getByLabelText("Edit MONDAY slot"));
    await user.click(screen.getByLabelText("Save slot"));

    await waitFor(() => expect(updateAvailabilitySlot).toHaveBeenCalledWith(1, { dayOfWeek: "MONDAY", startTime: "09:00", endTime: "17:00" }));
  });

  it("removing a slot calls removeAvailabilitySlot and drops it from the list", async () => {
    const user = userEvent.setup();
    render(<WeeklyAvailabilityEditor caretakerId={10} />);
    await screen.findByText("09:00 – 17:00");

    await user.click(screen.getByLabelText("Remove MONDAY slot"));

    await waitFor(() => expect(removeAvailabilitySlot).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.queryByText("09:00 – 17:00")).not.toBeInTheDocument());
  });

  it("canceling an in-progress add never calls addAvailabilitySlot", async () => {
    const user = userEvent.setup();
    render(<WeeklyAvailabilityEditor caretakerId={10} />);
    await screen.findByText("09:00 – 17:00");

    await user.click(screen.getByLabelText("Add WEDNESDAY slot"));
    await user.click(screen.getByLabelText("Cancel"));

    expect(addAvailabilitySlot).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Add WEDNESDAY slot")).toBeInTheDocument();
  });

  it("shows an error message when loading availability fails", async () => {
    getAvailability.mockRejectedValue({ response: { data: { message: "Could not reach the server" } } });
    render(<WeeklyAvailabilityEditor caretakerId={10} />);

    expect(await screen.findByText("Could not reach the server")).toBeInTheDocument();
  });
});
