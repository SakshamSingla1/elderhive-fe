import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useColorThemeService } from "../../../services/useColorThemeService";
import EditColorThemePage from "./EditColorTheme.page";

vi.mock("../../../services/useColorThemeService", () => ({
  useColorThemeService: vi.fn(),
}));

const mockedUseColorThemeService = vi.mocked(useColorThemeService);

const existingTheme = {
  id: 7,
  themeName: "Forest Green",
  status: "INACTIVE" as const,
  palette: { colorGroups: [{ groupName: "primary", colorShades: [{ colorName: "primary500", colorCode: "#2E7D32" }] }] },
};

function mockService(overrides: Partial<ReturnType<typeof useColorThemeService>> = {}) {
  const service = {
    getColorTheme: vi.fn(),
    getColorThemeById: vi.fn().mockResolvedValue(existingTheme),
    createColorTheme: vi.fn(),
    updateColorTheme: vi.fn().mockResolvedValue(existingTheme),
    deleteColorTheme: vi.fn(),
    ...overrides,
  };
  mockedUseColorThemeService.mockReturnValue(service);
  return service;
}

function renderPage(id = "7") {
  return render(
    <MemoryRouter initialEntries={[`/admin/color-themes/${id}/edit`]}>
      <Routes>
        <Route path="/admin/color-themes/:id/edit" element={<EditColorThemePage />} />
        <Route path="/admin/color-themes" element={<div>listing page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("EditColorTheme.page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads the existing theme by id and populates the form", async () => {
    mockService();
    renderPage();

    expect(await screen.findByDisplayValue("Forest Green")).toBeInTheDocument();
    expect(screen.getByDisplayValue("#2E7D32")).toBeInTheDocument();
  });

  it("shows an error if loading the theme fails", async () => {
    mockService({ getColorThemeById: vi.fn().mockRejectedValue(new Error("not found")) });
    renderPage();

    expect(await screen.findByText("not found")).toBeInTheDocument();
  });

  it("submits the update (preserving status) and navigates to the listing on success", async () => {
    const user = userEvent.setup();
    const service = mockService();
    renderPage();

    await screen.findByDisplayValue("Forest Green");
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() =>
      expect(service.updateColorTheme).toHaveBeenCalledWith(7, expect.objectContaining({ themeName: "Forest Green", status: "INACTIVE" }))
    );
    expect(await screen.findByText("listing page")).toBeInTheDocument();
  });

  it("shows the backend's error message and stays on the page when the update fails", async () => {
    const user = userEvent.setup();
    mockService({ updateColorTheme: vi.fn().mockRejectedValue({ response: { data: { message: "Not authorized" } } }) });
    renderPage();

    await screen.findByDisplayValue("Forest Green");
    await user.click(screen.getByRole("button", { name: "Update" }));

    expect(await screen.findByText("Not authorized")).toBeInTheDocument();
    expect(screen.queryByText("listing page")).not.toBeInTheDocument();
  });
});
