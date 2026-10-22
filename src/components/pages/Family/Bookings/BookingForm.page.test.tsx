import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useBookingService } from "../../../../services/useBookingService";
import { useServiceOfferingService } from "../../../../services/useServiceOfferingService";
import type { ServiceOfferingResponse } from "../../../../services/useServiceOfferingService";
import BookingFormPage from "./BookingForm.page";

vi.mock("../../../../services/useBookingService", () => ({
  useBookingService: vi.fn(),
}));
vi.mock("../../../../services/useServiceOfferingService", () => ({
  useServiceOfferingService: vi.fn(),
}));
vi.mock("../../../molecules/CaretakerSearchAutocomplete/CaretakerSearchAutocomplete", () => ({
  default: ({ onSelect }: { onSelect: (v: { id: number; name: string } | null) => void }) => (
    <button onClick={() => onSelect({ id: 20, name: "Jane Caretaker" })}>pick caretaker</button>
  ),
}));
vi.mock("../../../molecules/ElderProfileSearchAutocomplete/ElderProfileSearchAutocomplete", () => ({
  default: ({ onSelect }: { onSelect: (v: { id: number; name: string } | null) => void }) => (
    <button onClick={() => onSelect({ id: 10, name: "Robert" })}>pick elder</button>
  ),
}));
vi.mock("../../../molecules/AvailableSlotPicker/AvailableSlotPicker", () => ({
  default: ({ onChange }: { onChange: (time: string) => void }) => <button onClick={() => onChange("09:00:00")}>pick slot</button>,
}));

const mockedUseBookingService = vi.mocked(useBookingService);
const mockedUseServiceOfferingService = vi.mocked(useServiceOfferingService);

const offering: ServiceOfferingResponse = {
  id: 30,
  name: "Weekly Temple Visit",
  categoryId: 1,
  categoryName: "Temple Visit",
  basePrice: 40,
  durationMinutes: 60,
  status: "ACTIVE",
};

function mockServices(overrides: { create?: ReturnType<typeof vi.fn> } = {}) {
  mockedUseServiceOfferingService.mockReturnValue({
    getServiceOfferings: vi.fn(),
    getServiceOfferingById: vi.fn().mockResolvedValue(offering),
    createServiceOffering: vi.fn(),
    updateServiceOffering: vi.fn(),
    deleteServiceOffering: vi.fn(),
  });
  mockedUseBookingService.mockReturnValue({
    create: overrides.create ?? vi.fn().mockResolvedValue({ id: 99 }),
    getById: vi.fn(),
    confirm: vi.fn(),
    start: vi.fn(),
    complete: vi.fn(),
    cancel: vi.fn(),
    getMyBookingsAsFamily: vi.fn(),
    getMyBookingsAsCaretaker: vi.fn(),
    getRecurringGroup: vi.fn(),
  });
}

function renderPage(initialEntry = "/family/bookings/new?serviceOfferingId=30") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/family/bookings/new" element={<BookingFormPage />} />
        <Route path="/family/bookings/:id" element={<div>booking detail page</div>} />
        <Route path="/family/services" element={<div>browse services page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("BookingForm.page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prompts to pick a service first when no serviceOfferingId is in the URL", () => {
    mockServices();
    renderPage("/family/bookings/new");

    expect(screen.getByText(/Pick a service to book/)).toBeInTheDocument();
  });

  it("loads and displays the service offering from the query param", async () => {
    mockServices();
    renderPage();

    expect(await screen.findByText("Book Weekly Temple Visit")).toBeInTheDocument();
    expect(screen.getByText("$40")).toBeInTheDocument();
    expect(screen.getByText("60 min")).toBeInTheDocument();
  });

  it("shows an error state when the offering fails to load", async () => {
    mockServices();
    mockedUseServiceOfferingService.mockReturnValue({
      getServiceOfferings: vi.fn(),
      getServiceOfferingById: vi.fn().mockRejectedValue(new Error("not found")),
      createServiceOffering: vi.fn(),
      updateServiceOffering: vi.fn(),
      deleteServiceOffering: vi.fn(),
    });
    renderPage();

    expect(await screen.findByText("not found")).toBeInTheDocument();
  });

  it("submits a one-off booking with the picked elder/caretaker/date/slot and navigates to its detail page", async () => {
    const user = userEvent.setup();
    const create = vi.fn().mockResolvedValue({ id: 99 });
    mockServices({ create });
    renderPage();

    await screen.findByText("Book Weekly Temple Visit");
    await user.click(screen.getByRole("button", { name: "pick elder" }));
    await user.click(screen.getByRole("button", { name: "pick caretaker" }));
    await user.type(screen.getByLabelText("Date"), "2026-03-02");
    await user.click(screen.getByRole("button", { name: "pick slot" }));
    await user.click(screen.getByRole("button", { name: "Confirm Booking" }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          elderProfileId: 10,
          caretakerId: 20,
          serviceOfferingId: 30,
          scheduledDate: "2026-03-02",
          scheduledTime: "09:00:00",
          recurring: false,
        })
      )
    );
    expect(await screen.findByText("booking detail page")).toBeInTheDocument();
  });

  it("resets the picked slot when the caretaker or date changes", async () => {
    const user = userEvent.setup();
    mockServices();
    renderPage();

    await screen.findByText("Book Weekly Temple Visit");
    await user.click(screen.getByRole("button", { name: "pick slot" }));
    await user.click(screen.getByRole("button", { name: "pick caretaker" }));

    // The slot picker re-renders fresh (its own test file covers the reset itself showing
    // no pre-selected value) - here we confirm the form won't submit without re-picking.
    await user.click(screen.getByRole("button", { name: "pick elder" }));
    await user.type(screen.getByLabelText("Date"), "2026-03-02");
    await user.click(screen.getByRole("button", { name: "Confirm Booking" }));

    expect(await screen.findByText("Pick an available time")).toBeInTheDocument();
  });

  it("reveals the occurrences field when Repeat weekly is checked and sends recurring+occurrences on submit", async () => {
    const user = userEvent.setup();
    const create = vi.fn().mockResolvedValue({ id: 99 });
    mockServices({ create });
    renderPage();

    await screen.findByText("Book Weekly Temple Visit");
    await user.click(screen.getByRole("button", { name: "pick elder" }));
    await user.click(screen.getByRole("button", { name: "pick caretaker" }));
    await user.type(screen.getByLabelText("Date"), "2026-03-02");
    await user.click(screen.getByRole("button", { name: "pick slot" }));
    await user.click(screen.getByLabelText("Repeat weekly"));
    await user.type(screen.getByLabelText("Number of weeks"), "4");
    await user.click(screen.getByRole("button", { name: "Book Recurring Series" }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(expect.objectContaining({ recurring: true, occurrences: 4 }))
    );
  });

  it("shows the backend's error message and stays on the page when creation fails", async () => {
    const user = userEvent.setup();
    const create = vi.fn().mockRejectedValue({ response: { data: { message: "Slot no longer available" } } });
    mockServices({ create });
    renderPage();

    await screen.findByText("Book Weekly Temple Visit");
    await user.click(screen.getByRole("button", { name: "pick elder" }));
    await user.click(screen.getByRole("button", { name: "pick caretaker" }));
    await user.type(screen.getByLabelText("Date"), "2026-03-02");
    await user.click(screen.getByRole("button", { name: "pick slot" }));
    await user.click(screen.getByRole("button", { name: "Confirm Booking" }));

    expect(await screen.findByText("Slot no longer available")).toBeInTheDocument();
    expect(screen.queryByText("booking detail page")).not.toBeInTheDocument();
  });
});
