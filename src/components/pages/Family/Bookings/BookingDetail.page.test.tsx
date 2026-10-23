import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBookingService } from "../../../../services/useBookingService";
import type { BookingResponse } from "../../../../services/useBookingService";
import { useReviewService } from "../../../../services/useReviewService";
import BookingDetailPage from "./BookingDetail.page";

vi.mock("../../../../services/useBookingService", () => ({
  useBookingService: vi.fn(),
}));
vi.mock("../../../../services/useReviewService", () => ({
  useReviewService: vi.fn(),
}));

const mockedUseBookingService = vi.mocked(useBookingService);
const mockedUseReviewService = vi.mocked(useReviewService);

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
    status: "PENDING",
    cost: 40,
    notes: null,
    recurringGroupId: null,
    ...overrides,
  };
}

function mockService(overrides: Partial<ReturnType<typeof useBookingService>> = {}) {
  const service = {
    create: vi.fn(),
    getById: vi.fn().mockResolvedValue(booking()),
    confirm: vi.fn(),
    start: vi.fn(),
    complete: vi.fn(),
    cancel: vi.fn().mockResolvedValue(booking({ status: "CANCELLED" })),
    getMyBookingsAsFamily: vi.fn(),
    getMyBookingsAsCaretaker: vi.fn(),
    getRecurringGroup: vi.fn().mockResolvedValue([]),
    getAll: vi.fn(),
    adminOverrideStatus: vi.fn(),
    ...overrides,
  };
  mockedUseBookingService.mockReturnValue(service);
  return service;
}

// Defaults to "not reviewed yet" (a rejected promise, same as a real REVIEW_NOT_FOUND 404)
// so a COMPLETED-status test that doesn't care about review state still resolves cleanly.
function mockReviewService(overrides: Partial<ReturnType<typeof useReviewService>> = {}) {
  const service = {
    create: vi.fn(),
    getByCaretaker: vi.fn(),
    getByBooking: vi.fn().mockRejectedValue(new Error("not found")),
    reply: vi.fn(),
    ...overrides,
  };
  mockedUseReviewService.mockReturnValue(service);
  return service;
}

function renderPage(id = "1", state?: { justCreated?: boolean }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: `/family/bookings/${id}`, state }]}>
      <Routes>
        <Route path="/family/bookings/:id" element={<BookingDetailPage />} />
        <Route path="/family/bookings" element={<div>bookings listing page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("BookingDetail.page", () => {
  beforeEach(() => {
    mockReviewService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads and displays the booking's details", async () => {
    mockService();
    renderPage();

    expect(await screen.findByText("Booking Details")).toBeInTheDocument();
    expect(screen.getByText("Robert")).toBeInTheDocument();
    expect(screen.getByText("Jane Caretaker")).toBeInTheDocument();
    expect(screen.getByText("Weekly Temple Visit")).toBeInTheDocument();
    expect(screen.getByText("Mar 2, 2026")).toBeInTheDocument();
    expect(screen.getByText("9:00 AM")).toBeInTheDocument();
    expect(screen.getByText("$40")).toBeInTheDocument();
  });

  it("shows the confirmation banner only when navigated here with justCreated state", async () => {
    mockService();
    renderPage("1", { justCreated: true });

    expect(await screen.findByText(/Booking request sent/)).toBeInTheDocument();
    // The permanent page heading never changes, unlike ElderSphere's own BookingDetail.
    expect(screen.getByText("Booking Details")).toBeInTheDocument();
  });

  it("shows no confirmation banner on a normal visit", async () => {
    mockService();
    renderPage("1");

    await screen.findByText("Booking Details");
    expect(screen.queryByText(/Booking request sent/)).not.toBeInTheDocument();
  });

  it("shows an error message when loading fails", async () => {
    mockService({ getById: vi.fn().mockRejectedValue(new Error("not found")) });
    renderPage();

    expect(await screen.findByText("not found")).toBeInTheDocument();
  });

  it("shows Cancel Booking for a cancellable status and cancels on confirmation", async () => {
    const user = userEvent.setup();
    const cancel = vi.fn().mockResolvedValue(booking({ status: "CANCELLED" }));
    mockService({ cancel });
    renderPage();

    await screen.findByText("Booking Details");
    await user.click(screen.getByRole("button", { name: "Cancel Booking" }));
    await user.click(screen.getByRole("dialog").querySelector("button:last-of-type")!);

    await waitFor(() => expect(cancel).toHaveBeenCalledWith(1, false));
  });

  it("hides Cancel Booking once the booking is COMPLETED", async () => {
    mockService({ getById: vi.fn().mockResolvedValue(booking({ status: "COMPLETED" })) });
    renderPage();

    await screen.findByText("Booking Details");
    expect(screen.queryByRole("button", { name: "Cancel Booking" })).not.toBeInTheDocument();
  });

  it("offers Leave a Review for a COMPLETED booking with no review yet", async () => {
    mockService({ getById: vi.fn().mockResolvedValue(booking({ status: "COMPLETED" })) });
    renderPage();

    expect(await screen.findByRole("button", { name: "Leave a Review" })).toBeInTheDocument();
  });

  it("offers View Your Review for a COMPLETED booking that's already been reviewed", async () => {
    mockService({ getById: vi.fn().mockResolvedValue(booking({ status: "COMPLETED" })) });
    mockReviewService({ getByBooking: vi.fn().mockResolvedValue({ id: 5 }) });
    renderPage();

    expect(await screen.findByRole("button", { name: "View Your Review" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Leave a Review" })).not.toBeInTheDocument();
  });

  it("never offers a review button for a non-COMPLETED booking", async () => {
    mockService();
    renderPage();

    await screen.findByText("Booking Details");
    expect(screen.queryByRole("button", { name: /Review/ })).not.toBeInTheDocument();
  });

  it("shows Cancel Entire Series for a recurring booking and cancels the whole series on confirmation", async () => {
    const user = userEvent.setup();
    const recurringBooking = booking({ recurringGroupId: "group-1" });
    const cancel = vi.fn().mockResolvedValue(recurringBooking);
    mockService({
      getById: vi.fn().mockResolvedValue(recurringBooking),
      getRecurringGroup: vi.fn().mockResolvedValue([recurringBooking, booking({ id: 2, scheduledDate: "2026-03-09", recurringGroupId: "group-1" })]),
      cancel,
    });
    renderPage();

    await screen.findByText("Recurring series (2 bookings)");
    await user.click(screen.getByRole("button", { name: "Cancel Entire Series" }));
    await user.click(screen.getByRole("dialog").querySelector("button:last-of-type")!);

    await waitFor(() => expect(cancel).toHaveBeenCalledWith(1, true));
  });

  it("navigates back to the bookings list", async () => {
    const user = userEvent.setup();
    mockService();
    renderPage();

    await screen.findByText("Booking Details");
    await user.click(screen.getByRole("button", { name: /Back to bookings/ }));

    expect(await screen.findByText("bookings listing page")).toBeInTheDocument();
  });
});
