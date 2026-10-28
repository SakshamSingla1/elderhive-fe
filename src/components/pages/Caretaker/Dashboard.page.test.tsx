import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import dayjs from "dayjs";
import CaretakerDashboardPage from "./Dashboard.page";
import { useCaretakerService, type CaretakerProfileResponseDTO } from "../../../services/useCaretakerService";
import { useBookingService, type BookingResponse } from "../../../services/useBookingService";
import { useEmergencyAlertService, type EmergencyAlertResponse } from "../../../services/useEmergencyAlertService";
import { BookingStatusEnum, CaretakerVerificationStatusEnum, EmergencyAlertStatusEnum } from "../../../utils/enums";

vi.mock("../../../services/useCaretakerService", () => ({
  useCaretakerService: vi.fn(),
}));
vi.mock("../../../services/useBookingService", () => ({
  useBookingService: vi.fn(),
}));
vi.mock("../../../services/useEmergencyAlertService", () => ({
  useEmergencyAlertService: vi.fn(),
}));

const mockedUseCaretakerService = vi.mocked(useCaretakerService);
const mockedUseBookingService = vi.mocked(useBookingService);
const mockedUseEmergencyAlertService = vi.mocked(useEmergencyAlertService);

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

function caretakerProfile(overrides: Partial<CaretakerProfileResponseDTO> = {}): CaretakerProfileResponseDTO {
  return {
    id: 1,
    userId: 50,
    fullName: "Cara Giver",
    email: "cara@example.com",
    phone: null,
    bio: null,
    specialties: [],
    yearsOfExperience: 5,
    hourlyRate: 18,
    ratingAverage: 4.5,
    verificationStatus: CaretakerVerificationStatusEnum.VERIFIED,
    profilePhotoFileAssetId: null,
    latitude: null,
    longitude: null,
    serviceRadiusKm: null,
    ...overrides,
  };
}

function booking(overrides: Partial<BookingResponse> = {}): BookingResponse {
  return {
    id: 1,
    familyUserId: 10,
    elderProfileId: 1,
    elderName: "Grandma Rosa",
    caretakerId: 1,
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

function alert(overrides: Partial<EmergencyAlertResponse> = {}): EmergencyAlertResponse {
  return {
    id: 1,
    elderProfileId: 1,
    elderName: "Grandpa Leo",
    triggeredByUserId: 20,
    latitude: 40.0,
    longitude: -75.0,
    address: "88 Maple Ave",
    status: EmergencyAlertStatusEnum.TRIGGERED,
    respondingCaretakerId: null,
    respondingCaretakerName: null,
    responseTimeSeconds: null,
    isOverdue: false,
    distanceKm: 2.3,
    createdAt: "2026-10-28T00:00:00",
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <CaretakerDashboardPage />
    </MemoryRouter>
  );
}

describe("Caretaker Dashboard.page", () => {
  let getMyProfile: ReturnType<typeof vi.fn>;
  let getMyBookingsAsCaretaker: ReturnType<typeof vi.fn>;
  let getNearby: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getMyProfile = vi.fn().mockResolvedValue(caretakerProfile());
    getMyBookingsAsCaretaker = vi.fn().mockResolvedValue(pageOf([booking()]));
    getNearby = vi.fn().mockResolvedValue([]);
    mockedUseCaretakerService.mockReturnValue({ getMyProfile } as unknown as ReturnType<typeof useCaretakerService>);
    mockedUseBookingService.mockReturnValue({ getMyBookingsAsCaretaker } as unknown as ReturnType<typeof useBookingService>);
    mockedUseEmergencyAlertService.mockReturnValue({ getNearby } as unknown as ReturnType<typeof useEmergencyAlertService>);
  });

  it("shows the rating and upcoming booking once loaded, with no verification banner when already verified", async () => {
    renderPage();

    expect(await screen.findByText("Hourly Visit")).toBeInTheDocument();
    expect(screen.getByText("4.5")).toBeInTheDocument();
    expect(screen.queryByText(/pending verification/)).not.toBeInTheDocument();
  });

  it("shows a pending-verification banner when the caretaker isn't verified yet", async () => {
    getMyProfile.mockResolvedValue(caretakerProfile({ verificationStatus: CaretakerVerificationStatusEnum.PENDING }));
    renderPage();

    expect(await screen.findByText(/won't be matched to bookings or emergency alerts/)).toBeInTheDocument();
  });

  it("shows a rejected-specific message when verification was rejected", async () => {
    getMyProfile.mockResolvedValue(caretakerProfile({ verificationStatus: CaretakerVerificationStatusEnum.REJECTED }));
    renderPage();

    expect(await screen.findByText(/were rejected/)).toBeInTheDocument();
  });

  it("surfaces nearby active emergency alerts prominently", async () => {
    getNearby.mockResolvedValue([alert()]);
    renderPage();

    expect(await screen.findByText("1 Active Emergency Alert Nearby")).toBeInTheDocument();
    expect(screen.getByText("Grandpa Leo")).toBeInTheDocument();
    expect(screen.getByText("2.3 km away")).toBeInTheDocument();
  });

  it("shows an error alert when loading fails", async () => {
    getMyProfile.mockRejectedValue(new Error("network down"));
    renderPage();

    await waitFor(() => expect(screen.getByText("network down")).toBeInTheDocument());
  });
});
