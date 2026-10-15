import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthenticatedUser } from "../../../contexts/AuthenticatedUserContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { useColorThemeService } from "../../../services/useColorThemeService";
import { useUserThemeService } from "../../../services/useUserThemeService";
import { UserTypeEnum } from "../../../utils/enums";
import AccountSettingsPage from "./AccountSettings.page";

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

function mockColorThemeService() {
  mockedUseColorThemeService.mockReturnValue({
    getColorTheme: vi.fn().mockResolvedValue({
      content: [{ id: 1, themeName: "Forest Green", status: "ACTIVE", palette: { colorGroups: [{ groupName: "primary", colorShades: [{ colorName: "primary500", colorCode: "#2E7D32" }] }] } }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 9,
      first: true,
      last: true,
      numberOfElements: 1,
      empty: false,
    }),
    getColorThemeById: vi.fn(),
    createColorTheme: vi.fn(),
    updateColorTheme: vi.fn(),
    deleteColorTheme: vi.fn(),
  });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/elder/account-settings"]}>
      <AccountSettingsPage />
    </MemoryRouter>
  );
}

describe("AccountSettings.page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the theme catalog with view + apply only, never Add/Edit/Delete - even for a SUPER_ADMIN", async () => {
    mockUser(UserTypeEnum.SUPER_ADMIN);
    mockTheme();
    mockColorThemeService();
    mockedUseUserThemeService.mockReturnValue({ getActiveTheme: vi.fn(), setActiveTheme: vi.fn(), resetTheme: vi.fn(), getUsersByTheme: vi.fn(), countUsersByTheme: vi.fn() });
    renderPage();

    expect(await screen.findByText("Forest Green")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Theme" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("works identically for a non-admin role", async () => {
    mockUser(UserTypeEnum.ELDER);
    mockTheme();
    mockColorThemeService();
    mockedUseUserThemeService.mockReturnValue({ getActiveTheme: vi.fn(), setActiveTheme: vi.fn(), resetTheme: vi.fn(), getUsersByTheme: vi.fn(), countUsersByTheme: vi.fn() });
    renderPage();

    await waitFor(() => expect(screen.getByText("Forest Green")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
  });
});
