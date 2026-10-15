import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMetaConfigService } from "../../../services/useMetaConfigService";
import PlatformSettingsPage from "./PlatformSettings.page";

vi.mock("../../../services/useMetaConfigService", () => ({
  useMetaConfigService: vi.fn(),
}));

const mockedUseMetaConfigService = vi.mocked(useMetaConfigService);

const EMERGENCY_SETTINGS = {
  id: 1,
  context: "EMERGENCY_SETTINGS",
  data: '{"searchRadiusKm":10,"escalationTimeoutMinutes":15}',
  updatedAt: "2026-10-15T10:00:00",
  updatedBy: null,
};

const PLATFORM_SETTINGS = {
  id: 2,
  context: "PLATFORM_SETTINGS",
  data: '{"platformName":"ElderHive","supportEmail":"support@elderhive.app","supportPhone":"+1-800-555-0100"}',
  updatedAt: "2026-10-15T10:00:00",
  updatedBy: null,
};

function mockService(overrides: Partial<ReturnType<typeof useMetaConfigService>> = {}) {
  const service = {
    list: vi.fn().mockResolvedValue([EMERGENCY_SETTINGS, PLATFORM_SETTINGS]),
    get: vi.fn(),
    upsert: vi.fn(),
    remove: vi.fn(),
    ...overrides,
  };
  mockedUseMetaConfigService.mockReturnValue(service);
  return service;
}

describe("PlatformSettings.page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("lists every context the backend actually returns, pretty-printed", async () => {
    mockService();
    render(<PlatformSettingsPage />);

    expect(await screen.findByText("EMERGENCY_SETTINGS")).toBeInTheDocument();
    expect(screen.getByText("PLATFORM_SETTINGS")).toBeInTheDocument();

    const textareas = screen.getAllByRole("textbox");
    expect(textareas[0]).toHaveValue(JSON.stringify(JSON.parse(EMERGENCY_SETTINGS.data), null, 2));
  });

  it("shows an info message when no contexts exist yet", async () => {
    mockService({ list: vi.fn().mockResolvedValue([]) });
    render(<PlatformSettingsPage />);

    expect(await screen.findByText("No configuration contexts exist yet.")).toBeInTheDocument();
  });

  it("shows an error message when the initial load fails", async () => {
    mockService({ list: vi.fn().mockRejectedValue(new Error("Network Error")) });
    render(<PlatformSettingsPage />);

    expect(await screen.findByText("Network Error")).toBeInTheDocument();
  });

  it("rejects invalid JSON locally without calling upsert", async () => {
    const user = userEvent.setup();
    const service = mockService();
    render(<PlatformSettingsPage />);

    const textarea = await screen.findByDisplayValue(/searchRadiusKm/);
    await user.clear(textarea);
    await user.type(textarea, "{{ not valid json");
    await user.click(screen.getAllByRole("button", { name: "Save" })[0]);

    expect(await screen.findByText("Invalid JSON — please fix before saving.")).toBeInTheDocument();
    expect(service.upsert).not.toHaveBeenCalled();
  });

  it("saves valid (re-formatted) JSON and shows a success message", async () => {
    const user = userEvent.setup();
    const updated = { ...EMERGENCY_SETTINGS, data: '{"searchRadiusKm":20,"escalationTimeoutMinutes":15}' };
    const service = mockService({ upsert: vi.fn().mockResolvedValue(updated) });
    render(<PlatformSettingsPage />);

    const textarea = await screen.findByDisplayValue(/searchRadiusKm/);
    await user.clear(textarea);
    await user.type(textarea, '{{"searchRadiusKm": 20, "escalationTimeoutMinutes": 15}');
    await user.click(screen.getAllByRole("button", { name: "Save" })[0]);

    await waitFor(() =>
      expect(service.upsert).toHaveBeenCalledWith("EMERGENCY_SETTINGS", {
        data: JSON.stringify({ searchRadiusKm: 20, escalationTimeoutMinutes: 15 }),
      })
    );
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
  });

  it("shows the backend's error message when save fails", async () => {
    const user = userEvent.setup();
    mockService({ upsert: vi.fn().mockRejectedValue({ response: { data: { message: "You do not have permission to perform this action." } } }) });
    render(<PlatformSettingsPage />);

    await screen.findByDisplayValue(/searchRadiusKm/);
    await user.click(screen.getAllByRole("button", { name: "Save" })[0]);

    expect(await screen.findByText("You do not have permission to perform this action.")).toBeInTheDocument();
  });
});
