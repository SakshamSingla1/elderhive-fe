import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserTypeEnum } from "../utils/enums";
import { useAuthenticatedUser } from "./AuthenticatedUserContext";
import { useUserThemeService } from "../services/useUserThemeService";
import { useColorThemeService } from "../services/useColorThemeService";
import { ThemeProvider, useTheme } from "./ThemeContext";
import type { ColorThemeResponse } from "../services/useColorThemeService";

vi.mock("./AuthenticatedUserContext", () => ({
  useAuthenticatedUser: vi.fn(),
}));
vi.mock("../services/useUserThemeService", () => ({
  useUserThemeService: vi.fn(),
}));
vi.mock("../services/useColorThemeService", () => ({
  useColorThemeService: vi.fn(),
}));

const mockedUseAuthenticatedUser = vi.mocked(useAuthenticatedUser);
const mockedUseUserThemeService = vi.mocked(useUserThemeService);
const mockedUseColorThemeService = vi.mocked(useColorThemeService);

const sampleTheme: ColorThemeResponse = {
  id: 5,
  themeName: "Forest Green",
  palette: { colorGroups: [{ groupName: "primary", colorShades: [{ colorName: "primary500", colorCode: "#2E7D32" }] }] },
  status: "ACTIVE",
};

function mockUser(user: ReturnType<typeof useAuthenticatedUser>["user"]) {
  mockedUseAuthenticatedUser.mockReturnValue({
    user,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshFromServer: vi.fn(),
  });
}

function mockThemeServices(getActiveTheme = vi.fn(), getColorThemeById = vi.fn()) {
  mockedUseUserThemeService.mockReturnValue({
    getActiveTheme,
    setActiveTheme: vi.fn(),
    resetTheme: vi.fn(),
    getUsersByTheme: vi.fn(),
    countUsersByTheme: vi.fn(),
  });
  mockedUseColorThemeService.mockReturnValue({
    getColorTheme: vi.fn(),
    getColorThemeById,
    createColorTheme: vi.fn(),
    updateColorTheme: vi.fn(),
    deleteColorTheme: vi.fn(),
  });
}

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    document.documentElement.style.removeProperty("--color-primary");
    document.documentElement.style.removeProperty("--color-accent");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("useTheme throws when used outside a ThemeProvider", () => {
    expect(() => renderHook(() => useTheme())).toThrow("useTheme must be used within a ThemeProvider");
  });

  it("defaults isDark to false when nothing is saved and the system has no dark preference", () => {
    mockUser(null);
    mockThemeServices();

    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

    expect(result.current.isDark).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("setColorMode('dark') flips isDark, adds the 'dark' class, and persists to localStorage", () => {
    mockUser(null);
    mockThemeServices();

    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

    act(() => result.current.setColorMode("dark"));

    expect(result.current.isDark).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("setActiveTheme sets --color-primary/--color-accent, activeThemeName, and isPreviewActive", () => {
    mockUser(null);
    mockThemeServices();

    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

    act(() => result.current.setActiveTheme("Sunset", { primary: "#FF0000", accent: "#00FF00", background: "", foreground: "", card: "", muted: "", border: "" }));

    expect(document.documentElement.style.getPropertyValue("--color-primary")).toBe("#FF0000");
    expect(document.documentElement.style.getPropertyValue("--color-accent")).toBe("#00FF00");
    expect(result.current.activeThemeName).toBe("Sunset");
    expect(result.current.isPreviewActive).toBe(true);
  });

  it("resetTheme clears the preview CSS vars and resets isDark/isPreviewActive/activeThemeName", () => {
    mockUser(null);
    mockThemeServices();

    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

    act(() => {
      result.current.setColorMode("dark");
      result.current.setActiveTheme("Sunset", { primary: "#FF0000", accent: "#00FF00", background: "", foreground: "", card: "", muted: "", border: "" });
    });
    act(() => result.current.resetTheme());

    expect(document.documentElement.style.getPropertyValue("--color-primary")).toBe("");
    expect(document.documentElement.style.getPropertyValue("--color-accent")).toBe("");
    expect(result.current.isDark).toBe(false);
    expect(result.current.isPreviewActive).toBe(false);
    expect(result.current.activeThemeName).toBe("Default");
  });

  it("activeColorTheme stays null when no user is authenticated, and never calls either theme service", async () => {
    mockUser(null);
    const getActiveTheme = vi.fn();
    const getColorThemeById = vi.fn();
    mockThemeServices(getActiveTheme, getColorThemeById);

    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    await act(async () => {});

    expect(result.current.activeColorTheme).toBeNull();
    expect(getActiveTheme).not.toHaveBeenCalled();
    expect(getColorThemeById).not.toHaveBeenCalled();
  });

  it("on login, resolves the user's theme id via useUserThemeService then fetches its full palette via useColorThemeService", async () => {
    mockUser({ id: 1, email: "elder@example.com", userType: UserTypeEnum.ELDER, primaryRole: UserTypeEnum.ELDER, roles: [UserTypeEnum.ELDER] });
    const getActiveTheme = vi.fn().mockResolvedValue({ id: 10, userId: 1, userEmail: "elder@example.com", themeId: 5, themeName: "Forest Green" });
    const getColorThemeById = vi.fn().mockResolvedValue(sampleTheme);
    mockThemeServices(getActiveTheme, getColorThemeById);

    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

    await waitFor(() => expect(result.current.activeColorTheme).toEqual(sampleTheme));
    expect(getActiveTheme).toHaveBeenCalledTimes(1);
    expect(getColorThemeById).toHaveBeenCalledWith(5);
  });

  it("a failed theme fetch leaves activeColorTheme null rather than throwing", async () => {
    mockUser({ id: 1, email: "elder@example.com", userType: UserTypeEnum.ELDER, primaryRole: UserTypeEnum.ELDER, roles: [UserTypeEnum.ELDER] });
    const getActiveTheme = vi.fn().mockRejectedValue(new Error("network error"));
    mockThemeServices(getActiveTheme, vi.fn());

    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    await act(async () => {});

    expect(result.current.activeColorTheme).toBeNull();
  });

  it("logging out resets activeColorTheme back to null", async () => {
    const getActiveTheme = vi.fn().mockResolvedValue({ id: 10, userId: 1, userEmail: "elder@example.com", themeId: 5, themeName: "Forest Green" });
    const getColorThemeById = vi.fn().mockResolvedValue(sampleTheme);
    mockThemeServices(getActiveTheme, getColorThemeById);
    mockUser({ id: 1, email: "elder@example.com", userType: UserTypeEnum.ELDER, primaryRole: UserTypeEnum.ELDER, roles: [UserTypeEnum.ELDER] });

    const { result, rerender } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    await waitFor(() => expect(result.current.activeColorTheme).toEqual(sampleTheme));

    mockUser(null);
    rerender();

    await waitFor(() => expect(result.current.activeColorTheme).toBeNull());
  });
});
