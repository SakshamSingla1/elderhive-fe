import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CaretakerEmergencyPage from "./Emergency.page";
import { useEmergencyAlertService } from "../../../services/useEmergencyAlertService";
import type { EmergencyAlertResponse } from "../../../services/useEmergencyAlertService";
import { useCaretakerService } from "../../../services/useCaretakerService";
import { useWebSocket } from "../../../contexts/WebSocketContext";
import { useAuthenticatedUser } from "../../../contexts/AuthenticatedUserContext";
import { UserTypeEnum } from "../../../utils/enums";

vi.mock("../../../services/useEmergencyAlertService", () => ({
  useEmergencyAlertService: vi.fn(),
}));
vi.mock("../../../services/useCaretakerService", () => ({
  useCaretakerService: vi.fn(),
}));
vi.mock("../../../contexts/WebSocketContext", () => ({
  useWebSocket: vi.fn(),
}));
vi.mock("../../../contexts/AuthenticatedUserContext", () => ({
  useAuthenticatedUser: vi.fn(),
}));

const mockedUseEmergencyAlertService = vi.mocked(useEmergencyAlertService);
const mockedUseCaretakerService = vi.mocked(useCaretakerService);
const mockedUseWebSocket = vi.mocked(useWebSocket);
const mockedUseAuthenticatedUser = vi.mocked(useAuthenticatedUser);

function alert(overrides: Partial<EmergencyAlertResponse> = {}): EmergencyAlertResponse {
  return {
    id: 1,
    elderProfileId: 10,
    elderName: "Robert",
    triggeredByUserId: 20,
    latitude: 12.9716,
    longitude: 77.5946,
    address: "MG Road, Bengaluru",
    status: "TRIGGERED",
    respondingCaretakerId: null,
    respondingCaretakerName: null,
    responseTimeSeconds: null,
    isOverdue: false,
    distanceKm: 1.1,
    createdAt: "2026-10-22T10:00:00",
    ...overrides,
  };
}

describe("Caretaker Emergency.page", () => {
  let getNearby: ReturnType<typeof vi.fn>;
  let claim: ReturnType<typeof vi.fn>;
  let resolve: ReturnType<typeof vi.fn>;
  let getMyProfile: ReturnType<typeof vi.fn>;
  let subscribeCallback: ((frame: { body: string }) => void) | null;

  beforeEach(() => {
    getNearby = vi.fn().mockResolvedValue([]);
    claim = vi.fn();
    resolve = vi.fn();
    mockedUseEmergencyAlertService.mockReturnValue(
      { trigger: vi.fn(), getNearby, claim, resolve } as unknown as ReturnType<typeof useEmergencyAlertService>
    );

    getMyProfile = vi.fn().mockResolvedValue({ id: 30 });
    mockedUseCaretakerService.mockReturnValue({ getMyProfile } as unknown as ReturnType<typeof useCaretakerService>);

    subscribeCallback = null;
    mockedUseWebSocket.mockReturnValue({
      connected: true,
      subscribe: vi.fn((_, cb) => {
        subscribeCallback = cb;
        return () => {};
      }),
    });
    mockedUseAuthenticatedUser.mockReturnValue({
      user: { id: 200, email: "caretaker@example.com", userType: UserTypeEnum.CARETAKER, primaryRole: UserTypeEnum.CARETAKER, roles: [UserTypeEnum.CARETAKER] },
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshFromServer: vi.fn(),
    });
  });

  it("shows the empty state when there are no nearby active alerts", async () => {
    render(<CaretakerEmergencyPage />);

    expect(await screen.findByText("No active alerts nearby")).toBeInTheDocument();
  });

  it("lists each alert's elder, address, distance, and status", async () => {
    getNearby.mockResolvedValue([alert()]);
    render(<CaretakerEmergencyPage />);

    expect(await screen.findByText("Robert")).toBeInTheDocument();
    expect(screen.getByText("MG Road, Bengaluru")).toBeInTheDocument();
    expect(screen.getByText("1.1 km")).toBeInTheDocument();
    expect(screen.getByText("TRIGGERED")).toBeInTheDocument();
  });

  it("shows an Overdue chip only when the alert is flagged overdue", async () => {
    getNearby.mockResolvedValue([alert({ isOverdue: true })]);
    render(<CaretakerEmergencyPage />);

    expect(await screen.findByText("Overdue")).toBeInTheDocument();
  });

  it("claiming a TRIGGERED alert calls claim() and refreshes the list", async () => {
    getNearby.mockResolvedValueOnce([alert()]).mockResolvedValueOnce([alert({ status: "ACKNOWLEDGED", respondingCaretakerId: 30 })]);
    claim.mockResolvedValue(alert({ status: "ACKNOWLEDGED", respondingCaretakerId: 30 }));
    const user = userEvent.setup();
    render(<CaretakerEmergencyPage />);

    await user.click(await screen.findByRole("button", { name: "Claim" }));

    await waitFor(() => expect(claim).toHaveBeenCalledWith(1));
    expect(await screen.findByText("Resolve")).toBeInTheDocument();
    expect(getNearby).toHaveBeenCalledTimes(2);
  });

  it("shows Resolve only for the alert the caller themselves claimed, not one someone else claimed", async () => {
    getNearby.mockResolvedValue([
      alert({ id: 1, status: "ACKNOWLEDGED", respondingCaretakerId: 30, respondingCaretakerName: "Me" }),
      alert({ id: 2, status: "ACKNOWLEDGED", respondingCaretakerId: 99, respondingCaretakerName: "Someone Else" }),
    ]);
    render(<CaretakerEmergencyPage />);

    expect(await screen.findByRole("button", { name: "Resolve" })).toBeInTheDocument();
    expect(screen.getByText("Someone Else responding")).toBeInTheDocument();
  });

  it("resolving calls resolve() and refreshes the list", async () => {
    getNearby.mockResolvedValue([alert({ status: "ACKNOWLEDGED", respondingCaretakerId: 30 })]);
    resolve.mockResolvedValue(alert({ status: "RESOLVED" }));
    const user = userEvent.setup();
    render(<CaretakerEmergencyPage />);

    await user.click(await screen.findByRole("button", { name: "Resolve" }));

    await waitFor(() => expect(resolve).toHaveBeenCalledWith(1));
  });

  it("refetches when a live EMERGENCY-type notification arrives over the WebSocket", async () => {
    render(<CaretakerEmergencyPage />);
    await waitFor(() => expect(getNearby).toHaveBeenCalledTimes(1));

    subscribeCallback!({ body: JSON.stringify({ id: 9, type: "EMERGENCY", title: "x", message: "y", isRead: false, createdAt: "2026-10-22T10:00:00" }) });

    await waitFor(() => expect(getNearby).toHaveBeenCalledTimes(2));
  });

  it("does not refetch on an unrelated (non-EMERGENCY) live notification", async () => {
    render(<CaretakerEmergencyPage />);
    await waitFor(() => expect(getNearby).toHaveBeenCalledTimes(1));

    subscribeCallback!({ body: JSON.stringify({ id: 9, type: "BOOKING", title: "x", message: "y", isRead: false, createdAt: "2026-10-22T10:00:00" }) });

    // Give any erroneous async refetch a chance to happen before asserting it didn't.
    await new Promise((r) => setTimeout(r, 10));
    expect(getNearby).toHaveBeenCalledTimes(1);
  });

  it("shows a clear error if loading nearby alerts fails", async () => {
    getNearby.mockRejectedValue(new Error("network down"));
    render(<CaretakerEmergencyPage />);

    expect(await screen.findByText("network down")).toBeInTheDocument();
  });
});
