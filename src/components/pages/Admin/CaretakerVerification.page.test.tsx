import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminCaretakerVerificationPage from "./CaretakerVerification.page";
import { useCaretakerService } from "../../../services/useCaretakerService";
import { useSearchService } from "../../../services/useSearchService";
import { CaretakerVerificationStatusEnum } from "../../../utils/enums";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../../../services/useCaretakerService", () => ({
  useCaretakerService: vi.fn(),
}));
vi.mock("../../../services/useSearchService", () => ({
  useSearchService: vi.fn(),
}));

const mockedUseCaretakerService = vi.mocked(useCaretakerService);
const mockedUseSearchService = vi.mocked(useSearchService);

const SAMPLE_PAGE = {
  content: [
    { id: 1, userId: 10, fullName: "Carla Pending", specialties: ["Mobility Assistance"], yearsOfExperience: 5, hourlyRate: 25, ratingAverage: 4.2, verificationStatus: CaretakerVerificationStatusEnum.PENDING },
    { id: 2, userId: 11, fullName: "Vera Verified", specialties: [], yearsOfExperience: null, hourlyRate: null, ratingAverage: null, verificationStatus: CaretakerVerificationStatusEnum.VERIFIED },
  ],
  totalElements: 2, totalPages: 1, number: 0, size: 100, first: true, last: true, numberOfElements: 2, empty: false,
};

describe("Admin CaretakerVerification.page", () => {
  let getAll: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockNavigate.mockReset();
    getAll = vi.fn().mockResolvedValue(SAMPLE_PAGE);
    mockedUseCaretakerService.mockReturnValue({ getAll } as unknown as ReturnType<typeof useCaretakerService>);
    mockedUseSearchService.mockReturnValue({ searchCaretakers: vi.fn().mockResolvedValue([]) } as unknown as ReturnType<typeof useSearchService>);
  });

  it("defaults to showing only PENDING caretakers", async () => {
    render(
      <MemoryRouter>
        <AdminCaretakerVerificationPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Carla Pending")).toBeInTheDocument();
    expect(screen.queryByText("Vera Verified")).not.toBeInTheDocument();
  });

  it("switching the status filter to All statuses shows every caretaker", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminCaretakerVerificationPage />
      </MemoryRouter>
    );
    await screen.findByText("Carla Pending");

    await user.click(screen.getByLabelText("Status"));
    await user.click(await screen.findByRole("option", { name: "All statuses" }));

    expect(await screen.findByText("Vera Verified")).toBeInTheDocument();
  });

  it("clicking Review navigates to that caretaker's detail page", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminCaretakerVerificationPage />
      </MemoryRouter>
    );
    await screen.findByText("Carla Pending");

    await user.click(screen.getByRole("button", { name: "Review" }));

    expect(mockNavigate).toHaveBeenCalledWith("/admin/caretaker-verification/1");
  });
});
