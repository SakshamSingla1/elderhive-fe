import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ElderDashboardPage from "./Dashboard.page";
import { useElderProfileService, type ElderProfileResponseDTO, type FamilyMemberSummaryDTO } from "../../../services/useElderProfileService";

vi.mock("../../../services/useElderProfileService", () => ({
  useElderProfileService: vi.fn(),
}));

const mockedUseElderProfileService = vi.mocked(useElderProfileService);

function profile(overrides: Partial<ElderProfileResponseDTO> = {}): ElderProfileResponseDTO {
  return {
    id: 1,
    familyUserId: 10,
    elderUserId: 20,
    fullName: "Grandma Rosa",
    dateOfBirth: "1945-04-12",
    gender: null,
    medicalConditions: null,
    address: "221B Lotus Street",
    emergencyContactName: "Nina Family",
    emergencyContactPhone: "+15551112222",
    ...overrides,
  };
}

function familyMember(overrides: Partial<FamilyMemberSummaryDTO> = {}): FamilyMemberSummaryDTO {
  return { userId: 10, fullName: "Nina Family", relationshipLabel: "Daughter", isOwner: true, ...overrides };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ElderDashboardPage />
    </MemoryRouter>
  );
}

function notFoundError() {
  const err = new Error("Not found") as Error & { response: { status: number } };
  err.response = { status: 404 };
  return err;
}

describe("Elder Dashboard.page", () => {
  let getMyProfile: ReturnType<typeof vi.fn>;
  let listFamilyMembers: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getMyProfile = vi.fn().mockResolvedValue(profile());
    listFamilyMembers = vi.fn().mockResolvedValue([familyMember()]);
    mockedUseElderProfileService.mockReturnValue({
      getMyProfile,
      listFamilyMembers,
    } as unknown as ReturnType<typeof useElderProfileService>);
  });

  it("shows the profile summary and care circle once both load", async () => {
    renderPage();

    expect(await screen.findByText("Grandma Rosa")).toBeInTheDocument();
    expect(screen.getByText("221B Lotus Street")).toBeInTheDocument();
    expect(screen.getByText("Nina Family")).toBeInTheDocument();
    expect(screen.getByText("Daughter")).toBeInTheDocument();
  });

  it("shows a first-run prompt rather than an error when no profile exists yet (404)", async () => {
    getMyProfile.mockRejectedValue(notFoundError());
    renderPage();

    expect(await screen.findByText(/haven't set up your profile yet/)).toBeInTheDocument();
    expect(screen.queryByText("Could not load your dashboard")).not.toBeInTheDocument();
  });

  it("shows an empty-state prompt when no family members are linked", async () => {
    listFamilyMembers.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText("No family members linked yet.")).toBeInTheDocument();
    expect(screen.getByText("View Invites")).toBeInTheDocument();
  });

  it("shows an error alert when loading fails for a reason other than a missing profile", async () => {
    getMyProfile.mockRejectedValue(new Error("network down"));
    renderPage();

    await waitFor(() => expect(screen.getByText("network down")).toBeInTheDocument());
  });
});
