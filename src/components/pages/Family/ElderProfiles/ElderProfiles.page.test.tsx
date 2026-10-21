import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ElderProfilesPage from "./ElderProfiles.page";
import { useElderProfileService } from "../../../../services/useElderProfileService";

vi.mock("../../../../services/useElderProfileService", () => ({
  useElderProfileService: vi.fn(),
}));

const mockedUseElderProfileService = vi.mocked(useElderProfileService);

const SAMPLE_PAGE = {
  content: [
    { id: 1, familyUserId: 10, elderUserId: null, fullName: "Grandma Rose", dateOfBirth: "1945-03-12", gender: "FEMALE" },
    { id: 2, familyUserId: 10, elderUserId: 20, fullName: "Grandpa Joe", dateOfBirth: null, gender: null },
  ],
  totalElements: 2, totalPages: 1, number: 0, size: 100, first: true, last: true, numberOfElements: 2, empty: false,
};

describe("Family ElderProfiles.page", () => {
  let getMine: ReturnType<typeof vi.fn>;
  let remove: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getMine = vi.fn().mockResolvedValue(SAMPLE_PAGE);
    remove = vi.fn().mockResolvedValue("Deleted");
    mockedUseElderProfileService.mockReturnValue({ getMine, remove } as unknown as ReturnType<typeof useElderProfileService>);
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("lists every elder profile with its linked-account status", async () => {
    render(
      <MemoryRouter>
        <ElderProfilesPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Grandma Rose")).toBeInTheDocument();
    expect(screen.getByText("Grandpa Joe")).toBeInTheDocument();
    expect(screen.getByText("Not linked")).toBeInTheDocument();
    expect(screen.getByText("Linked")).toBeInTheDocument();
  });

  it("shows an empty state when there are no profiles", async () => {
    getMine.mockResolvedValue({ ...SAMPLE_PAGE, content: [] });
    render(
      <MemoryRouter>
        <ElderProfilesPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("No elder profiles yet")).toBeInTheDocument();
  });

  it("removing a profile asks for confirmation then calls remove()", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ElderProfilesPage />
      </MemoryRouter>
    );
    await screen.findByText("Grandma Rose");

    const removeButtons = screen.getAllByLabelText("Remove");
    await user.click(removeButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(remove).toHaveBeenCalledWith(1));
  });
});
