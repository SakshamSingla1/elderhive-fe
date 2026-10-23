import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useBookingService } from "../../../services/useBookingService";
import type { BookingResponse } from "../../../services/useBookingService";
import BookingsFormPage from "./BookingsForm.page";

vi.mock("../../../services/useBookingService", () => ({
  useBookingService: vi.fn(),
}));

const mockedUseBookingService = vi.mocked(useBookingService);

const existingBooking: BookingResponse = {
  id: 7,
  familyUserId: 1,
  elderProfileId: 10,
  elderName: "Robert",
  caretakerId: 20,
  caretakerName: "Jane Caretaker",
  caretakerUserId: 200,
  serviceOfferingId: 30,
  serviceName: "Weekly Temple Visit",
  scheduledDate: "2026-03-02",
  scheduledTime: "09:00:00",
  status: "PENDING",
  cost: 40,
  notes: "Bring wheelchair",
  recurringGroupId: null,
};

function mockService(overrides: Partial<ReturnType<typeof useBookingService>> = {}) {
  const service = {
    create: vi.fn(),
    getById: vi.fn().mockResolvedValue(existingBooking),
    confirm: vi.fn(),
    start: vi.fn(),
    complete: vi.fn(),
    cancel: vi.fn(),
    getMyBookingsAsFamily: vi.fn(),
    getMyBookingsAsCaretaker: vi.fn(),
    getRecurringGroup: vi.fn(),
    getAll: vi.fn(),
    adminOverrideStatus: vi.fn().mockResolvedValue({ ...existingBooking, status: "COMPLETED" }),
    ...overrides,
  };
  mockedUseBookingService.mockReturnValue(service);
  return service;
}

function renderPage(id = "7") {
  return render(
    <MemoryRouter initialEntries={[`/admin/bookings/${id}`]}>
      <Routes>
        <Route path="/admin/bookings/:id" element={<BookingsFormPage />} />
        <Route path="/admin/bookings" element={<div>bookings listing page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Admin BookingsForm.page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads and displays the booking's read-only context", async () => {
    mockService();
    renderPage();

    expect(await screen.findByText("Booking #7")).toBeInTheDocument();
    expect(screen.getByText("Robert")).toBeInTheDocument();
    expect(screen.getByText("Jane Caretaker")).toBeInTheDocument();
    expect(screen.getByText("Weekly Temple Visit")).toBeInTheDocument();
    expect(screen.getByText("Bring wheelchair")).toBeInTheDocument();
  });

  it("shows an error if loading the booking fails", async () => {
    mockService({ getById: vi.fn().mockRejectedValue(new Error("not found")) });
    renderPage();

    expect(await screen.findByText("not found")).toBeInTheDocument();
  });

  it("overrides the status directly, including a jump the regular lifecycle actions would reject, and navigates back to the listing", async () => {
    const user = userEvent.setup();
    const service = mockService();
    renderPage();

    await screen.findByText("Booking #7");
    await user.click(screen.getByLabelText("Status"));
    await user.click(await screen.findByRole("option", { name: "COMPLETED" }));
    await user.click(screen.getByRole("button", { name: "Override Status" }));

    await waitFor(() => expect(service.adminOverrideStatus).toHaveBeenCalledWith(7, "COMPLETED"));
    expect(await screen.findByText("bookings listing page")).toBeInTheDocument();
  });

  it("shows the backend's error message and stays on the page when the override fails", async () => {
    const user = userEvent.setup();
    mockService({ adminOverrideStatus: vi.fn().mockRejectedValue({ response: { data: { message: "Not authorized" } } }) });
    renderPage();

    await screen.findByText("Booking #7");
    await user.click(screen.getByRole("button", { name: "Override Status" }));

    expect(await screen.findByText("Not authorized")).toBeInTheDocument();
    expect(screen.queryByText("bookings listing page")).not.toBeInTheDocument();
  });

  it("navigates back to the listing", async () => {
    const user = userEvent.setup();
    mockService();
    renderPage();

    await screen.findByText("Booking #7");
    await user.click(screen.getByRole("button", { name: /Back to bookings/ }));

    expect(await screen.findByText("bookings listing page")).toBeInTheDocument();
  });
});
