import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useBookingService } from "../../../services/useBookingService";
import type { BookingResponse } from "../../../services/useBookingService";
import BookingsPage from "./Bookings.page";

vi.mock("../../../services/useBookingService", () => ({
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
    caretakerUserId: 200,
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

function pageOf(content: BookingResponse[]) {
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

function mockService(getAll = vi.fn().mockResolvedValue(pageOf([booking()]))) {
  mockedUseBookingService.mockReturnValue({
    create: vi.fn(),
    getById: vi.fn(),
    confirm: vi.fn(),
    start: vi.fn(),
    complete: vi.fn(),
    cancel: vi.fn(),
    getMyBookingsAsFamily: vi.fn(),
    getMyBookingsAsCaretaker: vi.fn(),
    getRecurringGroup: vi.fn(),
    getAll,
    adminOverrideStatus: vi.fn(),
  });
  return getAll;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/bookings"]}>
      <Routes>
        <Route path="/admin/bookings" element={<BookingsPage />} />
        <Route path="/admin/bookings/:id" element={<div>booking form page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Admin Bookings.page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders every booking across the platform (no caller scoping)", async () => {
    mockService();
    renderPage();

    expect(await screen.findByText("Robert")).toBeInTheDocument();
    expect(screen.getByText("Jane Caretaker")).toBeInTheDocument();
  });

  it("shows an error alert when the initial load fails", async () => {
    mockService(vi.fn().mockRejectedValue(new Error("network down")));
    renderPage();

    expect(await screen.findByText("network down")).toBeInTheDocument();
  });

  it("navigates to the booking's override form when a row is clicked", async () => {
    const user = userEvent.setup();
    mockService();
    renderPage();

    await user.click(await screen.findByText("Robert"));
    expect(await screen.findByText("booking form page")).toBeInTheDocument();
  });

  it("filters by status, sending the selected status and resetting to page 0", async () => {
    const user = userEvent.setup();
    const getAll = mockService();
    renderPage();

    await screen.findByText("Robert");
    getAll.mockClear();
    await user.click(screen.getByLabelText("Status"));
    await user.click(await screen.findByRole("option", { name: "CONFIRMED" }));

    await waitFor(() => expect(getAll).toHaveBeenCalledWith(expect.objectContaining({ status: "CONFIRMED", page: 0 })));
  });

  it("omits the status filter when All statuses is selected", async () => {
    const getAll = mockService();
    renderPage();

    await screen.findByText("Robert");
    expect(getAll).toHaveBeenCalledWith(expect.objectContaining({ status: undefined }));
  });

  it("shows the empty state when there are no bookings", async () => {
    mockService(vi.fn().mockResolvedValue(pageOf([])));
    renderPage();

    expect(await screen.findByText("No bookings found")).toBeInTheDocument();
  });
});
