import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import dayjs from "dayjs";
import FamilyDashboardPage from "./Dashboard.page";
import { useElderProfileService, type ElderProfileResponseDTO } from "../../../services/useElderProfileService";
import { useBookingService, type BookingResponse } from "../../../services/useBookingService";
import { BookingStatusEnum } from "../../../utils/enums";

vi.mock("../../../services/useElderProfileService", () => ({
  useElderProfileService: vi.fn(),
}));
vi.mock("../../../services/useBookingService", () => ({
  useBookingService: vi.fn(),
}));

const mockedUseElderProfileService = vi.mocked(useElderProfileService);
const mockedUseBookingService = vi.mocked(useBookingService);

function pageOf<T>(content: T[]) {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    number: 0,
    size: 50,
    first: true,
    last: true,
    numberOfElements: content.length,
    empty: content.length === 0,
  };
}

function elderProfile(overrides: Partial<ElderProfileResponseDTO> = {}): ElderProfileResponseDTO {
  return {
    id: 1,
    familyUserId: 10,
    elderUserId: null,
    fullName: "Grandma Rosa",
    dateOfBirth: "1945-04-12",
    gender: null,
    medicalConditions: null,
    address: "221B Lotus Street",
    emergencyContactName: null,
    emergencyContactPhone: null,
    ...overrides,
  };
}

function booking(overrides: Partial<BookingResponse> = {}): BookingResponse {
  return {
    id: 1,
    familyUserId: 10,
    elderProfileId: 1,
    elderName: "Grandma Rosa",
    caretakerId: 5,
    caretakerName: "Cara Giver",
    caretakerUserId: 50,
    serviceOfferingId: 1,
    serviceName: "Hourly Visit",
    scheduledDate: dayjs().add(1, "day").format("YYYY-MM-DD"),
    scheduledTime: "10:00:00",
    status: BookingStatusEnum.CONFIRMED,
    cost: 20,
    notes: null,
    recurringGroupId: null,
    createdAt: "2026-10-01T00:00:00",
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <FamilyDashboardPage />
    </MemoryRouter>
  );
}

describe("Family Dashboard.page", () => {
  let getMine: ReturnType<typeof vi.fn>;
  let getMyBookingsAsFamily: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getMine = vi.fn().mockResolvedValue(pageOf([elderProfile()]));
    getMyBookingsAsFamily = vi.fn().mockResolvedValue(pageOf([booking()]));
    mockedUseElderProfileService.mockReturnValue({ getMine } as unknown as ReturnType<typeof useElderProfileService>);
    mockedUseBookingService.mockReturnValue({ getMyBookingsAsFamily } as unknown as ReturnType<typeof useBookingService>);
  });

  it("shows the elder profile and upcoming booking counts derived from the two lists", async () => {
    renderPage();

    expect(await screen.findByText("Grandma Rosa")).toBeInTheDocument();
    // Elder Profiles stat and Upcoming Bookings stat are both "1" here (one profile, one
    // CONFIRMED booking) - "This Week" may or may not also read "1" depending on where
    // the test's run date falls relative to dayjs' week boundary, so this only asserts a
    // lower bound rather than an exact count of "1"s on the page.
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("0")).toBeInTheDocument(); // Completed stat
    expect(screen.getByText("Hourly Visit")).toBeInTheDocument();
  });

  it("only counts PENDING/CONFIRMED/IN_PROGRESS bookings as upcoming, not COMPLETED/CANCELLED", async () => {
    getMyBookingsAsFamily.mockResolvedValue(
      pageOf([
        booking({ id: 1, status: BookingStatusEnum.COMPLETED }),
        booking({ id: 2, status: BookingStatusEnum.CANCELLED }),
        booking({ id: 3, status: BookingStatusEnum.CONFIRMED, serviceName: "Still Upcoming" }),
      ])
    );
    renderPage();

    expect(await screen.findByText("Still Upcoming")).toBeInTheDocument();
    // The COMPLETED/CANCELLED bookings share the default "Hourly Visit" service name -
    // its absence here confirms they were excluded from the upcoming list, not just that
    // the one CONFIRMED booking happened to render.
    expect(screen.queryByText("Hourly Visit")).not.toBeInTheDocument();
  });

  it("shows empty-state calls to action when there are no elder profiles or bookings", async () => {
    getMine.mockResolvedValue(pageOf([]));
    getMyBookingsAsFamily.mockResolvedValue(pageOf([]));
    renderPage();

    expect(await screen.findByText("No elder profiles yet.")).toBeInTheDocument();
    expect(screen.getByText("No upcoming bookings yet.")).toBeInTheDocument();
    // "Add Elder Profile"/"Book a Service" each appear twice (the quick-action card and
    // the empty-state call-to-action chip) - asserting there are two confirms both render.
    expect(screen.getAllByText("Add Elder Profile")).toHaveLength(2);
    expect(screen.getAllByText("Book a Service")).toHaveLength(2);
  });

  it("shows an error alert when loading fails", async () => {
    getMine.mockRejectedValue(new Error("network down"));
    renderPage();

    await waitFor(() => expect(screen.getByText("network down")).toBeInTheDocument());
  });
});
