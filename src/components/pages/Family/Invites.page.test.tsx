import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FamilyInvitesPage from "./Invites.page";
import { useInviteService } from "../../../services/useInviteService";
import { LinkInviteStatusEnum, UserTypeEnum } from "../../../utils/enums";

vi.mock("../../../services/useInviteService", () => ({
  useInviteService: vi.fn(),
}));

const mockedUseInviteService = vi.mocked(useInviteService);

describe("Family Invites.page", () => {
  let accept: ReturnType<typeof vi.fn>;
  let decline: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    accept = vi.fn();
    decline = vi.fn();
    mockedUseInviteService.mockReturnValue({ accept, decline } as unknown as ReturnType<typeof useInviteService>);
  });

  it("accepting calls inviteService.accept with the entered token and shows the result", async () => {
    accept.mockResolvedValue({
      id: 1, elderProfileId: 5, invitedEmail: "me@example.com", invitedPhone: null,
      invitedRole: UserTypeEnum.FAMILY_MEMBER, relationshipLabel: "Daughter", status: LinkInviteStatusEnum.ACCEPTED, token: "abc-123",
    });
    const user = userEvent.setup();
    render(<FamilyInvitesPage />);

    await user.type(screen.getByLabelText("Invite Token"), "abc-123");
    await user.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => expect(accept).toHaveBeenCalledWith("abc-123"));
    expect(await screen.findByText("Handled this session")).toBeInTheDocument();
    expect(screen.getByText("As Daughter")).toBeInTheDocument();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
  });

  it("shows an error message when the backend rejects the token", async () => {
    decline.mockRejectedValue({ response: { data: { message: "Invite not found" } } });
    const user = userEvent.setup();
    render(<FamilyInvitesPage />);

    await user.type(screen.getByLabelText("Invite Token"), "bad-token");
    await user.click(screen.getByRole("button", { name: "Decline" }));

    expect(await screen.findByText("Invite not found")).toBeInTheDocument();
  });
});
