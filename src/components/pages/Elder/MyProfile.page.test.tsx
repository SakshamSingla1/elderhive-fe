import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ElderMyProfilePage from "./MyProfile.page";
import { useElderProfileService } from "../../../services/useElderProfileService";

vi.mock("../../../services/useElderProfileService", () => ({
  useElderProfileService: vi.fn(),
}));

const mockedUseElderProfileService = vi.mocked(useElderProfileService);

describe("Elder MyProfile.page", () => {
  let getMyProfile: ReturnType<typeof vi.fn>;
  let create: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getMyProfile = vi.fn();
    create = vi.fn();
    update = vi.fn();
    mockedUseElderProfileService.mockReturnValue(
      { getMyProfile, create, update } as unknown as ReturnType<typeof useElderProfileService>
    );
  });

  it("shows an empty create form when the caller has no profile yet (404)", async () => {
    getMyProfile.mockRejectedValue({ response: { status: 404 } });
    render(<ElderMyProfilePage />);

    expect(await screen.findByRole("button", { name: "Create Profile" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/)).toHaveValue("");
  });

  it("pre-fills the form from an existing profile and submits an update", async () => {
    getMyProfile.mockResolvedValue({
      id: 7, fullName: "Grandma Rose", dateOfBirth: "1945-03-12", gender: "FEMALE",
      medicalConditions: "", address: "", emergencyContactName: "", emergencyContactPhone: "",
    });
    update.mockResolvedValue({});
    const user = userEvent.setup();

    render(<ElderMyProfilePage />);

    const nameField = await screen.findByLabelText(/Full Name/);
    expect(nameField).toHaveValue("Grandma Rose");
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();

    await user.clear(nameField);
    await user.type(nameField, "Grandma Rosalind");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith(7, expect.objectContaining({ fullName: "Grandma Rosalind" })));
  });

  it("creating a profile for the first time calls create(), not update()", async () => {
    getMyProfile.mockRejectedValue({ response: { status: 404 } });
    create.mockResolvedValue({ id: 99 });
    const user = userEvent.setup();

    render(<ElderMyProfilePage />);
    await user.type(await screen.findByLabelText(/Full Name/), "New Elder");
    await user.click(screen.getByRole("button", { name: "Create Profile" }));

    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ fullName: "New Elder" })));
    expect(update).not.toHaveBeenCalled();
  });
});
