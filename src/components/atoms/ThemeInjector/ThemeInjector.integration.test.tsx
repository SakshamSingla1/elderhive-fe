import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuthenticatedUser } from "../../../contexts/AuthenticatedUserContext";
import { useUserThemeService } from "../../../services/useUserThemeService";
import { useColorThemeService } from "../../../services/useColorThemeService";
import { ThemeProvider } from "../../../contexts/ThemeContext";
import { DEFAULT_PALETTE } from "../../../utils/themeConstants";
import ThemeInjector from "./ThemeInjector";

vi.mock("../../../contexts/AuthenticatedUserContext", () => ({
  useAuthenticatedUser: vi.fn(),
}));
vi.mock("../../../services/useUserThemeService", () => ({
  useUserThemeService: vi.fn(),
}));
vi.mock("../../../services/useColorThemeService", () => ({
  useColorThemeService: vi.fn(),
}));

const mockedUseAuthenticatedUser = vi.mocked(useAuthenticatedUser);
const mockedUseUserThemeService = vi.mocked(useUserThemeService);
const mockedUseColorThemeService = vi.mocked(useColorThemeService);

function findDefaultShade(colorName: string): string {
  for (const group of DEFAULT_PALETTE.colorGroups) {
    for (const shade of group.colorShades) {
      if (shade.colorName === colorName) return shade.colorCode;
    }
  }
  throw new Error(`${colorName} not found`);
}

describe("ThemeInjector (integration with the real ThemeProvider/useColors)", () => {
  it("a real login-driven theme load propagates all the way to documentElement's CSS custom properties", async () => {
    mockedUseAuthenticatedUser.mockReturnValue({
      user: { id: 1, email: "elder@example.com", userType: "ELDER" as never, primaryRole: "ELDER" as never, roles: [] },
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshFromServer: vi.fn(),
    });
    mockedUseUserThemeService.mockReturnValue({
      getActiveTheme: vi.fn().mockResolvedValue({ id: 1, userId: 1, userEmail: "elder@example.com", themeId: 9, themeName: "Custom" }),
      setActiveTheme: vi.fn(),
      resetTheme: vi.fn(),
      getUsersByTheme: vi.fn(),
      countUsersByTheme: vi.fn(),
    });
    mockedUseColorThemeService.mockReturnValue({
      getColorTheme: vi.fn(),
      getColorThemeById: vi.fn().mockResolvedValue({
        id: 9,
        themeName: "Custom",
        status: "ACTIVE",
        palette: { colorGroups: [{ groupName: "primary", colorShades: [{ colorName: "primary500", colorCode: "#2E7D32" }] }] },
      }),
      createColorTheme: vi.fn(),
      updateColorTheme: vi.fn(),
      deleteColorTheme: vi.fn(),
    });

    render(
      <ThemeProvider>
        <ThemeInjector />
      </ThemeProvider>
    );

    // Before the fetch resolves: falls back to the seeded DEFAULT_PALETTE.
    expect(document.documentElement.style.getPropertyValue("--color-primary-500")).toBe(findDefaultShade("primary500"));

    // Once the real ThemeContext -> useColors chain resolves the user's actual theme:
    await waitFor(() => expect(document.documentElement.style.getPropertyValue("--color-primary-500")).toBe("#2E7D32"));
  });
});
