import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminUsersPage from "./Users.page";
import { useAdminUserService } from "../../../services/useAdminUserService";
import type { AdminUserResponse } from "../../../services/useAdminUserService";
import { useRoleService } from "../../../services/useRoleService";
import { useAuthenticatedUser } from "../../../contexts/AuthenticatedUserContext";
import { UserStatusEnum, UserTypeEnum } from "../../../utils/enums";

vi.mock("../../../services/useAdminUserService", () => ({
  useAdminUserService: vi.fn(),
}));
vi.mock("../../../services/useRoleService", () => ({
  useRoleService: vi.fn(),
}));
vi.mock("../../../contexts/AuthenticatedUserContext", () => ({
  useAuthenticatedUser: vi.fn(),
}));

const mockedUseAdminUserService = vi.mocked(useAdminUserService);
const mockedUseRoleService = vi.mocked(useRoleService);
const mockedUseAuthenticatedUser = vi.mocked(useAuthenticatedUser);

function adminUser(overrides: Partial<AdminUserResponse> = {}): AdminUserResponse {
  return {
    id: 1,
    email: "jane@example.com",
    fullName: "Jane Doe",
    phone: null,
    primaryRole: UserTypeEnum.FAMILY_MEMBER,
    status: UserStatusEnum.ACTIVE,
    roles: [UserTypeEnum.FAMILY_MEMBER],
    roleId: null,
    createdAt: "2026-10-23T10:00:00",
    ...overrides,
  };
}

function pageOf(content: AdminUserResponse[], overrides: Record<string, unknown> = {}) {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    number: 0,
    size: 20,
    first: true,
    last: true,
    numberOfElements: content.length,
    empty: content.length === 0,
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

describe("Admin Users.page", () => {
  let getAll: ReturnType<typeof vi.fn>;
  let suspend: ReturnType<typeof vi.fn>;
  let grantRole: ReturnType<typeof vi.fn>;
  let revokeRole: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getAll = vi.fn().mockResolvedValue(pageOf([adminUser()]));
    suspend = vi.fn();
    grantRole = vi.fn();
    revokeRole = vi.fn();
    mockedUseAdminUserService.mockReturnValue({
      getAll,
      getById: vi.fn(),
      suspend,
      grantRole,
      revokeRole,
      assignFineGrainedRole: vi.fn(),
    } as unknown as ReturnType<typeof useAdminUserService>);
    mockedUseRoleService.mockReturnValue({
      getAll: vi.fn().mockResolvedValue(pageOf([])),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    } as unknown as ReturnType<typeof useRoleService>);
    mockCaller(UserTypeEnum.ADMIN);
  });

  it("lists users returned by the backend", async () => {
    render(<AdminUsersPage />);

    expect(await screen.findByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("shows an empty state when there are no users", async () => {
    getAll.mockResolvedValue(pageOf([]));
    render(<AdminUsersPage />);

    expect(await screen.findByText("No users found")).toBeInTheDocument();
  });

  it("suspends a user after confirming the dialog", async () => {
    const user = adminUser();
    getAll.mockResolvedValue(pageOf([user]));
    suspend.mockResolvedValue({ ...user, status: UserStatusEnum.SUSPENDED });
    render(<AdminUsersPage />);

    await screen.findByText("jane@example.com");
    await userEvent.click(screen.getByRole("button", { name: /suspend/i }));
    const confirmDialog = await screen.findByRole("dialog");
    expect(within(confirmDialog).getByText("Suspend this user?")).toBeInTheDocument();
    await userEvent.click(within(confirmDialog).getByRole("button", { name: "Suspend" }));

    await waitFor(() => expect(suspend).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.getByText("Suspended")).toBeInTheDocument());
  });

  it("opens the roles dialog for the clicked row and restricts ADMIN/SUPER_ADMIN grants for a plain admin caller", async () => {
    mockCaller(UserTypeEnum.ADMIN);
    render(<AdminUsersPage />);

    await screen.findByText("jane@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Roles" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Manage roles")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByLabelText("Role"));
    expect(screen.queryByRole("option", { name: "ADMIN" })).not.toBeInTheDocument();
  });

  it("allows granting ADMIN when the caller is SUPER_ADMIN, and reflects it in the table row", async () => {
    mockCaller(UserTypeEnum.SUPER_ADMIN);
    const user = adminUser();
    getAll.mockResolvedValue(pageOf([user]));
    grantRole.mockResolvedValue({ ...user, roles: [UserTypeEnum.FAMILY_MEMBER, UserTypeEnum.ADMIN] });
    render(<AdminUsersPage />);

    await screen.findByText("jane@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Roles" }));
    const dialog = await screen.findByRole("dialog");
    within(dialog).getByText("Manage roles");

    await userEvent.click(within(dialog).getByLabelText("Role"));
    await userEvent.click(screen.getByRole("option", { name: "Admin" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Grant" }));

    await waitFor(() => expect(grantRole).toHaveBeenCalledWith(1, UserTypeEnum.ADMIN));
  });

  it("re-fetches with the search term after the debounce window", async () => {
    render(<AdminUsersPage />);
    await screen.findByText("jane@example.com");
    getAll.mockClear();

    await userEvent.type(screen.getByLabelText("Search"), "zyx");

    await waitFor(() => expect(getAll).toHaveBeenCalledWith(expect.objectContaining({ search: "zyx" })), { timeout: 2000 });
  });
});
