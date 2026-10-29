import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminDashboardPage from "./Dashboard.page";
import { useAdminDashboardService } from "../../../services/useAdminDashboardService";
import type { AdminDashboardStatsResponse } from "../../../services/useAdminDashboardService";
import { useAuditLogService, type AuditLogResponse } from "../../../services/useAuditLogService";
import { useAuthenticatedUser } from "../../../contexts/AuthenticatedUserContext";
import { ActionType, EntityTypeEnum, UserTypeEnum } from "../../../utils/enums";

vi.mock("../../../services/useAdminDashboardService", () => ({
  useAdminDashboardService: vi.fn(),
}));
vi.mock("../../../services/useAuditLogService", () => ({
  useAuditLogService: vi.fn(),
}));
vi.mock("../../../contexts/AuthenticatedUserContext", () => ({
  useAuthenticatedUser: vi.fn(),
}));

const mockedUseAdminDashboardService = vi.mocked(useAdminDashboardService);
const mockedUseAuditLogService = vi.mocked(useAuditLogService);
const mockedUseAuthenticatedUser = vi.mocked(useAuthenticatedUser);

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

function activityEntry(overrides: Partial<AuditLogResponse> = {}): AuditLogResponse {
  return {
    id: 1,
    entityType: EntityTypeEnum.USER,
    entityId: "42",
    actionType: ActionType.GRANT,
    actorUserId: 7,
    actorEmail: "admin@example.com",
    data: null,
    timestamp: "2026-10-28T10:00:00Z",
    ...overrides,
  };
}

function mockCaller(userType: UserTypeEnum) {
  mockedUseAuthenticatedUser.mockReturnValue({
    user: { id: 99, email: "caller@example.com", userType, primaryRole: userType, roles: [userType] },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshFromServer: vi.fn(),
  });
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
  let search: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getStats = vi.fn().mockResolvedValue(stats());
    search = vi.fn().mockResolvedValue({ content: [activityEntry()], totalElements: 1, totalPages: 1, number: 0, size: 5, first: true, last: true, numberOfElements: 1, empty: false });
    mockedUseAdminDashboardService.mockReturnValue({ getStats } as unknown as ReturnType<typeof useAdminDashboardService>);
    mockedUseAuditLogService.mockReturnValue({ search } as unknown as ReturnType<typeof useAuditLogService>);
    mockCaller(UserTypeEnum.ADMIN);
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

    expect(await screen.findByText("Super Admin")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Elder")).toBeInTheDocument();
    expect(screen.getByText("Caretaker")).toBeInTheDocument();
    expect(screen.getByText("Family Member")).toBeInTheDocument();
  });

  it("shows an error alert when the stats call fails", async () => {
    getStats.mockRejectedValue(new Error("network down"));
    renderPage();

    await waitFor(() => expect(screen.getByText("network down")).toBeInTheDocument());
  });

  it("hides Platform Control and Recent Activity, and never calls the audit log, for a plain ADMIN", async () => {
    renderPage();

    await screen.findByText("12");
    expect(screen.queryByText("Platform Control")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent Activity")).not.toBeInTheDocument();
    expect(search).not.toHaveBeenCalled();
  });

  it("shows Platform Control links and Recent Activity for a SUPER_ADMIN", async () => {
    mockCaller(UserTypeEnum.SUPER_ADMIN);
    renderPage();

    expect(await screen.findByText("Platform Control")).toBeInTheDocument();
    expect(screen.getByText("Platform Settings")).toBeInTheDocument();
    expect(screen.getByText("Roles & Permissions")).toBeInTheDocument();
    expect(screen.getByText("Audit Log")).toBeInTheDocument();
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    expect(screen.getByText(/admin@example\.com/)).toBeInTheDocument();
    expect(search).toHaveBeenCalledWith({ page: 0, size: 5, sort: "timestamp,desc" });
  });

  it("shows an empty state for Recent Activity when there's nothing logged yet", async () => {
    mockCaller(UserTypeEnum.SUPER_ADMIN);
    search.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 5, first: true, last: true, numberOfElements: 0, empty: true });
    renderPage();

    expect(await screen.findByText("No activity recorded yet.")).toBeInTheDocument();
  });
});
