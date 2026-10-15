import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useColorThemeService } from "../../../services/useColorThemeService";
import AddColorThemePage from "./AddColorTheme.page";

vi.mock("../../../services/useColorThemeService", () => ({
  useColorThemeService: vi.fn(),
}));

const mockedUseColorThemeService = vi.mocked(useColorThemeService);

function mockService(overrides: Partial<ReturnType<typeof useColorThemeService>> = {}) {
  const service = {
    getColorTheme: vi.fn(),
    getColorThemeById: vi.fn(),
    createColorTheme: vi.fn().mockResolvedValue({ id: 1, themeName: "New Theme", status: "ACTIVE", palette: { colorGroups: [] } }),
    updateColorTheme: vi.fn(),
    deleteColorTheme: vi.fn(),
    ...overrides,
  };
  mockedUseColorThemeService.mockReturnValue(service);
  return service;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/color-themes/new"]}>
      <Routes>
        <Route path="/admin/color-themes/new" element={<AddColorThemePage />} />
        <Route path="/admin/color-themes" element={<div>listing page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("AddColorTheme.page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates the theme and navigates to the listing on success", async () => {
    const user = userEvent.setup();
    const service = mockService();
    renderPage();

    await user.type(screen.getByLabelText(/Theme Name/), "My New Theme");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(service.createColorTheme).toHaveBeenCalledWith(expect.objectContaining({ themeName: "My New Theme" })));
    expect(await screen.findByText("listing page")).toBeInTheDocument();
  });

  it("shows the backend's error message and stays on the page when creation fails", async () => {
    const user = userEvent.setup();
    mockService({ createColorTheme: vi.fn().mockRejectedValue({ response: { data: { message: "Theme already exists" } } }) });
    renderPage();

    await user.type(screen.getByLabelText(/Theme Name/), "Duplicate");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Theme already exists")).toBeInTheDocument();
    expect(screen.queryByText("listing page")).not.toBeInTheDocument();
  });
});
