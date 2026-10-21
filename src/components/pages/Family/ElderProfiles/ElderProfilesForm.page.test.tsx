import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ElderProfilesFormPage from "./ElderProfilesForm.page";
import { useElderProfileService } from "../../../../services/useElderProfileService";
import { useInviteService } from "../../../../services/useInviteService";

vi.mock("../../../../services/useElderProfileService", () => ({
  useElderProfileService: vi.fn(),
}));
vi.mock("../../../../services/useInviteService", () => ({
  useInviteService: vi.fn(),
}));

const mockedUseElderProfileService = vi.mocked(useElderProfileService);
const mockedUseInviteService = vi.mocked(useInviteService);

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/family/elder-profiles/new" element={<ElderProfilesFormPage />} />
        <Route path="/family/elder-profiles/:id" element={<ElderProfilesFormPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Family ElderProfilesForm.page", () => {
  let create: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let getById: ReturnType<typeof vi.fn>;
  let listFamilyMembers: ReturnType<typeof vi.fn>;
  let listForProfile: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    create = vi.fn();
    update = vi.fn().mockResolvedValue({});
    // Stubbed with a resolved value by default (not per-test) - creating a profile makes
    // this page immediately navigate to its own edit route (see the page's own onSubmit),
    // which re-renders this component and fires a real getById() call even in the
    // "create" test below.
    getById = vi.fn().mockResolvedValue({
      id: 5, fullName: "Grandma Rose", dateOfBirth: null, gender: null,
      medicalConditions: null, address: null, emergencyContactName: null, emergencyContactPhone: null,
    });
    listFamilyMembers = vi.fn().mockResolvedValue([{ userId: 10, fullName: "Family Owner", relationshipLabel: null, isOwner: true }]);
    listForProfile = vi.fn().mockResolvedValue([]);
    mockedUseElderProfileService.mockReturnValue(
      { create, update, getById, listFamilyMembers, removeFamilyMember: vi.fn() } as unknown as ReturnType<typeof useElderProfileService>
    );
    mockedUseInviteService.mockReturnValue(
      { listForProfile, createInvite: vi.fn() } as unknown as ReturnType<typeof useInviteService>
    );
  });

  it("the 'new' route shows an empty create form and never renders FamilyMembersPanel", async () => {
    renderAt("/family/elder-profiles/new");

    expect(await screen.findByRole("heading", { name: "Add Elder Profile" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/)).toHaveValue("");
    expect(screen.queryByText("Family Members")).not.toBeInTheDocument();
  });

  it("submitting the create form calls create() with the entered values", async () => {
    create.mockResolvedValue({ id: 5 });
    const user = userEvent.setup();
    renderAt("/family/elder-profiles/new");

    await user.type(await screen.findByLabelText(/Full Name/), "Grandma Rose");
    await user.click(screen.getByRole("button", { name: "Create Profile" }));

    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ fullName: "Grandma Rose" })));
  });

  it("an edit route loads the existing profile and renders FamilyMembersPanel", async () => {
    getById.mockResolvedValue({
      id: 5, fullName: "Grandma Rose", dateOfBirth: null, gender: null,
      medicalConditions: null, address: null, emergencyContactName: null, emergencyContactPhone: null,
    });
    renderAt("/family/elder-profiles/5");

    expect(await screen.findByDisplayValue("Grandma Rose")).toBeInTheDocument();
    expect(await screen.findByText("Family Members")).toBeInTheDocument();
    expect(await screen.findByText("Family Owner")).toBeInTheDocument();
  });
});
