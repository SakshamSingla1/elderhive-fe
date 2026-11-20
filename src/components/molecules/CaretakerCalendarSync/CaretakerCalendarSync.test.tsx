import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CaretakerCalendarSync from "./CaretakerCalendarSync";
import { useCalendarService } from "../../../services/useCalendarService";

vi.mock("../../../services/useCalendarService", () => ({
  useCalendarService: vi.fn(),
}));

const mockedUseCalendarService = vi.mocked(useCalendarService);

const INITIAL_URL = "https://elderhive-be.onrender.com/api/v1/caretakers/me/calendar.ics?token=old-token";
const NEW_URL = "https://elderhive-be.onrender.com/api/v1/caretakers/me/calendar.ics?token=new-token";

describe("CaretakerCalendarSync", () => {
  let getCalendarLink: ReturnType<typeof vi.fn>;
  let regenerateCalendarLink: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getCalendarLink = vi.fn().mockResolvedValue({ icsUrl: INITIAL_URL });
    regenerateCalendarLink = vi.fn().mockResolvedValue({ icsUrl: NEW_URL });
    mockedUseCalendarService.mockReturnValue({ getCalendarLink, regenerateCalendarLink } as unknown as ReturnType<
      typeof useCalendarService
    >);
  });

  // userEvent.setup() installs its own navigator.clipboard stub, so ours must be defined
  // AFTER that call (not in beforeEach) or user-event's own stub wins instead.
  function stubClipboard(): ReturnType<typeof vi.fn> {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    return writeText;
  }

  it("fetches and displays the current calendar link on mount", async () => {
    render(<CaretakerCalendarSync />);

    expect(await screen.findByDisplayValue(INITIAL_URL)).toBeInTheDocument();
    expect(getCalendarLink).toHaveBeenCalledTimes(1);
  });

  it("shows a load error instead of crashing when the fetch fails", async () => {
    getCalendarLink.mockRejectedValue({});
    render(<CaretakerCalendarSync />);

    expect(await screen.findByText("Could not load your calendar link")).toBeInTheDocument();
  });

  it("copies the link to the clipboard and shows confirmation", async () => {
    const user = userEvent.setup();
    const writeText = stubClipboard();
    render(<CaretakerCalendarSync />);
    await screen.findByDisplayValue(INITIAL_URL);

    await user.click(screen.getByRole("button", { name: "Copy Link" }));

    expect(writeText).toHaveBeenCalledWith(INITIAL_URL);
    expect(await screen.findByRole("button", { name: "Copied!" })).toBeInTheDocument();
  });

  it("regenerating requires confirmation, then replaces the displayed link", async () => {
    const user = userEvent.setup();
    render(<CaretakerCalendarSync />);
    await screen.findByDisplayValue(INITIAL_URL);

    await user.click(screen.getByRole("button", { name: "Regenerate Link" }));
    expect(screen.getByText(/stop working immediately/)).toBeInTheDocument();
    expect(regenerateCalendarLink).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Regenerate" }));

    await waitFor(() => expect(screen.getByDisplayValue(NEW_URL)).toBeInTheDocument());
    expect(screen.queryByDisplayValue(INITIAL_URL)).not.toBeInTheDocument();
  });

  it("closing the confirmation dialog without confirming does not regenerate", async () => {
    const user = userEvent.setup();
    render(<CaretakerCalendarSync />);
    await screen.findByDisplayValue(INITIAL_URL);

    await user.click(screen.getByRole("button", { name: "Regenerate Link" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(regenerateCalendarLink).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue(INITIAL_URL)).toBeInTheDocument();
  });
});
