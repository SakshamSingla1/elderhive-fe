import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthenticatedUser } from "../../../contexts/AuthenticatedUserContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { useColorThemeService } from "../../../services/useColorThemeService";
import { useUserThemeService } from "../../../services/useUserThemeService";
import { UserTypeEnum } from "../../../utils/enums";
import ListingColorThemePage from "./ListingColorTheme.page";

vi.mock("../../../contexts/AuthenticatedUserContext", () => ({
  useAuthenticatedUser: vi.fn(),
}));
vi.mock("../../../contexts/ThemeContext", async () => {
  const actual = await vi.importActual<typeof import("../../../contexts/ThemeContext")>("../../../contexts/ThemeContext");
  return { ...actual, useTheme: vi.fn() };
});
vi.mock("../../../services/useColorThemeService", async () => {
  const actual = await vi.importActual<typeof import("../../../services/useColorThemeService")>("../../../services/useColorThemeService");
  return { ...actual, useColorThemeService: vi.fn() };
});
vi.mock("../../../services/useUserThemeService", () => ({
  useUserThemeService: vi.fn(),
}));

const mockedUseAuthenticatedUser = vi.mocked(useAuthenticatedUser);
const mockedUseTheme = vi.mocked(useTheme);
const mockedUseColorThemeService = vi.mocked(useColorThemeService);
const mockedUseUserThemeService = vi.mocked(useUserThemeService);

function mockUser(primaryRole: (typeof UserTypeEnum)[keyof typeof UserTypeEnum]) {
  mockedUseAuthenticatedUser.mockReturnValue({
    user: { id: 1, email: "a@example.com", userType: primaryRole, primaryRole, roles: [primaryRole] },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshFromServer: vi.fn(),
  });
}

function mockTheme() {
  mockedUseTheme.mockReturnValue({
    isDark: false,
    isPreviewActive: false,
    activeThemeName: "Default",
    activeColorTheme: null,
    setColorMode: vi.fn(),
    setActiveTheme: vi.fn(),
    resetTheme: vi.fn(),
  });
}

function mockColorThemeService(getColorTheme = vi.fn().mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 9, first: true, last: true, numberOfElements: 0, empty: true })) {
  mockedUseColorThemeService.mockReturnValue({
    getColorTheme,
    getColorThemeById: vi.fn(),
    createColorTheme: vi.fn(),
    updateColorTheme: vi.fn(),
    deleteColorTheme: vi.fn(),
  });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/color-themes"]}>
      <ListingColorThemePage />
    </MemoryRouter>
  );
}

describe("ListingColorTheme.page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows Add Theme for a SUPER_ADMIN", async () => {
    mockUser(UserTypeEnum.SUPER_ADMIN);
    mockTheme();
    mockColorThemeService();
    mockedUseUserThemeService.mockReturnValue({ getActiveTheme: vi.fn(), setActiveTheme: vi.fn(), resetTheme: vi.fn(), getUsersByTheme: vi.fn(), countUsersByTheme: vi.fn() });
    renderPage();

    expect(await screen.findByRole("button", { name: "Add Theme" })).toBeInTheDocument();
  });

  it("hides Add Theme for a curated ADMIN", async () => {
    mockUser(UserTypeEnum.ADMIN);
    mockTheme();
    mockColorThemeService();
    mockedUseUserThemeService.mockReturnValue({ getActiveTheme: vi.fn(), setActiveTheme: vi.fn(), resetTheme: vi.fn(), getUsersByTheme: vi.fn(), countUsersByTheme: vi.fn() });
    renderPage();

    await waitFor(() => expect(screen.getByText("No color themes found")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Add Theme" })).not.toBeInTheDocument();
  });

  it("shows an error alert when the initial load fails", async () => {
    mockUser(UserTypeEnum.ADMIN);
    mockTheme();
    mockColorThemeService(vi.fn().mockRejectedValue(new Error("network down")));
    mockedUseUserThemeService.mockReturnValue({ getActiveTheme: vi.fn(), setActiveTheme: vi.fn(), resetTheme: vi.fn(), getUsersByTheme: vi.fn(), countUsersByTheme: vi.fn() });
    renderPage();

    expect(await screen.findByText("network down")).toBeInTheDocument();
  });
});
