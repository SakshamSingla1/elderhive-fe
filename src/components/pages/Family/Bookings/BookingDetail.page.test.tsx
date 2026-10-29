import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBookingService } from "../../../../services/useBookingService";
import type { BookingResponse } from "../../../../services/useBookingService";
import { useReviewService } from "../../../../services/useReviewService";
import { useMessagingService } from "../../../../services/useMessagingService";
import { usePresenceService } from "../../../../services/usePresenceService";
import { usePaymentService } from "../../../../services/usePaymentService";
import { useWebSocket } from "../../../../contexts/WebSocketContext";
import BookingDetailPage from "./BookingDetail.page";

vi.mock("../../../../services/useBookingService", () => ({
  useBookingService: vi.fn(),
}));
vi.mock("../../../../services/useReviewService", () => ({
  useReviewService: vi.fn(),
}));
vi.mock("../../../../services/useMessagingService", () => ({
  useMessagingService: vi.fn(),
}));
vi.mock("../../../../services/usePresenceService", () => ({
  usePresenceService: vi.fn(),
}));
vi.mock("../../../../services/usePaymentService", () => ({
  usePaymentService: vi.fn(),
}));
vi.mock("../../../../contexts/WebSocketContext", () => ({
  useWebSocket: vi.fn(),
}));
// Avoids a real Stripe.js CDN fetch (getStripe) and real Stripe Elements rendering in
// jsdom - the Pay Now flow's own tests below only care that the right props reach this
// component, not Stripe's own checkout UI (that's CheckoutPaymentForm's own test's job).
vi.mock("../../../../utils/stripeClient", () => ({
  isStripeConfigured: true,
  getStripe: vi.fn().mockResolvedValue(null),
}));
vi.mock("../../../molecules/Payment/CheckoutPaymentForm", () => ({
  default: ({ onSuccess }: { clientSecret: string; onSuccess: () => void }) => (
    <button onClick={onSuccess}>mock-checkout-success</button>
  ),
}));

const mockedUseBookingService = vi.mocked(useBookingService);
const mockedUseReviewService = vi.mocked(useReviewService);
const mockedUseMessagingService = vi.mocked(useMessagingService);
const mockedUsePresenceService = vi.mocked(usePresenceService);
const mockedUsePaymentService = vi.mocked(usePaymentService);
const mockedUseWebSocket = vi.mocked(useWebSocket);

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

function mockMessagingService(overrides: Partial<ReturnType<typeof useMessagingService>> = {}) {
  const service = {
    getOrCreateConversation: vi.fn().mockResolvedValue({ id: 50 }),
    getMyConversations: vi.fn(),
    getMessages: vi.fn(),
    markRead: vi.fn(),
    ...overrides,
  };
  mockedUseMessagingService.mockReturnValue(service);
  return service;
}

function mockPresenceService(getStatus: ReturnType<typeof vi.fn> = vi.fn().mockResolvedValue({ "200": false })) {
  mockedUsePresenceService.mockReturnValue({ getStatus } as unknown as ReturnType<typeof usePresenceService>);
  return getStatus;
}

function mockPaymentService(overrides: Partial<ReturnType<typeof usePaymentService>> = {}) {
  const service = {
    createIntent: vi.fn().mockResolvedValue({ paymentId: 500, clientSecret: "secret_123", amount: 40, currency: "usd" }),
    getById: vi.fn(),
    getByBooking: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
  mockedUsePaymentService.mockReturnValue(service);
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
    mockMessagingService();
    mockPresenceService();
    mockPaymentService();
    mockedUseWebSocket.mockReturnValue({ connected: true, subscribe: vi.fn(() => () => {}), publish: vi.fn() });
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

  it("shows the caretaker's presence from the initial snapshot", async () => {
    mockService();
    mockPresenceService(vi.fn().mockResolvedValue({ "200": true }));
    renderPage();

    expect(await screen.findByText("Online")).toBeInTheDocument();
  });

  it("updates the caretaker's presence live from a /topic/presence event", async () => {
    let presenceCallback: ((frame: { body: string }) => void) | null = null;
    mockService();
    mockedUseWebSocket.mockReturnValue({
      connected: true,
      subscribe: vi.fn((_, cb) => {
        presenceCallback = cb;
        return () => {};
      }),
      publish: vi.fn(),
    });
    renderPage();

    expect(await screen.findByText("Offline")).toBeInTheDocument();
    presenceCallback!({ body: JSON.stringify({ userId: 200, online: true }) });

    expect(await screen.findByText("Online")).toBeInTheDocument();
  });

  it("starting a conversation from Message Caretaker navigates to the thread", async () => {
    const user = userEvent.setup();
    mockService();
    const messaging = mockMessagingService({ getOrCreateConversation: vi.fn().mockResolvedValue({ id: 77 }) });
    render(
      <MemoryRouter initialEntries={["/family/bookings/1"]}>
        <Routes>
          <Route path="/family/bookings/:id" element={<BookingDetailPage />} />
          <Route path="/family/messages" element={<div>messages page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await user.click(await screen.findByRole("button", { name: "Message Caretaker" }));

    expect(messaging.getOrCreateConversation).toHaveBeenCalledWith({ otherUserId: 200, bookingId: 1 });
    expect(await screen.findByText("messages page")).toBeInTheDocument();
  });

  it("shows an error if starting a conversation fails", async () => {
    const user = userEvent.setup();
    mockService();
    mockMessagingService({ getOrCreateConversation: vi.fn().mockRejectedValue(new Error("Could not reach that user")) });
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Message Caretaker" }));

    expect(await screen.findByText("Could not reach that user")).toBeInTheDocument();
  });

  it("offers Pay Now for a CONFIRMED booking with no payment yet", async () => {
    mockService({ getById: vi.fn().mockResolvedValue(booking({ status: "CONFIRMED" })) });
    renderPage();

    expect(await screen.findByRole("button", { name: "Pay Now" })).toBeInTheDocument();
  });

  it("never offers Pay Now for a booking that isn't CONFIRMED", async () => {
    mockService();
    renderPage();

    await screen.findByText("Booking Details");
    expect(screen.queryByRole("button", { name: /Pay Now/ })).not.toBeInTheDocument();
  });

  it("shows a payment status chip and hides Pay Now once the payment has SUCCEEDED", async () => {
    mockService({ getById: vi.fn().mockResolvedValue(booking({ status: "CONFIRMED" })) });
    mockPaymentService({
      getByBooking: vi.fn().mockResolvedValue([{ id: 5, bookingId: 1, amount: 40, currency: "usd", status: "SUCCEEDED" }]),
    });
    renderPage();

    expect(await screen.findByText("Succeeded")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Pay Now/ })).not.toBeInTheDocument();
  });

  it("offers Retry Payment (not Pay Now) once the latest attempt has FAILED", async () => {
    mockService({ getById: vi.fn().mockResolvedValue(booking({ status: "CONFIRMED" })) });
    mockPaymentService({
      getByBooking: vi.fn().mockResolvedValue([{ id: 5, bookingId: 1, amount: 40, currency: "usd", status: "FAILED" }]),
    });
    renderPage();

    expect(await screen.findByRole("button", { name: "Retry Payment" })).toBeInTheDocument();
  });

  it("starts a checkout on Pay Now and refreshes the payment status once Stripe confirms", async () => {
    const user = userEvent.setup();
    mockService({ getById: vi.fn().mockResolvedValue(booking({ status: "CONFIRMED" })) });
    const getByBooking = vi.fn().mockResolvedValue([]);
    const payments = mockPaymentService({ getByBooking });
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Pay Now" }));

    expect(payments.createIntent).toHaveBeenCalledWith(1);
    const checkoutButton = await screen.findByRole("button", { name: "mock-checkout-success" });

    getByBooking.mockClear();
    await user.click(checkoutButton);

    expect(await screen.findByText(/Payment submitted/)).toBeInTheDocument();
    await waitFor(() => expect(getByBooking).toHaveBeenCalledWith(1));
  });

  it("shows an error when starting checkout fails", async () => {
    const user = userEvent.setup();
    mockService({ getById: vi.fn().mockResolvedValue(booking({ status: "CONFIRMED" })) });
    mockPaymentService({ createIntent: vi.fn().mockRejectedValue(new Error("Only a CONFIRMED booking can be paid for")) });
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Pay Now" }));

    expect(await screen.findByText("Only a CONFIRMED booking can be paid for")).toBeInTheDocument();
  });
});
