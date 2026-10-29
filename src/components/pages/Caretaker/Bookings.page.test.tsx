import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useBookingService } from "../../../services/useBookingService";
import type { BookingResponse } from "../../../services/useBookingService";
import { useCaretakerService } from "../../../services/useCaretakerService";
import BookingsPage from "./Bookings.page";

vi.mock("../../../services/useBookingService", () => ({
  useBookingService: vi.fn(),
}));
vi.mock("../../../services/useCaretakerService", () => ({
  useCaretakerService: vi.fn(),
}));

const mockedUseBookingService = vi.mocked(useBookingService);
const mockedUseCaretakerService = vi.mocked(useCaretakerService);

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

function mockBookingService(overrides: Partial<ReturnType<typeof useBookingService>> = {}) {
  const service = {
    create: vi.fn(),
    getById: vi.fn(),
    confirm: vi.fn().mockResolvedValue(booking({ status: "CONFIRMED" })),
    start: vi.fn().mockResolvedValue(booking({ status: "IN_PROGRESS" })),
    complete: vi.fn().mockResolvedValue(booking({ status: "COMPLETED" })),
    cancel: vi.fn().mockResolvedValue(booking({ status: "CANCELLED" })),
    getMyBookingsAsFamily: vi.fn(),
    getMyBookingsAsCaretaker: vi.fn().mockResolvedValue(pageOf([booking()])),
    getRecurringGroup: vi.fn(),
    getAll: vi.fn(),
    adminOverrideStatus: vi.fn(),
    ...overrides,
  };
  mockedUseBookingService.mockReturnValue(service);
  return service;
}

function mockCaretakerService(getAvailability = vi.fn().mockResolvedValue([])) {
  mockedUseCaretakerService.mockReturnValue({
    createOrUpdate: vi.fn(),
    getMyProfile: vi.fn().mockResolvedValue({ id: 7 }),
    getById: vi.fn(),
    getAll: vi.fn(),
    uploadVerificationDocument: vi.fn(),
    listVerificationDocuments: vi.fn(),
    reviewVerificationDocument: vi.fn(),
    getAvailability,
    addAvailabilitySlot: vi.fn(),
    updateAvailabilitySlot: vi.fn(),
    removeAvailabilitySlot: vi.fn(),
    getAvailableSlots: vi.fn(),
  });
}

describe("Caretaker Bookings.page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the fetched bookings", async () => {
    mockBookingService();
    mockCaretakerService();
    render(<BookingsPage />);

    expect(await screen.findByText("Robert")).toBeInTheDocument();
    expect(screen.getByText("Weekly Temple Visit")).toBeInTheDocument();
  });

  it("shows an error alert when the initial load fails", async () => {
    mockBookingService({ getMyBookingsAsCaretaker: vi.fn().mockRejectedValue(new Error("network down")) });
    mockCaretakerService();
    render(<BookingsPage />);

    expect(await screen.findByText("network down")).toBeInTheDocument();
  });

  it("toggles the weekly availability panel and shows the caretaker's own schedule", async () => {
    const user = userEvent.setup();
    mockBookingService();
    mockCaretakerService(vi.fn().mockResolvedValue([{ id: 1, caretakerId: 7, dayOfWeek: "MONDAY", startTime: "09:00:00", endTime: "12:00:00" }]));
    render(<BookingsPage />);

    await screen.findByText("Robert");
    expect(screen.queryByText("09:00–12:00")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Your Weekly Availability/ }));

    expect(await screen.findByText("09:00–12:00")).toBeInTheDocument();
  });

  it("shows Confirm and Decline for a PENDING booking, and Confirm calls bookingService.confirm", async () => {
    const user = userEvent.setup();
    const service = mockBookingService();
    mockCaretakerService();
    render(<BookingsPage />);

    await screen.findByText("Robert");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(service.confirm).toHaveBeenCalledWith(1));
    expect(await screen.findByText("Booking confirmed")).toBeInTheDocument();
  });

  it("Decline asks for confirmation then cancels the booking", async () => {
    const user = userEvent.setup();
    const service = mockBookingService();
    mockCaretakerService();
    render(<BookingsPage />);

    await screen.findByText("Robert");
    await user.click(screen.getByRole("button", { name: "Decline" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Decline this booking?")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Decline" }));

    await waitFor(() => expect(service.cancel).toHaveBeenCalledWith(1, false));
  });

  it("does not decline when the confirmation dialog is dismissed", async () => {
    const user = userEvent.setup();
    const service = mockBookingService();
    mockCaretakerService();
    render(<BookingsPage />);

    await screen.findByText("Robert");
    await user.click(screen.getByRole("button", { name: "Decline" }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(service.cancel).not.toHaveBeenCalled();
  });

  it("shows Start Visit for a CONFIRMED booking and calls bookingService.start", async () => {
    const user = userEvent.setup();
    const service = mockBookingService({ getMyBookingsAsCaretaker: vi.fn().mockResolvedValue(pageOf([booking({ status: "CONFIRMED" })])) });
    mockCaretakerService();
    render(<BookingsPage />);

    await screen.findByText("Robert");
    await user.click(screen.getByRole("button", { name: "Start Visit" }));

    await waitFor(() => expect(service.start).toHaveBeenCalledWith(1));
  });

  it("shows Mark Complete for an IN_PROGRESS booking and calls bookingService.complete", async () => {
    const user = userEvent.setup();
    const service = mockBookingService({ getMyBookingsAsCaretaker: vi.fn().mockResolvedValue(pageOf([booking({ status: "IN_PROGRESS" })])) });
    mockCaretakerService();
    render(<BookingsPage />);

    await screen.findByText("Robert");
    await user.click(screen.getByRole("button", { name: "Mark Complete" }));

    await waitFor(() => expect(service.complete).toHaveBeenCalledWith(1));
  });

  it("shows no action buttons for a COMPLETED or CANCELLED booking", async () => {
    mockBookingService({ getMyBookingsAsCaretaker: vi.fn().mockResolvedValue(pageOf([booking({ status: "COMPLETED" })])) });
    mockCaretakerService();
    render(<BookingsPage />);

    await screen.findByText("Robert");
    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start Visit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark Complete" })).not.toBeInTheDocument();
  });

  it("shows the empty state when there are no bookings", async () => {
    mockBookingService({ getMyBookingsAsCaretaker: vi.fn().mockResolvedValue(pageOf([])) });
    mockCaretakerService();
    render(<BookingsPage />);

    expect(await screen.findByText("No bookings yet")).toBeInTheDocument();
  });
});
