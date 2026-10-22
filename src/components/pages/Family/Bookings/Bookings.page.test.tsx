import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBookingService } from "../../../../services/useBookingService";
import type { BookingResponse } from "../../../../services/useBookingService";
import BookingsPage from "./Bookings.page";

vi.mock("../../../../services/useBookingService", () => ({
  useBookingService: vi.fn(),
}));

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
    status: "PENDING",
    cost: 40,
    notes: null,
    recurringGroupId: null,
    ...overrides,
  };
}

function pageOf(content: BookingResponse[], totalPages = 1) {
  return {
    content,
    totalElements: content.length,
    totalPages,
    number: 0,
    size: 10,
    first: true,
    last: true,
    numberOfElements: content.length,
    empty: content.length === 0,
  };
}

function mockService(overrides: Partial<ReturnType<typeof useBookingService>> = {}) {
  const service = {
    create: vi.fn(),
    getById: vi.fn(),
    confirm: vi.fn(),
    start: vi.fn(),
    complete: vi.fn(),
    cancel: vi.fn().mockResolvedValue(booking({ status: "CANCELLED" })),
    getMyBookingsAsFamily: vi.fn().mockResolvedValue(pageOf([booking()])),
    getMyBookingsAsCaretaker: vi.fn(),
    getRecurringGroup: vi.fn(),
    ...overrides,
  };
  mockedUseBookingService.mockReturnValue(service);
  return service;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/family/bookings"]}>
      <Routes>
        <Route path="/family/bookings" element={<BookingsPage />} />
        <Route path="/family/bookings/:id" element={<div>booking detail page</div>} />
        <Route path="/family/services" element={<div>browse services page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Bookings.page", () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the fetched bookings", async () => {
    mockService();
    renderPage();

    expect(await screen.findByText("Robert")).toBeInTheDocument();
    expect(screen.getByText("Jane Caretaker")).toBeInTheDocument();
    expect(screen.getByText("Weekly Temple Visit")).toBeInTheDocument();
  });

  it("shows an error alert when the initial load fails", async () => {
    mockService({ getMyBookingsAsFamily: vi.fn().mockRejectedValue(new Error("network down")) });
    renderPage();

    expect(await screen.findByText("network down")).toBeInTheDocument();
  });

  it("shows the empty state with a link to Browse Services when there are no bookings", async () => {
    const user = userEvent.setup();
    mockService({ getMyBookingsAsFamily: vi.fn().mockResolvedValue(pageOf([])) });
    renderPage();

    expect(await screen.findByText("No bookings yet")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Browse services" }));
    expect(await screen.findByText("browse services page")).toBeInTheDocument();
  });

  it("navigates to the booking's detail page when a row is clicked", async () => {
    const user = userEvent.setup();
    mockService();
    renderPage();

    await user.click(await screen.findByText("Robert"));
    expect(await screen.findByText("booking detail page")).toBeInTheDocument();
  });

  it("cancels a booking after confirmation and refetches the page", async () => {
    const user = userEvent.setup();
    const cancel = vi.fn().mockResolvedValue(booking({ status: "CANCELLED" }));
    const getMyBookingsAsFamily = vi.fn().mockResolvedValue(pageOf([booking()]));
    mockService({ cancel, getMyBookingsAsFamily });
    renderPage();

    await screen.findByText("Robert");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => expect(cancel).toHaveBeenCalledWith(1, false));
    await waitFor(() => expect(getMyBookingsAsFamily).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Booking cancelled")).toBeInTheDocument();
  });

  it("does not cancel when the confirmation dialog is dismissed", async () => {
    const user = userEvent.setup();
    confirmSpy.mockReturnValue(false);
    const cancel = vi.fn();
    mockService({ cancel });
    renderPage();

    await screen.findByText("Robert");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(cancel).not.toHaveBeenCalled();
  });

  it("shows a Cancel Series button only for a recurring booking, and calls cancel with cancelSeries=true", async () => {
    const user = userEvent.setup();
    const cancel = vi.fn().mockResolvedValue(booking({ status: "CANCELLED" }));
    mockService({ cancel, getMyBookingsAsFamily: vi.fn().mockResolvedValue(pageOf([booking({ recurringGroupId: "group-1" })])) });
    renderPage();

    await screen.findByText("Robert");
    await user.click(screen.getByRole("button", { name: "Cancel Series" }));

    await waitFor(() => expect(cancel).toHaveBeenCalledWith(1, true));
  });

  it("hides Cancel actions for a COMPLETED booking", async () => {
    mockService({ getMyBookingsAsFamily: vi.fn().mockResolvedValue(pageOf([booking({ status: "COMPLETED" })])) });
    renderPage();

    await screen.findByText("Robert");
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("shows pagination only when there's more than one page", async () => {
    mockService({ getMyBookingsAsFamily: vi.fn().mockResolvedValue(pageOf([booking()], 3)) });
    renderPage();

    await screen.findByText("Robert");
    expect(screen.getByRole("button", { name: "Go to page 2" })).toBeInTheDocument();
  });
});
