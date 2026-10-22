import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FamilyEmergencyPage from "./Emergency.page";
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

function pageOf(content: { id: number; fullName: string }[]) {
  return { content, totalElements: content.length, totalPages: 1, number: 0, size: 50, first: true, last: true, numberOfElements: content.length, empty: content.length === 0 };
}

async function holdTheButton() {
  const button = await screen.findByRole("button", { name: "SOS" });
  fireEvent.pointerDown(button);
  await act(async () => {
    vi.advanceTimersByTime(DEFAULT_HOLD_DURATION_MS);
  });
}

describe("Family Emergency.page", () => {
  let getMine: ReturnType<typeof vi.fn>;
  let trigger: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    trigger = vi.fn().mockResolvedValue({ id: 500, elderName: "Robert", status: "TRIGGERED" });
    mockedUseEmergencyAlertService.mockReturnValue({ trigger } as unknown as ReturnType<typeof useEmergencyAlertService>);
    mockedGetCurrentCoordinates.mockResolvedValue(COORDINATES);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function mockElderProfiles(content: { id: number; fullName: string }[]) {
    getMine = vi.fn().mockResolvedValue(pageOf(content));
    mockedUseElderProfileService.mockReturnValue({ getMine } as unknown as ReturnType<typeof useElderProfileService>);
  }

  it("warns instead of rendering the button when the family member has no elder profiles yet", async () => {
    mockElderProfiles([]);
    render(<FamilyEmergencyPage />);

    expect(await screen.findByText(/Add an elder profile first/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "SOS" })).not.toBeInTheDocument();
  });

  it("auto-selects the only elder profile with no picker shown, and triggers for them", async () => {
    mockElderProfiles([{ id: 7, fullName: "Robert" }]);
    render(<FamilyEmergencyPage />);

    await screen.findByRole("button", { name: "SOS" });
    expect(screen.queryByLabelText("Who needs help?")).not.toBeInTheDocument();

    await holdTheButton();

    await waitFor(() => expect(trigger).toHaveBeenCalledWith({ elderProfileId: 7, latitude: 12.9716, longitude: 77.5946 }));
    expect(await screen.findByText(/Robert/)).toBeInTheDocument();
  });

  it("requires picking an elder when managing more than one, and disables the button until one is chosen", async () => {
    mockElderProfiles([
      { id: 7, fullName: "Robert" },
      { id: 8, fullName: "Grandma Rose" },
    ]);
    const user = userEvent.setup({ delay: null });
    render(<FamilyEmergencyPage />);

    const button = await screen.findByRole("button", { name: "SOS" });
    expect(button).toBeDisabled();

    await user.click(screen.getByLabelText("Who needs help?"));
    await user.click(await screen.findByRole("option", { name: "Grandma Rose" }));

    expect(screen.getByRole("button", { name: "SOS" })).not.toBeDisabled();

    await holdTheButton();

    await waitFor(() => expect(trigger).toHaveBeenCalledWith({ elderProfileId: 8, latitude: 12.9716, longitude: 77.5946 }));
  });

  it("shows a clear error and never calls trigger() when no location is available at all", async () => {
    mockElderProfiles([{ id: 7, fullName: "Robert" }]);
    mockedGetCurrentCoordinates.mockRejectedValue(new Error("denied"));
    render(<FamilyEmergencyPage />);

    await holdTheButton();

    expect(await screen.findByText(/Location access is required/)).toBeInTheDocument();
    expect(trigger).not.toHaveBeenCalled();
  });
});
