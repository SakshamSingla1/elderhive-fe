import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useColorThemeService } from "../../../services/useColorThemeService";
import ViewColorThemePage from "./ViewColorTheme.page";

vi.mock("../../../services/useColorThemeService", () => ({
  useColorThemeService: vi.fn(),
}));

const mockedUseColorThemeService = vi.mocked(useColorThemeService);

function mockService(overrides: Partial<ReturnType<typeof useColorThemeService>> = {}) {
  const service = {
    getColorTheme: vi.fn(),
    getColorThemeById: vi.fn().mockResolvedValue({
      id: 7,
      themeName: "Forest Green",
      status: "ACTIVE",
      palette: { colorGroups: [{ groupName: "primary", colorShades: [{ colorName: "primary500", colorCode: "#2E7D32" }] }] },
    }),
    createColorTheme: vi.fn(),
    updateColorTheme: vi.fn(),
    deleteColorTheme: vi.fn(),
    ...overrides,
  };
  mockedUseColorThemeService.mockReturnValue(service);
  return service;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/color-themes/7"]}>
      <Routes>
        <Route path="/admin/color-themes/:id" element={<ViewColorThemePage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ViewColorTheme.page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads and renders the theme read-only", async () => {
    mockService();
    renderPage();

    expect(await screen.findByDisplayValue("Forest Green")).toBeInTheDocument();
    expect(screen.getByLabelText(/Theme Name/)).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Update" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
  });

  it("shows an error if loading fails", async () => {
    mockService({ getColorThemeById: vi.fn().mockRejectedValue(new Error("not found")) });
    renderPage();

    expect(await screen.findByText("not found")).toBeInTheDocument();
  });
});
