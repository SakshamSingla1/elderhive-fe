import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ManageUserRolesDialog from "./ManageUserRolesDialog";
import type { ManageUserRolesTarget } from "./ManageUserRolesDialog";
import { UserTypeEnum } from "../../../utils/enums";

function target(overrides: Partial<ManageUserRolesTarget> = {}): ManageUserRolesTarget {
  return {
    id: 1,
    fullName: "Jane Doe",
    email: "jane@example.com",
    roles: [UserTypeEnum.FAMILY_MEMBER],
    primaryRole: UserTypeEnum.FAMILY_MEMBER,
    ...overrides,
  };
}

describe("ManageUserRolesDialog", () => {
  it("does not offer ADMIN/SUPER_ADMIN as grantable roles to a plain-admin caller", async () => {
    render(
      <ManageUserRolesDialog
        open
        target={target()}
        callerIsSuperAdmin={false}
        onClose={vi.fn()}
        onGrant={vi.fn()}
        onRevoke={vi.fn()}
      />
    );

    await userEvent.click(screen.getByLabelText("Role"));
    expect(screen.queryByRole("option", { name: "ADMIN" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "SUPER_ADMIN" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "CARETAKER" })).toBeInTheDocument();
  });

  it("offers ADMIN/SUPER_ADMIN as grantable roles to a super-admin caller", async () => {
    render(
      <ManageUserRolesDialog open target={target()} callerIsSuperAdmin onClose={vi.fn()} onGrant={vi.fn()} onRevoke={vi.fn()} />
    );

    await userEvent.click(screen.getByLabelText("Role"));
    expect(screen.getByRole("option", { name: "ADMIN" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "SUPER_ADMIN" })).toBeInTheDocument();
  });

  it("grants the selected role and reflects the returned roles/primary", async () => {
    const onGrant = vi.fn().mockResolvedValue({ roles: [UserTypeEnum.FAMILY_MEMBER, UserTypeEnum.CARETAKER], primaryRole: UserTypeEnum.FAMILY_MEMBER });
    render(
      <ManageUserRolesDialog open target={target()} callerIsSuperAdmin={false} onClose={vi.fn()} onGrant={onGrant} onRevoke={vi.fn()} />
    );

    await userEvent.click(screen.getByLabelText("Role"));
    await userEvent.click(screen.getByRole("option", { name: "CARETAKER" }));
    await userEvent.click(screen.getByRole("button", { name: "Grant" }));

    expect(onGrant).toHaveBeenCalledWith(UserTypeEnum.CARETAKER);
    await waitFor(() => expect(screen.getByText("CARETAKER")).toBeInTheDocument());
  });

  it("does not offer a remove action on the primary role chip", () => {
    render(
      <ManageUserRolesDialog
        open
        target={target({ roles: [UserTypeEnum.FAMILY_MEMBER, UserTypeEnum.CARETAKER] })}
        callerIsSuperAdmin
        onClose={vi.fn()}
        onGrant={vi.fn()}
        onRevoke={vi.fn()}
      />
    );

    // The primary role's chip has no delete icon; the non-primary CARETAKER chip does.
    const primaryChip = screen.getByText("FAMILY_MEMBER · primary").closest(".MuiChip-root");
    const otherChip = screen.getByText("CARETAKER").closest(".MuiChip-root");
    expect(primaryChip?.querySelector(".MuiChip-deleteIcon")).not.toBeInTheDocument();
    expect(otherChip?.querySelector(".MuiChip-deleteIcon")).toBeInTheDocument();
  });

  it("revokes a non-primary role on chip delete", async () => {
    const onRevoke = vi.fn().mockResolvedValue({ roles: [UserTypeEnum.FAMILY_MEMBER], primaryRole: UserTypeEnum.FAMILY_MEMBER });
    render(
      <ManageUserRolesDialog
        open
        target={target({ roles: [UserTypeEnum.FAMILY_MEMBER, UserTypeEnum.CARETAKER] })}
        callerIsSuperAdmin
        onClose={vi.fn()}
        onGrant={vi.fn()}
        onRevoke={onRevoke}
      />
    );

    const otherChip = screen.getByText("CARETAKER").closest(".MuiChip-root");
    const deleteIcon = otherChip?.querySelector(".MuiChip-deleteIcon");
    expect(deleteIcon).toBeInTheDocument();
    await userEvent.click(deleteIcon as Element);

    expect(onRevoke).toHaveBeenCalledWith(UserTypeEnum.CARETAKER);
    await waitFor(() => expect(screen.queryByText("CARETAKER")).not.toBeInTheDocument());
  });

  it("surfaces the backend's error message when a grant fails", async () => {
    const onGrant = vi.fn().mockRejectedValue({ response: { data: { message: "User already holds the CARETAKER role" } } });
    render(
      <ManageUserRolesDialog open target={target()} callerIsSuperAdmin={false} onClose={vi.fn()} onGrant={onGrant} onRevoke={vi.fn()} />
    );

    await userEvent.click(screen.getByLabelText("Role"));
    await userEvent.click(screen.getByRole("option", { name: "CARETAKER" }));
    await userEvent.click(screen.getByRole("button", { name: "Grant" }));

    expect(await screen.findByText("User already holds the CARETAKER role")).toBeInTheDocument();
  });
});
