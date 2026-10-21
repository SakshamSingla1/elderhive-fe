import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LinkElderProfilePage from "./LinkElderProfile.page";
import { useElderProfileService } from "../../../../services/useElderProfileService";
import { useInviteService } from "../../../../services/useInviteService";
import { UserTypeEnum } from "../../../../utils/enums";

vi.mock("../../../../services/useElderProfileService", () => ({
  useElderProfileService: vi.fn(),
}));
vi.mock("../../../../services/useInviteService", () => ({
  useInviteService: vi.fn(),
}));

const mockedUseElderProfileService = vi.mocked(useElderProfileService);
const mockedUseInviteService = vi.mocked(useInviteService);

describe("LinkElderProfile.page", () => {
  let create: ReturnType<typeof vi.fn>;
  let createInvite: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    create = vi.fn().mockResolvedValue({ id: 5 });
    createInvite = vi.fn().mockResolvedValue({});
    mockedUseElderProfileService.mockReturnValue({ create } as unknown as ReturnType<typeof useElderProfileService>);
    mockedUseInviteService.mockReturnValue({ createInvite } as unknown as ReturnType<typeof useInviteService>);
  });

  it("the submit button is disabled until a name and email are entered", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LinkElderProfilePage />
      </MemoryRouter>
    );

    const submit = screen.getByRole("button", { name: "Send Link Request" });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/Elder's Full Name/), "Grandma Rose");
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/Elder's Email Address/), "rose@example.com");
    expect(submit).toBeEnabled();
  });

  it("submitting creates a placeholder profile then sends an ELDER-role invite to that email", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LinkElderProfilePage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/Elder's Full Name/), "Grandma Rose");
    await user.type(screen.getByLabelText(/Elder's Email Address/), "rose@example.com");
    await user.type(screen.getByLabelText(/Relationship/), "Mother");
    await user.click(screen.getByRole("button", { name: "Send Link Request" }));

    await waitFor(() => expect(create).toHaveBeenCalledWith({ fullName: "Grandma Rose" }));
    await waitFor(() =>
      expect(createInvite).toHaveBeenCalledWith(5, { invitedEmail: "rose@example.com", invitedRole: UserTypeEnum.ELDER, relationshipLabel: "Mother" })
    );
  });

  it("shows an error message when sending the invite fails", async () => {
    createInvite.mockRejectedValue({ response: { data: { message: "Already invited" } } });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LinkElderProfilePage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/Elder's Full Name/), "Grandma Rose");
    await user.type(screen.getByLabelText(/Elder's Email Address/), "rose@example.com");
    await user.click(screen.getByRole("button", { name: "Send Link Request" }));

    expect(await screen.findByText("Already invited")).toBeInTheDocument();
  });
});
