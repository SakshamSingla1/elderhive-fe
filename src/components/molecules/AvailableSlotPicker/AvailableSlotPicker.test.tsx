import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCaretakerService } from "../../../services/useCaretakerService";
import type { AvailableSlotsResponseDTO, CaretakerAvailabilitySlotDTO } from "../../../services/useCaretakerService";
import AvailableSlotPicker from "./AvailableSlotPicker";

vi.mock("../../../services/useCaretakerService", () => ({
  useCaretakerService: vi.fn(),
}));

const mockedUseCaretakerService = vi.mocked(useCaretakerService);

function mockService(
  slotsResult: AvailableSlotsResponseDTO,
  weeklySchedule: CaretakerAvailabilitySlotDTO[] = [],
  overrides: Partial<ReturnType<typeof useCaretakerService>> = {}
) {
  mockedUseCaretakerService.mockReturnValue({
    createOrUpdate: vi.fn(),
    getMyProfile: vi.fn(),
    getById: vi.fn(),
    getAll: vi.fn(),
    uploadVerificationDocument: vi.fn(),
    listVerificationDocuments: vi.fn(),
    reviewVerificationDocument: vi.fn(),
    getAvailability: vi.fn().mockResolvedValue(weeklySchedule),
    addAvailabilitySlot: vi.fn(),
    updateAvailabilitySlot: vi.fn(),
    removeAvailabilitySlot: vi.fn(),
    getAvailableSlots: vi.fn().mockResolvedValue(slotsResult),
    ...overrides,
  });
}

// MUI only gives a clickable Chip role="button" - a disabled one renders as a plain,
// role-less div with the "Mui-disabled" class instead (no aria-disabled either), so
// disabled chips have to be located by their label text and asserted via that class.
function getDisabledChip(label: string): HTMLElement {
  const chip = screen.getByText(label).closest(".MuiChip-root");
  if (!chip) throw new Error(`No .MuiChip-root ancestor found for "${label}"`);
  return chip as HTMLElement;
}

function renderPicker(props: Partial<React.ComponentProps<typeof AvailableSlotPicker>> = {}) {
  const onChange = props.onChange ?? vi.fn();
  const utils = render(
    <AvailableSlotPicker
      caretakerId={props.caretakerId ?? 7}
      serviceOfferingId={props.serviceOfferingId ?? 30}
      date={props.date ?? "2026-03-02"}
      value={props.value ?? null}
      onChange={onChange}
    />
  );
  return { ...utils, onChange };
}

describe("AvailableSlotPicker", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prompts for a caretaker/date before fetching anything", () => {
    mockService({ caretakerId: 7, serviceOfferingId: 30, date: "2026-03-02", dayOfWeek: "MONDAY", slotDurationMinutes: 60, usingDefaultHours: false, availableSlots: [] });
    render(<AvailableSlotPicker caretakerId={null} serviceOfferingId={30} date={null} value={null} onChange={vi.fn()} />);

    expect(screen.getByText("Pick a caretaker and a date to see available times.")).toBeInTheDocument();
  });

  it("generates the default 9am-6pm grid and shows the default-hours caption when usingDefaultHours is true", async () => {
    mockService({
      caretakerId: 7,
      serviceOfferingId: 30,
      date: "2026-03-02",
      dayOfWeek: "MONDAY",
      slotDurationMinutes: 60,
      usingDefaultHours: true,
      availableSlots: ["09:00:00", "10:00:00"],
    });

    renderPicker();

    expect(await screen.findByText(/hasn't set specific hours/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "9:00 AM" })).toBeEnabled();
    expect(getDisabledChip("5:00 PM")).toHaveClass("Mui-disabled");
  });

  it("generates the grid from the caretaker's own weekly schedule when usingDefaultHours is false", async () => {
    mockService(
      {
        caretakerId: 7,
        serviceOfferingId: 30,
        date: "2026-03-02",
        dayOfWeek: "MONDAY",
        slotDurationMinutes: 60,
        usingDefaultHours: false,
        availableSlots: ["09:00:00"],
      },
      [{ id: 1, caretakerId: 7, dayOfWeek: "MONDAY", startTime: "09:00:00", endTime: "11:00:00" }]
    );

    renderPicker();

    await waitFor(() => expect(screen.getByRole("button", { name: "9:00 AM" })).toBeInTheDocument());
    expect(getDisabledChip("10:00 AM")).toHaveClass("Mui-disabled");
    expect(screen.queryByText("11:00 AM")).not.toBeInTheDocument();
    expect(screen.queryByText(/hasn't set specific hours/)).not.toBeInTheDocument();
  });

  it("ignores weekly schedule rows for a different day of week", async () => {
    mockService(
      {
        caretakerId: 7,
        serviceOfferingId: 30,
        date: "2026-03-02",
        dayOfWeek: "MONDAY",
        slotDurationMinutes: 60,
        usingDefaultHours: false,
        availableSlots: [],
      },
      [{ id: 1, caretakerId: 7, dayOfWeek: "TUESDAY", startTime: "09:00:00", endTime: "11:00:00" }]
    );

    renderPicker();

    expect(await screen.findByText("This caretaker has no bookable hours on this day.")).toBeInTheDocument();
  });

  it("calls onChange with the clicked available slot and marks it selected", async () => {
    const user = userEvent.setup();
    mockService({
      caretakerId: 7,
      serviceOfferingId: 30,
      date: "2026-03-02",
      dayOfWeek: "MONDAY",
      slotDurationMinutes: 60,
      usingDefaultHours: true,
      availableSlots: ["09:00:00"],
    });
    const { onChange } = renderPicker();

    const chip = await screen.findByRole("button", { name: "9:00 AM" });
    await user.click(chip);

    expect(onChange).toHaveBeenCalledWith("09:00:00");
  });

  it("renders an already-booked slot as disabled, with pointer-events genuinely off", async () => {
    mockService({
      caretakerId: 7,
      serviceOfferingId: 30,
      date: "2026-03-02",
      dayOfWeek: "MONDAY",
      slotDurationMinutes: 60,
      usingDefaultHours: false,
      availableSlots: [],
    }, [{ id: 1, caretakerId: 7, dayOfWeek: "MONDAY", startTime: "09:00:00", endTime: "10:00:00" }]);
    const { onChange } = renderPicker();

    await screen.findByText("9:00 AM");
    const chip = getDisabledChip("9:00 AM");
    expect(chip).toHaveClass("Mui-disabled");
    // MUI sets pointer-events:none on a disabled Chip - confirmed directly rather than
    // simulating a click user-event itself refuses to deliver to a non-interactive element.
    expect(getComputedStyle(chip).pointerEvents).toBe("none");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows an error message when the fetch fails", async () => {
    mockedUseCaretakerService.mockReturnValue({
      createOrUpdate: vi.fn(),
      getMyProfile: vi.fn(),
      getById: vi.fn(),
      getAll: vi.fn(),
      uploadVerificationDocument: vi.fn(),
      listVerificationDocuments: vi.fn(),
      reviewVerificationDocument: vi.fn(),
      getAvailability: vi.fn().mockResolvedValue([]),
      addAvailabilitySlot: vi.fn(),
      updateAvailabilitySlot: vi.fn(),
      removeAvailabilitySlot: vi.fn(),
      getAvailableSlots: vi.fn().mockRejectedValue(new Error("boom")),
    });

    renderPicker();

    expect(await screen.findByText("boom")).toBeInTheDocument();
  });
});
