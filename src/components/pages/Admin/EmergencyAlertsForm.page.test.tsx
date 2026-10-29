import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEmergencyAlertService } from "../../../services/useEmergencyAlertService";
import type { EmergencyAlertResponse } from "../../../services/useEmergencyAlertService";
import EmergencyAlertsFormPage from "./EmergencyAlertsForm.page";

vi.mock("../../../services/useEmergencyAlertService", () => ({
  useEmergencyAlertService: vi.fn(),
}));
vi.mock("../../molecules/CaretakerSearchAutocomplete/CaretakerSearchAutocomplete", () => ({
  default: ({ onSelect }: { onSelect: (v: { id: number; name: string } | null) => void }) => (
    <button onClick={() => onSelect({ id: 31, name: "Jane Caretaker" })}>pick caretaker</button>
  ),
}));

const mockedUseEmergencyAlertService = vi.mocked(useEmergencyAlertService);

const existingAlert: EmergencyAlertResponse = {
  id: 7,
  elderProfileId: 10,
  elderName: "Robert",
  triggeredByUserId: 1,
  latitude: 12.9716,
  longitude: 77.5946,
  address: "MG Road, Bengaluru",
  status: "TRIGGERED",
  respondingCaretakerId: null,
  respondingCaretakerName: null,
  responseTimeSeconds: null,
  isOverdue: false,
  distanceKm: null,
  createdAt: "2026-10-22T10:00:00",
};

function mockService(overrides: Partial<ReturnType<typeof useEmergencyAlertService>> = {}) {
  const service = {
    trigger: vi.fn(),
    getNearby: vi.fn(),
    claim: vi.fn(),
    resolve: vi.fn(),
    getAll: vi.fn(),
    getById: vi.fn().mockResolvedValue(existingAlert),
    dispatchOverride: vi.fn().mockResolvedValue({ ...existingAlert, status: "RESOLVED" }),
    ...overrides,
  };
  mockedUseEmergencyAlertService.mockReturnValue(service);
  return service;
}

function renderPage(id = "7") {
  return render(
    <MemoryRouter initialEntries={[`/admin/emergency-alerts/${id}`]}>
      <Routes>
        <Route path="/admin/emergency-alerts/:id" element={<EmergencyAlertsFormPage />} />
        <Route path="/admin/emergency-alerts" element={<div>emergency alerts listing page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Admin EmergencyAlertsForm.page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads and displays the alert's read-only context", async () => {
    mockService();
    renderPage();

    expect(await screen.findByText("Alert #7")).toBeInTheDocument();
    expect(screen.getByText("Robert")).toBeInTheDocument();
    expect(screen.getByText("MG Road, Bengaluru")).toBeInTheDocument();
    expect(screen.getByText("Nobody yet")).toBeInTheDocument();
  });

  it("shows an error if loading the alert fails", async () => {
    mockService({ getById: vi.fn().mockRejectedValue(new Error("not found")) });
    renderPage();

    expect(await screen.findByText("not found")).toBeInTheDocument();
  });

  it("reassigning picks a caretaker, calls dispatchOverride with respondingCaretakerId only, and navigates back", async () => {
    const user = userEvent.setup();
    const service = mockService();
    renderPage();

    await screen.findByText("Alert #7");
    await user.click(screen.getByText("pick caretaker"));
    await user.click(screen.getByRole("button", { name: "Reassign" }));

    await waitFor(() => expect(service.dispatchOverride).toHaveBeenCalledWith(7, { respondingCaretakerId: 31 }));
    expect(await screen.findByText("emergency alerts listing page")).toBeInTheDocument();
  });

  it("the Reassign button stays disabled until a caretaker is picked", async () => {
    mockService();
    renderPage();

    await screen.findByText("Alert #7");
    expect(screen.getByRole("button", { name: "Reassign" })).toBeDisabled();
  });

  it("force-resolving after confirmation calls dispatchOverride with forceResolve only", async () => {
    const user = userEvent.setup();
    const service = mockService();
    renderPage();

    await screen.findByText("Alert #7");
    await user.click(screen.getByRole("button", { name: "Force Resolve" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Force-resolve this alert?")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Force Resolve" }));

    await waitFor(() => expect(service.dispatchOverride).toHaveBeenCalledWith(7, { forceResolve: true }));
    expect(await screen.findByText("emergency alerts listing page")).toBeInTheDocument();
  });

  it("force-resolve does nothing if the confirmation is declined", async () => {
    const user = userEvent.setup();
    const service = mockService();
    renderPage();

    await screen.findByText("Alert #7");
    await user.click(screen.getByRole("button", { name: "Force Resolve" }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(service.dispatchOverride).not.toHaveBeenCalled();
  });

  it("hides the override actions once an alert is already RESOLVED", async () => {
    mockService({ getById: vi.fn().mockResolvedValue({ ...existingAlert, status: "RESOLVED" }) });
    renderPage();

    await screen.findByText("Alert #7");
    expect(screen.queryByRole("button", { name: "Force Resolve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reassign" })).not.toBeInTheDocument();
  });

  it("shows the backend's error message and stays on the page when the override fails", async () => {
    const user = userEvent.setup();
    mockService({ dispatchOverride: vi.fn().mockRejectedValue({ response: { data: { message: "Not authorized" } } }) });
    renderPage();

    await screen.findByText("Alert #7");
    await user.click(screen.getByRole("button", { name: "Force Resolve" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Force Resolve" }));

    expect(await screen.findByText("Not authorized")).toBeInTheDocument();
    expect(screen.queryByText("emergency alerts listing page")).not.toBeInTheDocument();
  });

  it("navigates back to the listing", async () => {
    const user = userEvent.setup();
    mockService();
    renderPage();

    await screen.findByText("Alert #7");
    await user.click(screen.getByRole("button", { name: /Back to emergency alerts/ }));

    expect(await screen.findByText("emergency alerts listing page")).toBeInTheDocument();
  });
});
