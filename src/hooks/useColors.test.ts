import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTheme } from "../contexts/ThemeContext";
import { useColors } from "./useColors";
import { DEFAULT_PALETTE } from "../utils/themeConstants";
import type { ColorThemeResponse } from "../services/useColorThemeService";

vi.mock("../contexts/ThemeContext", () => ({
  useTheme: vi.fn(),
}));

const mockedUseTheme = vi.mocked(useTheme);

function mockActiveTheme(activeColorTheme: ColorThemeResponse | null) {
  mockedUseTheme.mockReturnValue({
    isDark: false,
    isPreviewActive: false,
    activeThemeName: "Default",
    activeColorTheme,
    setColorMode: vi.fn(),
    setActiveTheme: vi.fn(),
    resetTheme: vi.fn(),
  });
}

function findDefaultShade(colorName: string): string {
  for (const group of DEFAULT_PALETTE.colorGroups) {
    for (const shade of group.colorShades) {
      if (shade.colorName === colorName) return shade.colorCode;
    }
  }
  throw new Error(`${colorName} not found in DEFAULT_PALETTE`);
}

describe("useColors", () => {
  it("falls back to DEFAULT_PALETTE's exact values when no theme has loaded yet", () => {
    mockActiveTheme(null);

    const { result } = renderHook(() => useColors());

    expect(result.current.primary500).toBe(findDefaultShade("primary500"));
    expect(result.current.neutral900).toBe(findDefaultShade("neutral900"));
  });

  it("derives primary/neutral shades from the active theme's own palette when one is loaded", () => {
    mockActiveTheme({
      id: 7,
      themeName: "Custom",
      status: "ACTIVE",
      palette: {
        colorGroups: [
          { groupName: "primary", colorShades: [{ colorName: "primary500", colorCode: "#123456" }] },
          { groupName: "neutral", colorShades: [{ colorName: "neutral900", colorCode: "#ABCDEF" }] },
        ],
      },
    });

    const { result } = renderHook(() => useColors());

    expect(result.current.primary500).toBe("#123456");
    expect(result.current.neutral900).toBe("#ABCDEF");
  });

  it("falls back to DEFAULT_PALETTE for any shade the active theme's own palette doesn't define", () => {
    mockActiveTheme({
      id: 7,
      themeName: "Partial",
      status: "ACTIVE",
      palette: { colorGroups: [{ groupName: "primary", colorShades: [{ colorName: "primary500", colorCode: "#123456" }] }] },
    });

    const { result } = renderHook(() => useColors());

    expect(result.current.primary500).toBe("#123456"); // defined by the theme
    expect(result.current.primary900).toBe(findDefaultShade("primary900")); // not defined - falls back
  });

  it("success/error/warning scales never come from any theme, active or default", () => {
    mockActiveTheme({
      id: 7,
      themeName: "Custom",
      status: "ACTIVE",
      palette: {
        colorGroups: [
          // Even if a palette somehow carried a colorShade literally named "success500",
          // the semantic scale must win - these groups are a fixed, theme-independent
          // contract no ColorTheme is ever expected to redefine.
          { groupName: "success", colorShades: [{ colorName: "success500", colorCode: "#000000" }] },
        ],
      },
    });

    const { result } = renderHook(() => useColors());

    expect(result.current.success500).toBe("#10B981");
    expect(result.current.error500).toBe("#EF4444");
    expect(result.current.warning500).toBe("#F59E0B");
  });

  it("neutral0 and neutral950 always come from the hardcoded extremes, regardless of theme", () => {
    mockActiveTheme(null);
    const { result: withoutTheme } = renderHook(() => useColors());
    expect(withoutTheme.current.neutral0).toBe("#FFFFFF");
    expect(withoutTheme.current.neutral950).toBe("#110E0C");

    mockActiveTheme({
      id: 7,
      themeName: "Custom",
      status: "ACTIVE",
      palette: { colorGroups: [{ groupName: "neutral", colorShades: [{ colorName: "neutral500", colorCode: "#777777" }] }] },
    });
    const { result: withTheme } = renderHook(() => useColors());
    expect(withTheme.current.neutral0).toBe("#FFFFFF");
    expect(withTheme.current.neutral950).toBe("#110E0C");
  });
});
