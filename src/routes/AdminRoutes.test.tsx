import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminRoutes from "./AdminRoutes";
import { useAuthenticatedUser } from "../contexts/AuthenticatedUserContext";
import { useSidebarNavItems } from "../hooks/useSidebarNavItems";
import { useMetaConfigService } from "../services/useMetaConfigService";
import { useAdminDashboardService } from "../services/useAdminDashboardService";
import { UserTypeEnum } from "../utils/enums";

vi.mock("../contexts/AuthenticatedUserContext", () => ({
  useAuthenticatedUser: vi.fn(),
}));
vi.mock("../hooks/useSidebarNavItems", () => ({
  useSidebarNavItems: vi.fn(),
}));
vi.mock("../services/useMetaConfigService", () => ({
  useMetaConfigService: vi.fn(),
}));
vi.mock("../services/useAdminDashboardService", () => ({
  useAdminDashboardService: vi.fn(),
}));

const mockedUseAuthenticatedUser = vi.mocked(useAuthenticatedUser);
const mockedUseSidebarNavItems = vi.mocked(useSidebarNavItems);
const mockedUseMetaConfigService = vi.mocked(useMetaConfigService);
const mockedUseAdminDashboardService = vi.mocked(useAdminDashboardService);

function mockUser(userType: (typeof UserTypeEnum)[keyof typeof UserTypeEnum]) {
  mockedUseAuthenticatedUser.mockReturnValue({
    user: { id: 1, email: "a@example.com", userType, primaryRole: userType, roles: [userType] },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshFromServer: vi.fn(),
  });
}

/**
 * Closes the automated-verification gap in Prompt 39 ("an ADMIN account cannot reach the
 * [platform-settings] page ... test both the UI redirect and a direct API call" - the direct
 * API call half is covered by the backend's own @PreAuthorize gate on MetaConfigController,
 * live-verified separately; this covers the FE redirect half, which had no test at all).
 */
describe("AdminRoutes — platform-settings gating", () => {
  beforeEach(() => {
    mockedUseSidebarNavItems.mockReturnValue({ navItems: [], isLoading: false, error: null });
    mockedUseMetaConfigService.mockReturnValue({
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn(),
      upsert: vi.fn(),
      remove: vi.fn(),
    });
    mockedUseAdminDashboardService.mockReturnValue({
      getStats: vi.fn().mockResolvedValue({
        activeUsersByRole: {},
        bookingsThisWeek: 0,
        openEmergencyAlerts: 0,
        overdueEmergencyAlerts: 0,
        pendingCaretakerVerifications: 0,
      }),
    });
  });

  function renderAt(initialPath: string) {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/admin/*" element={<AdminRoutes />} />
        </Routes>
      </MemoryRouter>
    );
  }

  it("lets a SUPER_ADMIN reach /admin/platform-settings", async () => {
    mockUser(UserTypeEnum.SUPER_ADMIN);
    renderAt("/admin/platform-settings");

    expect(await screen.findByText("Platform Settings")).toBeInTheDocument();
  });

  it("redirects a plain ADMIN away from /admin/platform-settings to the dashboard", async () => {
    mockUser(UserTypeEnum.ADMIN);
    renderAt("/admin/platform-settings");

    expect(await screen.findByText("Platform Overview")).toBeInTheDocument();
    expect(screen.queryByText("Platform Settings")).not.toBeInTheDocument();
  });
});
