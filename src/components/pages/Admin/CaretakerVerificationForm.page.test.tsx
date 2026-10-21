import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminCaretakerVerificationFormPage from "./CaretakerVerificationForm.page";
import { useCaretakerService } from "../../../services/useCaretakerService";
import { useFileService } from "../../../services/useFileService";
import { CaretakerVerificationStatusEnum } from "../../../utils/enums";

vi.mock("../../../services/useCaretakerService", () => ({
  useCaretakerService: vi.fn(),
}));
vi.mock("../../../services/useFileService", () => ({
  useFileService: vi.fn(),
}));

const mockedUseCaretakerService = vi.mocked(useCaretakerService);
const mockedUseFileService = vi.mocked(useFileService);

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/caretaker-verification/:id" element={<AdminCaretakerVerificationFormPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Admin CaretakerVerificationForm.page", () => {
  let getById: ReturnType<typeof vi.fn>;
  let getAvailability: ReturnType<typeof vi.fn>;
  let listVerificationDocuments: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getById = vi.fn().mockResolvedValue({
      id: 7, userId: 1, fullName: "Carla Caretaker", email: "c@example.com", phone: "+1-555",
      bio: "Experienced caregiver", specialties: ["Mobility Assistance"], yearsOfExperience: 5,
      hourlyRate: 25.5, ratingAverage: 4.2, verificationStatus: CaretakerVerificationStatusEnum.PENDING,
      profilePhotoFileAssetId: null, latitude: 12.9, longitude: 77.5, serviceRadiusKm: 10,
    });
    getAvailability = vi.fn().mockResolvedValue([
      { id: 1, caretakerId: 7, dayOfWeek: "MONDAY", startTime: "09:00:00", endTime: "17:00:00" },
    ]);
    listVerificationDocuments = vi.fn().mockResolvedValue([]);
    mockedUseCaretakerService.mockReturnValue(
      { getById, getAvailability, listVerificationDocuments } as unknown as ReturnType<typeof useCaretakerService>
    );
    mockedUseFileService.mockReturnValue({ getDownloadUrl: vi.fn() } as unknown as ReturnType<typeof useFileService>);
  });

  it("loads the caretaker's profile details, availability, and renders the documents panel", async () => {
    renderAt("/admin/caretaker-verification/7");

    expect(await screen.findByRole("heading", { name: "Carla Caretaker" })).toBeInTheDocument();
    expect(screen.getByText("Experienced caregiver")).toBeInTheDocument();
    expect(screen.getByText("Mobility Assistance")).toBeInTheDocument();
    expect(screen.getByText("09:00–17:00")).toBeInTheDocument();
    expect(getById).toHaveBeenCalledWith(7);
    expect(getAvailability).toHaveBeenCalledWith(7);
    expect(await screen.findByText("Submitted Verification Documents")).toBeInTheDocument();
  });

  it("shows an error message when the caretaker fails to load", async () => {
    getById.mockRejectedValue({ response: { data: { message: "Caretaker not found" } } });
    renderAt("/admin/caretaker-verification/999");

    expect(await screen.findByText("Caretaker not found")).toBeInTheDocument();
  });
});
