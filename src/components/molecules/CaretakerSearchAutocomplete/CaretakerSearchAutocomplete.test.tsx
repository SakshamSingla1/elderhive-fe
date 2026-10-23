import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CaretakerSearchAutocomplete from "./CaretakerSearchAutocomplete";
import { useSearchService } from "../../../services/useSearchService";
import { usePresenceService } from "../../../services/usePresenceService";
import { useWebSocket } from "../../../contexts/WebSocketContext";
import { CaretakerVerificationStatusEnum } from "../../../utils/enums";

vi.mock("../../../services/useSearchService", () => ({
  useSearchService: vi.fn(),
}));
vi.mock("../../../services/usePresenceService", () => ({
  usePresenceService: vi.fn(),
}));
vi.mock("../../../contexts/WebSocketContext", () => ({
  useWebSocket: vi.fn(),
}));

const mockedUseSearchService = vi.mocked(useSearchService);
const mockedUsePresenceService = vi.mocked(usePresenceService);
const mockedUseWebSocket = vi.mocked(useWebSocket);

describe("CaretakerSearchAutocomplete", () => {
  let searchCaretakers: ReturnType<typeof vi.fn>;
  let getStatus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    searchCaretakers = vi.fn().mockResolvedValue([
      { id: 1, userId: 101, name: "Carla Caretaker", specialtiesSummary: "Mobility Assistance", ratingAverage: 4.5, distanceKm: null, verificationStatus: CaretakerVerificationStatusEnum.VERIFIED },
    ]);
    mockedUseSearchService.mockReturnValue({ searchCaretakers } as unknown as ReturnType<typeof useSearchService>);
    getStatus = vi.fn().mockResolvedValue({ "101": true });
    mockedUsePresenceService.mockReturnValue({ getStatus } as unknown as ReturnType<typeof usePresenceService>);
    mockedUseWebSocket.mockReturnValue({ connected: true, subscribe: vi.fn(() => () => {}), publish: vi.fn() });
  });

  it("does not search until at least 2 characters are typed", async () => {
    const user = userEvent.setup({ delay: null });
    render(<CaretakerSearchAutocomplete label="Caretaker" onSelect={vi.fn()} />);

    await user.type(screen.getByLabelText("Caretaker"), "c");
    vi.advanceTimersByTime(500);
    expect(searchCaretakers).not.toHaveBeenCalled();
  });

  it("debounces the search and calls searchCaretakers with the typed query after ~400ms", async () => {
    const user = userEvent.setup({ delay: null });
    render(<CaretakerSearchAutocomplete label="Caretaker" onSelect={vi.fn()} />);

    await user.type(screen.getByLabelText("Caretaker"), "carla");
    expect(searchCaretakers).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    await waitFor(() => expect(searchCaretakers).toHaveBeenCalledWith({ query: "carla", limit: 10 }));
  });

  it("selecting an option calls onSelect with that result", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<CaretakerSearchAutocomplete label="Caretaker" onSelect={onSelect} />);

    await user.type(screen.getByLabelText("Caretaker"), "carla");
    vi.advanceTimersByTime(400);

    const option = await screen.findByText("Carla Caretaker");
    await user.click(option);

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1, name: "Carla Caretaker" }));
  });

  it("pre-fills from initialValue without triggering a search", () => {
    render(<CaretakerSearchAutocomplete label="Caretaker" onSelect={vi.fn()} initialValue={{ id: 5, name: "Preselected Carla" }} />);

    expect(screen.getByDisplayValue("Preselected Carla")).toBeInTheDocument();
    expect(searchCaretakers).not.toHaveBeenCalled();
  });

  it("shows an online presence dot for a result once the status snapshot resolves", async () => {
    const user = userEvent.setup({ delay: null });
    render(<CaretakerSearchAutocomplete label="Caretaker" onSelect={vi.fn()} />);

    await user.type(screen.getByLabelText("Caretaker"), "carla");
    vi.advanceTimersByTime(400);
    await screen.findByText("Carla Caretaker");

    await waitFor(() => expect(getStatus).toHaveBeenCalledWith([101]));
    await waitFor(() => expect(screen.getByLabelText("Online")).toBeInTheDocument());
  });
});
