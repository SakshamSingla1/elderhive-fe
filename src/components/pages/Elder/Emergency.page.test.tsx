import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ElderEmergencyPage from "./Emergency.page";
import { useElderProfileService } from "../../../services/useElderProfileService";
import { useEmergencyAlertService } from "../../../services/useEmergencyAlertService";
import { DEFAULT_HOLD_DURATION_MS } from "../../molecules/EmergencyAlertButton/EmergencyAlertButton";
import { getCurrentCoordinates } from "../../../utils/helper";

vi.mock("../../../services/useElderProfileService", () => ({
  useElderProfileService: vi.fn(),
}));
vi.mock("../../../services/useEmergencyAlertService", () => ({
  useEmergencyAlertService: vi.fn(),
}));
vi.mock("../../../utils/helper", async () => {
  const actual = await vi.importActual<typeof import("../../../utils/helper")>("../../../utils/helper");
  return { ...actual, getCurrentCoordinates: vi.fn() };
});

const mockedUseElderProfileService = vi.mocked(useElderProfileService);
const mockedUseEmergencyAlertService = vi.mocked(useEmergencyAlertService);
const mockedGetCurrentCoordinates = vi.mocked(getCurrentCoordinates);

const COORDINATES = { latitude: 12.9716, longitude: 77.5946 };

async function holdTheButton() {
  const button = await screen.findByRole("button", { name: "SOS" });
  fireEvent.pointerDown(button);
  await act(async () => {
    vi.advanceTimersByTime(DEFAULT_HOLD_DURATION_MS);
  });
}

describe("Elder Emergency.page", () => {
  let getMyProfile: ReturnType<typeof vi.fn>;
  let trigger: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // shouldAdvanceTime keeps RTL's own setTimeout-based findBy/waitFor polling moving in
    // real wall-clock time, while vi.advanceTimersByTime below still deterministically
    // fast-forwards EmergencyAlertButton's own hold-confirm setTimeout - same convention
    // ElderProfileSearchAutocomplete.test.tsx already established for this exact mix.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getMyProfile = vi.fn().mockResolvedValue({ id: 7, fullName: "Robert" });
    trigger = vi.fn().mockResolvedValue({ id: 500, elderName: "Robert", status: "TRIGGERED" });
    mockedUseElderProfileService.mockReturnValue({ getMyProfile } as unknown as ReturnType<typeof useElderProfileService>);
    mockedUseEmergencyAlertService.mockReturnValue({ trigger } as unknown as ReturnType<typeof useEmergencyAlertService>);
    mockedGetCurrentCoordinates.mockResolvedValue(COORDINATES);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("warns instead of rendering the button when the elder has no profile yet", async () => {
    getMyProfile.mockRejectedValue({ response: { status: 404 } });
    render(<ElderEmergencyPage />);

    expect(await screen.findByText(/Complete your profile first/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "SOS" })).not.toBeInTheDocument();
  });

  it("triggers for the caller's own elderProfileId after a full hold, using a fresh GPS fix", async () => {
    render(<ElderEmergencyPage />);

    await holdTheButton();

    await waitFor(() => expect(trigger).toHaveBeenCalledWith({ elderProfileId: 7, latitude: 12.9716, longitude: 77.5946 }));
    expect(await screen.findByText("Help is on the way")).toBeInTheDocument();
  });

  it("falls back to the mount-time cached fix if the confirm-time GPS re-fetch fails", async () => {
    mockedGetCurrentCoordinates.mockResolvedValueOnce(COORDINATES); // the mount-time prefetch
    mockedGetCurrentCoordinates.mockRejectedValueOnce(new Error("timed out")); // the confirm-time re-fetch
    render(<ElderEmergencyPage />);
    await waitFor(() => expect(mockedGetCurrentCoordinates).toHaveBeenCalledTimes(1));

    await holdTheButton();

    await waitFor(() => expect(trigger).toHaveBeenCalledWith({ elderProfileId: 7, latitude: 12.9716, longitude: 77.5946 }));
  });

  it("shows a clear error and never calls trigger() when no location is available at all", async () => {
    mockedGetCurrentCoordinates.mockRejectedValue(new Error("denied"));
    render(<ElderEmergencyPage />);

    await holdTheButton();

    expect(await screen.findByText(/Location access is required/)).toBeInTheDocument();
    expect(trigger).not.toHaveBeenCalled();
  });

  it("shows the backend's error message and lets the user try again when trigger() fails", async () => {
    trigger.mockRejectedValue({ response: { data: { message: "You do not have access to trigger an emergency alert for this elder profile" } } });
    render(<ElderEmergencyPage />);

    await holdTheButton();

    expect(await screen.findByText("You do not have access to trigger an emergency alert for this elder profile")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "SOS" })).toBeInTheDocument();
  });

  it("lets the user send another alert after a successful one", async () => {
    render(<ElderEmergencyPage />);
    await holdTheButton();
    await screen.findByText("Help is on the way");

    fireEvent.click(screen.getByRole("button", { name: "Send another alert" }));

    expect(await screen.findByRole("button", { name: "SOS" })).toBeInTheDocument();
  });
});
