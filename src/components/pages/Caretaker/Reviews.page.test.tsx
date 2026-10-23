import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useReviewService } from "../../../services/useReviewService";
import type { ReviewResponse } from "../../../services/useReviewService";
import { useCaretakerService } from "../../../services/useCaretakerService";
import ReviewsPage from "./Reviews.page";

vi.mock("../../../services/useReviewService", () => ({
  useReviewService: vi.fn(),
}));
vi.mock("../../../services/useCaretakerService", () => ({
  useCaretakerService: vi.fn(),
}));

const mockedUseReviewService = vi.mocked(useReviewService);
const mockedUseCaretakerService = vi.mocked(useCaretakerService);

function review(overrides: Partial<ReviewResponse> = {}): ReviewResponse {
  return {
    id: 5,
    bookingId: 1,
    reviewerUserId: 1,
    reviewerName: "Alice Family",
    caretakerId: 7,
    caretakerName: "Jane Caretaker",
    overallRating: 5,
    comment: "Wonderful care",
    punctualityRating: 5,
    careQualityRating: 4,
    communicationRating: 5,
    photoFileAssetId: null,
    photoUrl: null,
    reply: null,
    ...overrides,
  };
}

function pageOf(content: ReviewResponse[]) {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    number: 0,
    size: 10,
    first: true,
    last: true,
    numberOfElements: content.length,
    empty: content.length === 0,
  };
}

function mockCaretakerService(getMyProfile: ReturnType<typeof useCaretakerService>["getMyProfile"] = vi.fn().mockResolvedValue({ id: 7 })) {
  mockedUseCaretakerService.mockReturnValue({
    createOrUpdate: vi.fn(),
    getMyProfile,
    getById: vi.fn(),
    getAll: vi.fn(),
    uploadVerificationDocument: vi.fn(),
    listVerificationDocuments: vi.fn(),
    reviewVerificationDocument: vi.fn(),
    getAvailability: vi.fn(),
    addAvailabilitySlot: vi.fn(),
    updateAvailabilitySlot: vi.fn(),
    removeAvailabilitySlot: vi.fn(),
    getAvailableSlots: vi.fn(),
  });
}

function mockReviewService(overrides: Partial<ReturnType<typeof useReviewService>> = {}) {
  const service = {
    create: vi.fn(),
    getByCaretaker: vi.fn().mockResolvedValue(pageOf([review()])),
    getByBooking: vi.fn(),
    reply: vi.fn().mockResolvedValue({ id: 1, reviewId: 5, caretakerId: 7, content: "Thanks!" }),
    ...overrides,
  };
  mockedUseReviewService.mockReturnValue(service);
  return service;
}

describe("Caretaker Reviews.page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads and displays reviews received, including the category breakdown and comment", async () => {
    mockCaretakerService();
    mockReviewService();
    render(<ReviewsPage />);

    expect(await screen.findByText("Alice Family")).toBeInTheDocument();
    expect(screen.getByText("Wonderful care")).toBeInTheDocument();
    expect(screen.getByText("Punctuality")).toBeInTheDocument();
    expect(screen.getByText("Care Quality")).toBeInTheDocument();
    expect(screen.getByText("Communication")).toBeInTheDocument();
  });

  it("shows an empty state when there are no reviews yet", async () => {
    mockCaretakerService();
    mockReviewService({ getByCaretaker: vi.fn().mockResolvedValue(pageOf([])) });
    render(<ReviewsPage />);

    expect(await screen.findByText("No reviews yet")).toBeInTheDocument();
  });

  it("offers a Reply button for a review with no reply yet, and posts the reply", async () => {
    const user = userEvent.setup();
    mockCaretakerService();
    const service = mockReviewService();
    render(<ReviewsPage />);

    await user.click(await screen.findByRole("button", { name: "Reply" }));
    expect(screen.getByText("Reply to review")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Your reply"), "Thanks for the kind words!");
    await user.click(screen.getByRole("button", { name: "Post Reply" }));

    expect(service.reply).toHaveBeenCalledWith(5, "Thanks for the kind words!");
    expect(await screen.findByText("Reply posted")).toBeInTheDocument();
  });

  it("never offers a Reply button once a review already has one, and shows the reply text instead", async () => {
    mockCaretakerService();
    mockReviewService({
      getByCaretaker: vi.fn().mockResolvedValue(
        pageOf([review({ reply: { id: 1, reviewId: 5, caretakerId: 7, content: "Thank you so much!" } })])
      ),
    });
    render(<ReviewsPage />);

    expect(await screen.findByText("Thank you so much!")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reply" })).not.toBeInTheDocument();
  });

  it("shows an error if loading reviews fails", async () => {
    mockCaretakerService();
    mockReviewService({ getByCaretaker: vi.fn().mockRejectedValue(new Error("server unavailable")) });
    render(<ReviewsPage />);

    expect(await screen.findByText("server unavailable")).toBeInTheDocument();
  });

  it("shows nothing requiring a profile lookup failure to blow up the page", async () => {
    mockCaretakerService(vi.fn().mockRejectedValue(new Error("no profile yet")));
    mockReviewService();
    render(<ReviewsPage />);

    expect(await screen.findByText("No reviews yet")).toBeInTheDocument();
  });
});
