import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RolesPermissionsPage from "./RolesPermissions.page";
import { useRoleService } from "../../../services/useRoleService";
import type { RoleResponse } from "../../../services/useRoleService";
import { usePermissionService } from "../../../services/usePermissionService";
import type { PermissionResponse } from "../../../services/usePermissionService";
import { RoleStatusEnum } from "../../../utils/enums";

vi.mock("../../../services/useRoleService", () => ({
  useRoleService: vi.fn(),
}));
vi.mock("../../../services/usePermissionService", () => ({
  usePermissionService: vi.fn(),
}));

const mockedUseRoleService = vi.mocked(useRoleService);
const mockedUsePermissionService = vi.mocked(usePermissionService);

function role(overrides: Partial<RoleResponse> = {}): RoleResponse {
  return {
    id: 1,
    name: "Support",
    description: "Front-line support staff",
    status: RoleStatusEnum.ACTIVE,
    permissionCodes: ["USER_MANAGE"],
    ...overrides,
  };
}

function permission(overrides: Partial<PermissionResponse> = {}): PermissionResponse {
  return { id: 1, code: "USER_MANAGE", description: "View users, assign roles, enable/disable accounts", ...overrides };
}

function pageOf(content: RoleResponse[]) {
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
  };
}

describe("Admin RolesPermissions.page", () => {
  let getAll: ReturnType<typeof vi.fn>;
  let create: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let remove: ReturnType<typeof vi.fn>;
  let getAllPermissions: ReturnType<typeof vi.fn>;
  let assignToRole: ReturnType<typeof vi.fn>;
  let unassignFromRole: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getAll = vi.fn().mockResolvedValue(pageOf([role()]));
    create = vi.fn();
    update = vi.fn();
    remove = vi.fn();
    mockedUseRoleService.mockReturnValue({ getAll, getById: vi.fn(), create, update, remove } as unknown as ReturnType<
      typeof useRoleService
    >);

    getAllPermissions = vi.fn().mockResolvedValue([permission(), permission({ id: 2, code: "ROLE_MANAGE", description: "Manage roles" })]);
    assignToRole = vi.fn().mockResolvedValue("ok");
    unassignFromRole = vi.fn().mockResolvedValue("ok");
    mockedUsePermissionService.mockReturnValue({ getAll: getAllPermissions, assignToRole, unassignFromRole } as unknown as ReturnType<
      typeof usePermissionService
    >);
  });

  it("lists roles returned by the backend", async () => {
    render(<RolesPermissionsPage />);

    expect(await screen.findByText("Support")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // permission count
  });

  it("shows an empty state when there are no roles", async () => {
    getAll.mockResolvedValue(pageOf([]));
    render(<RolesPermissionsPage />);

    expect(await screen.findByText("No roles found")).toBeInTheDocument();
  });

  it("creates a role via the New Role dialog", async () => {
    create.mockResolvedValue(role({ id: 2, name: "Billing", permissionCodes: [] }));
    render(<RolesPermissionsPage />);

    await screen.findByText("Support");
    await userEvent.click(screen.getByRole("button", { name: "New Role" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Create Role")).toBeInTheDocument();

    await userEvent.type(within(dialog).getByLabelText(/^Name/), "Billing");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: "Billing" })));
    expect(await screen.findByText("Billing")).toBeInTheDocument();
  });

  it("edits a role via the Edit dialog", async () => {
    update.mockResolvedValue(role({ name: "Support Lead" }));
    render(<RolesPermissionsPage />);

    await screen.findByText("Support");
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Edit Role")).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Name/)).toHaveValue("Support");

    await userEvent.clear(within(dialog).getByLabelText(/^Name/));
    await userEvent.type(within(dialog).getByLabelText(/^Name/), "Support Lead");
    await userEvent.click(within(dialog).getByRole("button", { name: "Update" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith(1, expect.objectContaining({ name: "Support Lead" })));
    expect(await screen.findByText("Support Lead")).toBeInTheDocument();
  });

  it("deletes a role after confirming the dialog", async () => {
    render(<RolesPermissionsPage />);

    await screen.findByText("Support");
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    const confirmDialog = await screen.findByRole("dialog");
    expect(within(confirmDialog).getByText("Delete this role?")).toBeInTheDocument();
    await userEvent.click(within(confirmDialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.queryByText("Support")).not.toBeInTheDocument());
  });

  it("assigns and unassigns a permission from the Permissions dialog", async () => {
    render(<RolesPermissionsPage />);

    await screen.findByText("Support");
    await userEvent.click(screen.getByRole("button", { name: "Permissions" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Permissions — Support")).toBeInTheDocument();

    const userManageCheckbox = within(dialog).getByRole("checkbox", { name: /USER_MANAGE/ });
    const roleManageCheckbox = within(dialog).getByRole("checkbox", { name: /ROLE_MANAGE/ });
    expect(userManageCheckbox).toBeChecked();
    expect(roleManageCheckbox).not.toBeChecked();

    await userEvent.click(roleManageCheckbox);
    await waitFor(() => expect(assignToRole).toHaveBeenCalledWith(1, 2));

    await userEvent.click(userManageCheckbox);
    await waitFor(() => expect(unassignFromRole).toHaveBeenCalledWith(1, 1));
  });
});
