import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ElderInvitesPage from "./Invites.page";
import { useInviteService } from "../../../services/useInviteService";
import { LinkInviteStatusEnum, UserTypeEnum } from "../../../utils/enums";

vi.mock("../../../services/useInviteService", () => ({
  useInviteService: vi.fn(),
}));

const mockedUseInviteService = vi.mocked(useInviteService);

describe("Elder Invites.page", () => {
  let accept: ReturnType<typeof vi.fn>;
  let decline: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    accept = vi.fn();
    decline = vi.fn();
    mockedUseInviteService.mockReturnValue({ accept, decline } as unknown as ReturnType<typeof useInviteService>);
  });

  it("both buttons are disabled until a token is entered", () => {
    render(<ElderInvitesPage />);

    expect(screen.getByRole("button", { name: "Accept" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Decline" })).toBeDisabled();
  });

  it("accepting calls inviteService.accept with the entered token and shows the result", async () => {
    accept.mockResolvedValue({
      id: 1, elderProfileId: 5, invitedEmail: "me@example.com", invitedPhone: null,
      invitedRole: UserTypeEnum.ELDER, relationshipLabel: null, status: LinkInviteStatusEnum.ACCEPTED, token: "abc-123",
    });
    const user = userEvent.setup();
    render(<ElderInvitesPage />);

    await user.type(screen.getByLabelText("Invite Token"), "abc-123");
    await user.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => expect(accept).toHaveBeenCalledWith("abc-123"));
    expect(await screen.findByText(/Invite accepted/)).toBeInTheDocument();
  });

  it("declining calls inviteService.decline with the entered token", async () => {
    decline.mockResolvedValue({
      id: 1, elderProfileId: 5, invitedEmail: "me@example.com", invitedPhone: null,
      invitedRole: UserTypeEnum.ELDER, relationshipLabel: null, status: LinkInviteStatusEnum.DECLINED, token: "abc-123",
    });
    const user = userEvent.setup();
    render(<ElderInvitesPage />);

    await user.type(screen.getByLabelText("Invite Token"), "abc-123");
    await user.click(screen.getByRole("button", { name: "Decline" }));

    await waitFor(() => expect(decline).toHaveBeenCalledWith("abc-123"));
    expect(await screen.findByText(/Invite declined/)).toBeInTheDocument();
  });

  it("shows an error message when the backend rejects the token", async () => {
    accept.mockRejectedValue({ response: { data: { message: "Invite not found" } } });
    const user = userEvent.setup();
    render(<ElderInvitesPage />);

    await user.type(screen.getByLabelText("Invite Token"), "bad-token");
    await user.click(screen.getByRole("button", { name: "Accept" }));

    expect(await screen.findByText("Invite not found")).toBeInTheDocument();
  });
});
