import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminDashboardPage from "./Dashboard.page";
import { useAdminDashboardService } from "../../../services/useAdminDashboardService";
import type { AdminDashboardStatsResponse } from "../../../services/useAdminDashboardService";

vi.mock("../../../services/useAdminDashboardService", () => ({
  useAdminDashboardService: vi.fn(),
}));

const mockedUseAdminDashboardService = vi.mocked(useAdminDashboardService);

function stats(overrides: Partial<AdminDashboardStatsResponse> = {}): AdminDashboardStatsResponse {
  return {
    activeUsersByRole: { SUPER_ADMIN: 101, ADMIN: 102, ELDER: 110, CARETAKER: 105, FAMILY_MEMBER: 108 },
    bookingsThisWeek: 12,
    openEmergencyAlerts: 3,
    overdueEmergencyAlerts: 1,
    pendingCaretakerVerifications: 4,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminDashboardPage />
    </MemoryRouter>
  );
}

describe("Admin Dashboard.page", () => {
  let getStats: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getStats = vi.fn().mockResolvedValue(stats());
    mockedUseAdminDashboardService.mockReturnValue({ getStats } as unknown as ReturnType<typeof useAdminDashboardService>);
  });

  it("renders every scalar stat from the backend", async () => {
    renderPage();

    expect(await screen.findByText("12")).toBeInTheDocument(); // bookingsThisWeek
    expect(screen.getByText("3")).toBeInTheDocument(); // openEmergencyAlerts
    expect(screen.getByText("1")).toBeInTheDocument(); // overdueEmergencyAlerts
    expect(screen.getByText("4")).toBeInTheDocument(); // pendingCaretakerVerifications
  });

  it("renders a breakdown row for every role, zero included", async () => {
    getStats.mockResolvedValue(stats({ activeUsersByRole: { SUPER_ADMIN: 0, ADMIN: 0, ELDER: 0, CARETAKER: 0, FAMILY_MEMBER: 0 } }));
    renderPage();

    expect(await screen.findByText("SUPER_ADMIN")).toBeInTheDocument();
    expect(screen.getByText("ADMIN")).toBeInTheDocument();
    expect(screen.getByText("ELDER")).toBeInTheDocument();
    expect(screen.getByText("CARETAKER")).toBeInTheDocument();
    expect(screen.getByText("FAMILY_MEMBER")).toBeInTheDocument();
  });

  it("shows an error alert when the stats call fails", async () => {
    getStats.mockRejectedValue(new Error("network down"));
    renderPage();

    await waitFor(() => expect(screen.getByText("network down")).toBeInTheDocument());
  });
});
