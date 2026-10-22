import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEmergencyAlertService } from "../../../services/useEmergencyAlertService";
import type { EmergencyAlertResponse } from "../../../services/useEmergencyAlertService";
import { useWebSocket } from "../../../contexts/WebSocketContext";
import EmergencyAlertsPage from "./EmergencyAlerts.page";

vi.mock("../../../services/useEmergencyAlertService", () => ({
  useEmergencyAlertService: vi.fn(),
}));
vi.mock("../../../contexts/WebSocketContext", () => ({
  useWebSocket: vi.fn(),
}));

const mockedUseEmergencyAlertService = vi.mocked(useEmergencyAlertService);
const mockedUseWebSocket = vi.mocked(useWebSocket);

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
    distanceKm: null,
    createdAt: "2026-10-22T10:00:00",
    ...overrides,
  };
}

function pageOf(content: EmergencyAlertResponse[]) {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    number: 0,
    size: 10,
    first: true,
    last: true,
    numberOfElements: content.length,
    empty: content.length === 0,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/emergency-alerts"]}>
      <Routes>
        <Route path="/admin/emergency-alerts" element={<EmergencyAlertsPage />} />
        <Route path="/admin/emergency-alerts/:id" element={<div>alert form page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Admin EmergencyAlerts.page", () => {
  let getAll: ReturnType<typeof vi.fn>;
  let subscribeCallback: (() => void) | null;

  beforeEach(() => {
    getAll = vi.fn().mockResolvedValue(pageOf([alert()]));
    mockedUseEmergencyAlertService.mockReturnValue(
      { getAll } as unknown as ReturnType<typeof useEmergencyAlertService>
    );
    subscribeCallback = null;
    mockedUseWebSocket.mockReturnValue({
      connected: true,
      subscribe: vi.fn((_, cb) => {
        subscribeCallback = cb;
        return () => {};
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists every alert with elder, address, status, response time, and overdue flag", async () => {
    getAll.mockResolvedValue(pageOf([alert({ responseTimeSeconds: 90, isOverdue: true, respondingCaretakerName: "Jane" })]));
    renderPage();

    expect(await screen.findByText("Robert")).toBeInTheDocument();
    expect(screen.getByText("MG Road, Bengaluru")).toBeInTheDocument();
    expect(screen.getByText("Jane")).toBeInTheDocument();
    expect(screen.getByText("90s")).toBeInTheDocument();
    expect(screen.getByText("Overdue")).toBeInTheDocument();
  });

  it("shows an error alert when the initial load fails", async () => {
    getAll.mockRejectedValue(new Error("network down"));
    renderPage();

    expect(await screen.findByText("network down")).toBeInTheDocument();
  });

  it("navigates to the alert's override form when a row is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText("Robert"));
    expect(await screen.findByText("alert form page")).toBeInTheDocument();
  });

  it("filters by status, resetting to page 0", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Robert");
    getAll.mockClear();
    await user.click(screen.getByLabelText("Status"));
    await user.click(await screen.findByRole("option", { name: "ACKNOWLEDGED" }));

    await waitFor(() => expect(getAll).toHaveBeenCalledWith(expect.objectContaining({ status: "ACKNOWLEDGED", page: 0 })));
  });

  it("shows the empty state when there are no alerts", async () => {
    getAll.mockResolvedValue(pageOf([]));
    renderPage();

    expect(await screen.findByText("No emergency alerts found")).toBeInTheDocument();
  });

  it("refetches when the live emergency-alerts broadcast fires", async () => {
    renderPage();
    await waitFor(() => expect(getAll).toHaveBeenCalledTimes(1));

    subscribeCallback!();

    await waitFor(() => expect(getAll).toHaveBeenCalledTimes(2));
  });
});
