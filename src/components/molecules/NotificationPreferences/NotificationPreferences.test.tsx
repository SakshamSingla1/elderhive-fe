import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NotificationPreferences from "./NotificationPreferences";
import { useNotificationPreferenceService } from "../../../services/useNotificationPreferenceService";
import { useWebPushSubscription } from "../../../hooks/useWebPushSubscription";
import { NotificationTypeEnum } from "../../../utils/enums";

vi.mock("../../../services/useNotificationPreferenceService", () => ({
  useNotificationPreferenceService: vi.fn(),
}));
vi.mock("../../../hooks/useWebPushSubscription", () => ({
  useWebPushSubscription: vi.fn(),
}));

const mockedUseNotificationPreferenceService = vi.mocked(useNotificationPreferenceService);
const mockedUseWebPushSubscription = vi.mocked(useWebPushSubscription);

const DEFAULT_PREFERENCES = [
  { type: NotificationTypeEnum.BOOKING, inAppEnabled: true, emailEnabled: false, smsEnabled: false, webPushEnabled: false },
  { type: NotificationTypeEnum.EMERGENCY, inAppEnabled: true, emailEnabled: true, smsEnabled: true, webPushEnabled: true },
];

function mockPush(overrides: Partial<ReturnType<typeof useWebPushSubscription>> = {}) {
  mockedUseWebPushSubscription.mockReturnValue({
    status: "unsubscribed",
    busy: false,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    ...overrides,
  });
}

describe("NotificationPreferences", () => {
  let getPreferences: ReturnType<typeof vi.fn>;
  let updatePreferences: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getPreferences = vi.fn().mockResolvedValue(DEFAULT_PREFERENCES);
    updatePreferences = vi.fn().mockResolvedValue(DEFAULT_PREFERENCES);
    mockedUseNotificationPreferenceService.mockReturnValue(
      { getPreferences, updatePreferences } as ReturnType<typeof useNotificationPreferenceService>
    );
    mockPush();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads and renders one row per notification type with its persisted toggle states", async () => {
    render(<NotificationPreferences />);

    expect(await screen.findByText("Bookings")).toBeInTheDocument();
    expect(screen.getByText("Emergency Alerts")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Emergency Alerts — Email" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "Bookings — Email" })).not.toBeChecked();
  });

  it("flipping a toggle saves immediately with only that one updated row", async () => {
    const user = userEvent.setup();
    render(<NotificationPreferences />);
    await screen.findByText("Bookings");

    await user.click(screen.getByRole("switch", { name: "Bookings — Email" }));

    await waitFor(() =>
      expect(updatePreferences).toHaveBeenCalledWith([
        { type: NotificationTypeEnum.BOOKING, inAppEnabled: true, emailEnabled: true, smsEnabled: false, webPushEnabled: false },
      ])
    );
    expect(screen.getByRole("switch", { name: "Bookings — Email" })).toBeChecked();
  });

  it("reverts the toggle and shows an error when the save fails", async () => {
    updatePreferences.mockRejectedValue({ response: { data: { message: "Could not save" } } });
    const user = userEvent.setup();
    render(<NotificationPreferences />);
    await screen.findByText("Bookings");

    await user.click(screen.getByRole("switch", { name: "Bookings — Email" }));

    expect(await screen.findByText("Could not save")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("switch", { name: "Bookings — Email" })).not.toBeChecked());
  });

  it("shows the push-enable button when unsubscribed and calls subscribe() on click", async () => {
    const subscribe = vi.fn();
    mockPush({ status: "unsubscribed", subscribe });
    const user = userEvent.setup();
    render(<NotificationPreferences />);
    await screen.findByText("Bookings");

    await user.click(screen.getByRole("button", { name: "Enable" }));
    expect(subscribe).toHaveBeenCalledTimes(1);
  });

  it("shows a disable button and the Enabled chip when already subscribed", async () => {
    mockPush({ status: "subscribed" });
    render(<NotificationPreferences />);
    await screen.findByText("Bookings");

    expect(screen.getByText("Enabled")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disable" })).toBeInTheDocument();
  });

  it("hides the enable/disable button entirely when push is unsupported", async () => {
    mockPush({ status: "unsupported" });
    render(<NotificationPreferences />);
    await screen.findByText("Bookings");

    expect(screen.queryByRole("button", { name: "Enable" })).not.toBeInTheDocument();
    expect(screen.getByText("Not supported")).toBeInTheDocument();
  });
});
