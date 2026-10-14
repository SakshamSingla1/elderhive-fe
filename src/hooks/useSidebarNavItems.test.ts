import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNavLinkService } from "../services/useNavLinkService";
import { NavLinkStatusEnum } from "../utils/enums";
import { useSidebarNavItems } from "./useSidebarNavItems";

vi.mock("../services/useNavLinkService", () => ({
  useNavLinkService: vi.fn(),
}));

const mockedUseNavLinkService = vi.mocked(useNavLinkService);

describe("useSidebarNavItems", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches /nav-links/me once and maps it to SidebarNavItem[]", async () => {
    const getMine = vi.fn().mockResolvedValue([
      {
        id: 1,
        navGroup: "Platform",
        navIndex: 2,
        name: "Manage Users",
        path: "/admin/users",
        icon: "users",
        requiredPermission: "USER_MANAGE",
        superAdminOnly: false,
        status: NavLinkStatusEnum.ACTIVE,
      },
    ]);
    mockedUseNavLinkService.mockReturnValue({ getMine, create: vi.fn(), update: vi.fn(), getById: vi.fn(), list: vi.fn(), remove: vi.fn() });

    const { result } = renderHook(() => useSidebarNavItems());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getMine).toHaveBeenCalledTimes(1);
    expect(result.current.navItems).toEqual([
      expect.objectContaining({ label: "Manage Users", path: "/admin/users", group: "Platform", navIndex: 2 }),
    ]);
    expect(result.current.error).toBeNull();
  });

  it("filters out non-ACTIVE rows defensively, even though the backend already should have", async () => {
    const getMine = vi.fn().mockResolvedValue([
      { id: 1, navGroup: null, navIndex: 0, name: "Active One", path: "/admin/a", icon: null, requiredPermission: null, superAdminOnly: false, status: NavLinkStatusEnum.ACTIVE },
      { id: 2, navGroup: null, navIndex: 1, name: "Inactive One", path: "/admin/b", icon: null, requiredPermission: null, superAdminOnly: false, status: NavLinkStatusEnum.INACTIVE },
    ]);
    mockedUseNavLinkService.mockReturnValue({ getMine, create: vi.fn(), update: vi.fn(), getById: vi.fn(), list: vi.fn(), remove: vi.fn() });

    const { result } = renderHook(() => useSidebarNavItems());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.navItems).toHaveLength(1);
    expect(result.current.navItems[0].label).toBe("Active One");
  });

  it("falls back to an empty list (not a crash) for ELDER/FAMILY_MEMBER/CARETAKER, whose getMine returns []", async () => {
    const getMine = vi.fn().mockResolvedValue([]);
    mockedUseNavLinkService.mockReturnValue({ getMine, create: vi.fn(), update: vi.fn(), getById: vi.fn(), list: vi.fn(), remove: vi.fn() });

    const { result } = renderHook(() => useSidebarNavItems());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.navItems).toEqual([]);
  });

  it("surfaces a failed fetch via the error field instead of throwing", async () => {
    const getMine = vi.fn().mockRejectedValue(new Error("network error"));
    mockedUseNavLinkService.mockReturnValue({ getMine, create: vi.fn(), update: vi.fn(), getById: vi.fn(), list: vi.fn(), remove: vi.fn() });

    const { result } = renderHook(() => useSidebarNavItems());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.navItems).toEqual([]);
  });
});
