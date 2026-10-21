import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CaretakerMyProfilePage from "./MyProfile.page";
import { useCaretakerService } from "../../../services/useCaretakerService";
import { useFileService } from "../../../services/useFileService";
import { CaretakerVerificationStatusEnum, DocumentReviewStatusEnum } from "../../../utils/enums";

vi.mock("../../../services/useCaretakerService", () => ({
  useCaretakerService: vi.fn(),
}));
vi.mock("../../../services/useFileService", () => ({
  useFileService: vi.fn(),
}));

const mockedUseCaretakerService = vi.mocked(useCaretakerService);
const mockedUseFileService = vi.mocked(useFileService);

const PROFILE = {
  id: 10, userId: 1, fullName: "Carla Caretaker", email: "c@example.com", phone: null,
  bio: "Experienced caregiver", specialties: ["Mobility Assistance"], yearsOfExperience: 5,
  hourlyRate: 25.5, ratingAverage: 4.2, verificationStatus: CaretakerVerificationStatusEnum.PENDING,
  profilePhotoFileAssetId: null, latitude: 12.9, longitude: 77.5, serviceRadiusKm: 10,
};

describe("Caretaker MyProfile.page", () => {
  let getMyProfile: ReturnType<typeof vi.fn>;
  let createOrUpdate: ReturnType<typeof vi.fn>;
  let listVerificationDocuments: ReturnType<typeof vi.fn>;
  let uploadVerificationDocument: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getMyProfile = vi.fn();
    createOrUpdate = vi.fn();
    listVerificationDocuments = vi.fn().mockResolvedValue([]);
    uploadVerificationDocument = vi.fn();
    mockedUseCaretakerService.mockReturnValue(
      { getMyProfile, createOrUpdate, listVerificationDocuments, uploadVerificationDocument } as unknown as ReturnType<typeof useCaretakerService>
    );
    mockedUseFileService.mockReturnValue({ getDownloadUrl: (id: number) => `http://x/files/${id}/download` } as ReturnType<
      typeof useFileService
    >);
  });

  it("shows an empty create form when the caller has no profile yet (404)", async () => {
    getMyProfile.mockRejectedValue({ response: { status: 404 } });
    render(<CaretakerMyProfilePage />);

    expect(await screen.findByRole("button", { name: "Create Profile" })).toBeInTheDocument();
    // No profile id yet - the verification documents section doesn't render.
    expect(screen.queryByText("Verification Documents")).not.toBeInTheDocument();
  });

  it("pre-fills the form, shows the verification status chip, and lists documents", async () => {
    getMyProfile.mockResolvedValue(PROFILE);
    listVerificationDocuments.mockResolvedValue([
      { id: 1, caretakerId: 10, fileAssetId: 55, docType: "ID_PROOF", reviewStatus: DocumentReviewStatusEnum.PENDING, fileUrl: "http://x/f.pdf", originalFilename: "id.pdf" },
    ]);

    render(<CaretakerMyProfilePage />);

    expect(await screen.findByDisplayValue("Experienced caregiver")).toBeInTheDocument();
    // Appears twice: the profile's own verificationStatus chip and this document's reviewStatus chip.
    expect(screen.getAllByText("PENDING").length).toBe(2);
    expect(await screen.findByText("id.pdf")).toBeInTheDocument();
  });

  it("saving the profile calls createOrUpdate with the parsed specialties list", async () => {
    getMyProfile.mockResolvedValue(PROFILE);
    createOrUpdate.mockResolvedValue({ ...PROFILE, verificationStatus: CaretakerVerificationStatusEnum.PENDING });
    const user = userEvent.setup();

    render(<CaretakerMyProfilePage />);
    await screen.findByDisplayValue("Experienced caregiver");

    const specialtiesField = screen.getByLabelText(/Specialties/);
    await user.clear(specialtiesField);
    await user.type(specialtiesField, "Mobility Assistance, Companionship");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(createOrUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ specialties: ["Mobility Assistance", "Companionship"] })
      )
    );
  });

  it("uploading a document calls uploadVerificationDocument with the selected file", async () => {
    getMyProfile.mockResolvedValue(PROFILE);
    uploadVerificationDocument.mockResolvedValue({});
    const user = userEvent.setup();

    render(<CaretakerMyProfilePage />);
    await screen.findByText("Verification Documents");

    const file = new File(["bytes"], "id.pdf", { type: "application/pdf" });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => expect(uploadVerificationDocument).toHaveBeenCalledWith(file, undefined));
  });
});
