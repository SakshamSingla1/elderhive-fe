import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useReviewService } from "../../../services/useReviewService";
import type { ReviewResponse } from "../../../services/useReviewService";
import { useBookingService } from "../../../services/useBookingService";
import type { BookingResponse } from "../../../services/useBookingService";
import ReviewsPage from "./Reviews.page";

vi.mock("../../../services/useReviewService", () => ({
  useReviewService: vi.fn(),
}));
vi.mock("../../../services/useBookingService", () => ({
  useBookingService: vi.fn(),
}));

const mockedUseReviewService = vi.mocked(useReviewService);
const mockedUseBookingService = vi.mocked(useBookingService);

function booking(overrides: Partial<BookingResponse> = {}): BookingResponse {
  return {
    id: 1,
    familyUserId: 1,
    elderProfileId: 10,
    elderName: "Robert",
    caretakerId: 20,
    caretakerName: "Jane Caretaker",
    serviceOfferingId: 30,
    serviceName: "Weekly Temple Visit",
    scheduledDate: "2026-03-02",
    scheduledTime: "09:00:00",
    status: "COMPLETED",
    cost: 40,
    notes: null,
    recurringGroupId: null,
    ...overrides,
  };
}

function review(overrides: Partial<ReviewResponse> = {}): ReviewResponse {
  return {
    id: 5,
    bookingId: 1,
    reviewerUserId: 1,
    reviewerName: "Family Member",
    caretakerId: 20,
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

function mockBookingService(getById: ReturnType<typeof useBookingService>["getById"] = vi.fn().mockResolvedValue(booking())) {
  mockedUseBookingService.mockReturnValue({
    create: vi.fn(),
    getById,
    confirm: vi.fn(),
    start: vi.fn(),
    complete: vi.fn(),
    cancel: vi.fn(),
    getMyBookingsAsFamily: vi.fn(),
    getMyBookingsAsCaretaker: vi.fn(),
    getRecurringGroup: vi.fn(),
    getAll: vi.fn(),
    adminOverrideStatus: vi.fn(),
  });
}

function mockReviewService(overrides: Partial<ReturnType<typeof useReviewService>> = {}) {
  const service = {
    create: vi.fn().mockResolvedValue(review()),
    getByCaretaker: vi.fn(),
    getByBooking: vi.fn().mockRejectedValue(new Error("not found")),
    reply: vi.fn(),
    ...overrides,
  };
  mockedUseReviewService.mockReturnValue(service);
  return service;
}

function renderPage(initialEntry = "/family/reviews?bookingId=1") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/family/reviews" element={<ReviewsPage />} />
        <Route path="/family/bookings" element={<div>bookings listing page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Family Reviews.page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows guidance to pick a booking when no bookingId is in the URL", async () => {
    mockBookingService();
    mockReviewService();
    renderPage("/family/reviews");

    expect(await screen.findByText(/Choose a completed booking/)).toBeInTheDocument();
  });

  it("shows an info message for a booking that isn't COMPLETED yet", async () => {
    mockBookingService(vi.fn().mockResolvedValue(booking({ status: "CONFIRMED" })));
    mockReviewService();
    renderPage();

    expect(await screen.findByText(/Only a completed booking can be reviewed/)).toBeInTheDocument();
  });

  it("renders the sub-ratings form for a completed, unreviewed booking", async () => {
    mockBookingService();
    mockReviewService();
    renderPage();

    expect(await screen.findByText(/Reviewing Jane Caretaker/)).toBeInTheDocument();
    expect(screen.getByText("Overall Rating")).toBeInTheDocument();
    expect(screen.getByText("Punctuality")).toBeInTheDocument();
    expect(screen.getByText("Care Quality")).toBeInTheDocument();
    expect(screen.getByText("Communication")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit Review" })).toBeInTheDocument();
  });

  it("submits the review with the entered comment and the default 5-star ratings", async () => {
    const user = userEvent.setup();
    mockBookingService();
    const service = mockReviewService();
    renderPage();

    await screen.findByText(/Reviewing Jane Caretaker/);
    await user.type(screen.getByLabelText("Comment (optional)"), "Great visit");
    await user.click(screen.getByRole("button", { name: "Submit Review" }));

    expect(service.create).toHaveBeenCalledWith({
      bookingId: 1,
      overallRating: 5,
      comment: "Great visit",
      punctualityRating: 5,
      careQualityRating: 5,
      communicationRating: 5,
    });
    expect(await screen.findByText("Thanks for your review!")).toBeInTheDocument();
  });

  it("shows the existing review read-only instead of the form once one already exists", async () => {
    mockBookingService();
    mockReviewService({ getByBooking: vi.fn().mockResolvedValue(review({ comment: "Already reviewed this one" })) });
    renderPage();

    expect(await screen.findByText(/already reviewed this booking/)).toBeInTheDocument();
    expect(screen.getByText('"Already reviewed this one"')).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit Review" })).not.toBeInTheDocument();
  });

  it("shows the caretaker's reply alongside an already-submitted review", async () => {
    mockBookingService();
    mockReviewService({
      getByBooking: vi.fn().mockResolvedValue(review({ reply: { id: 1, reviewId: 5, caretakerId: 20, content: "Thank you!" } })),
    });
    renderPage();

    expect(await screen.findByText("Thank you!")).toBeInTheDocument();
  });

  it("shows a submit error rather than navigating away when create fails", async () => {
    const user = userEvent.setup();
    mockBookingService();
    mockReviewService({ create: vi.fn().mockRejectedValue(new Error("This booking has already been reviewed")) });
    renderPage();

    await screen.findByText(/Reviewing Jane Caretaker/);
    await user.click(screen.getByRole("button", { name: "Submit Review" }));

    expect(await screen.findByText("This booking has already been reviewed")).toBeInTheDocument();
  });
});
