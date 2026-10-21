import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CaretakerVerificationDocumentsPanel from "./CaretakerVerificationDocumentsPanel";
import { useCaretakerService } from "../../../services/useCaretakerService";
import { useFileService } from "../../../services/useFileService";
import { DocumentReviewStatusEnum } from "../../../utils/enums";

vi.mock("../../../services/useCaretakerService", () => ({
  useCaretakerService: vi.fn(),
}));
vi.mock("../../../services/useFileService", () => ({
  useFileService: vi.fn(),
}));

const mockedUseCaretakerService = vi.mocked(useCaretakerService);
const mockedUseFileService = vi.mocked(useFileService);

describe("CaretakerVerificationDocumentsPanel", () => {
  let listVerificationDocuments: ReturnType<typeof vi.fn>;
  let reviewVerificationDocument: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    listVerificationDocuments = vi.fn().mockResolvedValue([
      { id: 1, caretakerId: 10, fileAssetId: 55, docType: "ID_PROOF", reviewStatus: DocumentReviewStatusEnum.PENDING, fileUrl: "http://x/f.pdf", originalFilename: "id.pdf" },
    ]);
    reviewVerificationDocument = vi.fn();
    mockedUseCaretakerService.mockReturnValue(
      { listVerificationDocuments, reviewVerificationDocument } as unknown as ReturnType<typeof useCaretakerService>
    );
    mockedUseFileService.mockReturnValue({ getDownloadUrl: (id: number) => `http://x/files/${id}/download` } as ReturnType<
      typeof useFileService
    >);
  });

  it("shows a message when there are no documents yet", async () => {
    listVerificationDocuments.mockResolvedValue([]);
    render(<CaretakerVerificationDocumentsPanel caretakerId={10} />);

    expect(await screen.findByText("This caretaker hasn't submitted any verification documents yet.")).toBeInTheDocument();
  });

  it("approving a document calls reviewVerificationDocument with APPROVED and updates its chip", async () => {
    reviewVerificationDocument.mockResolvedValue({
      id: 1, caretakerId: 10, fileAssetId: 55, docType: "ID_PROOF", reviewStatus: DocumentReviewStatusEnum.APPROVED, fileUrl: "http://x/f.pdf", originalFilename: "id.pdf",
    });
    const user = userEvent.setup();
    render(<CaretakerVerificationDocumentsPanel caretakerId={10} />);
    await screen.findByText("id.pdf");

    await user.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => expect(reviewVerificationDocument).toHaveBeenCalledWith(1, DocumentReviewStatusEnum.APPROVED));
    expect(await screen.findByText("APPROVED")).toBeInTheDocument();
  });

  it("rejecting a document calls reviewVerificationDocument with REJECTED", async () => {
    reviewVerificationDocument.mockResolvedValue({
      id: 1, caretakerId: 10, fileAssetId: 55, docType: "ID_PROOF", reviewStatus: DocumentReviewStatusEnum.REJECTED, fileUrl: "http://x/f.pdf", originalFilename: "id.pdf",
    });
    const user = userEvent.setup();
    render(<CaretakerVerificationDocumentsPanel caretakerId={10} />);
    await screen.findByText("id.pdf");

    await user.click(screen.getByRole("button", { name: "Reject" }));

    await waitFor(() => expect(reviewVerificationDocument).toHaveBeenCalledWith(1, DocumentReviewStatusEnum.REJECTED));
  });

  it("shows an error message (mentioning the permission) when the review call fails", async () => {
    reviewVerificationDocument.mockRejectedValue({ response: { status: 403 } });
    const user = userEvent.setup();
    render(<CaretakerVerificationDocumentsPanel caretakerId={10} />);
    await screen.findByText("id.pdf");

    await user.click(screen.getByRole("button", { name: "Approve" }));

    expect(await screen.findByText(/CARETAKER_VERIFY/)).toBeInTheDocument();
  });
});
