import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FamilyMembersPanel from "./FamilyMembersPanel";
import { useElderProfileService } from "../../../../services/useElderProfileService";
import { useInviteService } from "../../../../services/useInviteService";
import { useAuthenticatedUser } from "../../../../contexts/AuthenticatedUserContext";
import { UserTypeEnum, LinkInviteStatusEnum } from "../../../../utils/enums";

vi.mock("../../../../services/useElderProfileService", () => ({
  useElderProfileService: vi.fn(),
}));
vi.mock("../../../../services/useInviteService", () => ({
  useInviteService: vi.fn(),
}));
vi.mock("../../../../contexts/AuthenticatedUserContext", () => ({
  useAuthenticatedUser: vi.fn(),
}));

const mockedUseElderProfileService = vi.mocked(useElderProfileService);
const mockedUseInviteService = vi.mocked(useInviteService);
const mockedUseAuthenticatedUser = vi.mocked(useAuthenticatedUser);

describe("FamilyMembersPanel", () => {
  let listFamilyMembers: ReturnType<typeof vi.fn>;
  let removeFamilyMember: ReturnType<typeof vi.fn>;
  let listForProfile: ReturnType<typeof vi.fn>;
  let createInvite: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    listFamilyMembers = vi.fn().mockResolvedValue([
      { userId: 10, fullName: "Owner User", relationshipLabel: null, isOwner: true },
      { userId: 20, fullName: "Co Manager", relationshipLabel: "Son", isOwner: false },
    ]);
    removeFamilyMember = vi.fn().mockResolvedValue("Removed");
    listForProfile = vi.fn().mockResolvedValue([]);
    createInvite = vi.fn().mockResolvedValue({});
    mockedUseElderProfileService.mockReturnValue(
      { listFamilyMembers, removeFamilyMember } as unknown as ReturnType<typeof useElderProfileService>
    );
    mockedUseInviteService.mockReturnValue({ listForProfile, createInvite } as unknown as ReturnType<typeof useInviteService>);
  });

  it("the owner sees every member and can invite a new one by email", async () => {
    mockedUseAuthenticatedUser.mockReturnValue({ user: { id: 10 } } as ReturnType<typeof useAuthenticatedUser>);
    const user = userEvent.setup();
    render(<FamilyMembersPanel elderProfileId={5} />);

    expect(await screen.findByText("Owner User")).toBeInTheDocument();
    expect(screen.getByText("Co Manager")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email address"), "new@example.com");
    await user.click(screen.getByRole("button", { name: "Send Invite" }));

    await waitFor(() =>
      expect(createInvite).toHaveBeenCalledWith(5, expect.objectContaining({ invitedEmail: "new@example.com", invitedRole: UserTypeEnum.FAMILY_MEMBER }))
    );
  });

  it("a non-owner co-manager cannot see the invite form or a Remove action", async () => {
    mockedUseAuthenticatedUser.mockReturnValue({ user: { id: 20 } } as ReturnType<typeof useAuthenticatedUser>);
    render(<FamilyMembersPanel elderProfileId={5} />);

    await screen.findByText("Owner User");
    expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });

  it("the owner can remove a non-owner member", async () => {
    mockedUseAuthenticatedUser.mockReturnValue({ user: { id: 10 } } as ReturnType<typeof useAuthenticatedUser>);
    const user = userEvent.setup();
    render(<FamilyMembersPanel elderProfileId={5} />);

    await screen.findByText("Co Manager");
    await user.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(removeFamilyMember).toHaveBeenCalledWith(5, 20));
  });

  it("shows pending invites for FAMILY_MEMBER role, filtering out ELDER-role ones", async () => {
    listForProfile.mockResolvedValue([
      { id: 1, elderProfileId: 5, invitedEmail: "pending@example.com", invitedPhone: null, invitedRole: UserTypeEnum.FAMILY_MEMBER, relationshipLabel: "Daughter", status: LinkInviteStatusEnum.PENDING, token: "t1" },
      { id: 2, elderProfileId: 5, invitedEmail: "elder@example.com", invitedPhone: null, invitedRole: UserTypeEnum.ELDER, relationshipLabel: null, status: LinkInviteStatusEnum.PENDING, token: "t2" },
    ]);
    mockedUseAuthenticatedUser.mockReturnValue({ user: { id: 10 } } as ReturnType<typeof useAuthenticatedUser>);

    render(<FamilyMembersPanel elderProfileId={5} />);

    expect(await screen.findByText("pending@example.com")).toBeInTheDocument();
    expect(screen.queryByText("elder@example.com")).not.toBeInTheDocument();
  });
});
