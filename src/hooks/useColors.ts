import { useMemo } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { DEFAULT_PALETTE } from "../utils/themeConstants";
import type { ColorPalette } from "../services/useColorThemeService";

// Semantic status colors never come from a ColorTheme's palette - no theme (the seeded
// "ElderHive Classic" or an admin-authored one via Prompt 49's Theme Builder) ever
// carries success/error/warning groups, only primary/secondary/accent/neutral (see
// com.elderhive.seed.ColorThemeSeeder, Prompt 45, and themeConstants.ts's
// DEFAULT_PALETTE). These scales are fixed across every theme, mirroring Portfolio's own
// COLOR_FALLBACKS values for the same three groups.
const SEMANTIC_SCALES: Record<"success" | "error" | "warning", Record<number, string>> = {
  success: {
    50: "#ECFDF5",
    100: "#D1FAE5",
    200: "#A7F3D0",
    300: "#6EE7B7",
    400: "#34D399",
    500: "#10B981",
    600: "#059669",
    700: "#047857",
    800: "#065F46",
    900: "#064E3B",
  },
  error: {
    50: "#FEF2F2",
    100: "#FEE2E2",
    200: "#FECACA",
    300: "#FCA5A5",
    400: "#F87171",
    500: "#EF4444",
    600: "#DC2626",
    700: "#B91C1C",
    800: "#991B1B",
    900: "#7F1D1D",
  },
  warning: {
    50: "#FFFBEB",
    100: "#FEF3C7",
    200: "#FDE68A",
    300: "#FCD34D",
    400: "#FBBF24",
    500: "#F59E0B",
    600: "#D97706",
    700: "#B45309",
    800: "#92400E",
    900: "#78350F",
  },
};

// Neither the active theme's palette nor DEFAULT_PALETTE defines a "0" (lighter than 50)
// or "950" (darker than 900) neutral shade - every ColorTheme's neutral group only ever
// spans 50-900 (10 shades, see ColorThemeSeeder). These two are the UI chrome's absolute
// extremes (pure page background / deepest possible text), synthesized once here rather
// than added to every ColorTheme a user could ever author.
const NEUTRAL_EXTREMES: Record<number, string> = { 0: "#FFFFFF", 950: "#110E0C" };

function findShade(palette: ColorPalette, colorName: string): string | undefined {
  for (const group of palette.colorGroups) {
    for (const shade of group.colorShades) {
      if (shade.colorName === colorName) return shade.colorCode;
    }
  }
  return undefined;
}

export interface Colors {
  neutral0: string;
  neutral50: string;
  neutral100: string;
  neutral200: string;
  neutral300: string;
  neutral400: string;
  neutral500: string;
  neutral600: string;
  neutral700: string;
  neutral800: string;
  neutral900: string;
  neutral950: string;
  primary50: string;
  primary100: string;
  primary200: string;
  primary300: string;
  primary400: string;
  primary500: string;
  primary600: string;
  primary700: string;
  primary800: string;
  primary900: string;
  success50: string;
  success100: string;
  success200: string;
  success300: string;
  success400: string;
  success500: string;
  success600: string;
  success700: string;
  success800: string;
  success900: string;
  error50: string;
  error100: string;
  error200: string;
  error300: string;
  error400: string;
  error500: string;
  error600: string;
  error700: string;
  error800: string;
  error900: string;
  warning50: string;
  warning100: string;
  warning200: string;
  warning300: string;
  warning400: string;
  warning500: string;
  warning600: string;
  warning700: string;
  warning800: string;
  warning900: string;
}

/**
 * Derives a flat named-color object from the currently active ColorTheme's palette
 * (ThemeContext's activeColorTheme, fetched on login via useUserThemeService +
 * useColorThemeService), falling back to Prompt 45's seeded DEFAULT_PALETTE whenever no
 * theme has loaded yet (not logged in, fetch still in flight, or it failed). Mirrors
 * Portfolio's useColors() shape, minus the secondary/accent scales and the isDark-driven
 * shade remapping Portfolio layers on top - neither was asked for here, and this hook's
 * consumer (ThemeInjector) is the entire extent of what reads it so far.
 */
export const useColors = (): Colors => {
  const { activeColorTheme } = useTheme();

  return useMemo(() => {
    const palette = activeColorTheme?.palette ?? DEFAULT_PALETTE;

    const neutral = (shade: number): string =>
      findShade(palette, `neutral${shade}`) ??
      NEUTRAL_EXTREMES[shade] ??
      findShade(DEFAULT_PALETTE, `neutral${shade}`) ??
      "";

    const primary = (shade: number): string =>
      findShade(palette, `primary${shade}`) ?? findShade(DEFAULT_PALETTE, `primary${shade}`) ?? "";

    const semantic = (prefix: "success" | "error" | "warning", shade: number): string => SEMANTIC_SCALES[prefix][shade];

    return {
      neutral0: neutral(0),
      neutral50: neutral(50),
      neutral100: neutral(100),
      neutral200: neutral(200),
      neutral300: neutral(300),
      neutral400: neutral(400),
      neutral500: neutral(500),
      neutral600: neutral(600),
      neutral700: neutral(700),
      neutral800: neutral(800),
      neutral900: neutral(900),
      neutral950: neutral(950),
      primary50: primary(50),
      primary100: primary(100),
      primary200: primary(200),
      primary300: primary(300),
      primary400: primary(400),
      primary500: primary(500),
      primary600: primary(600),
      primary700: primary(700),
      primary800: primary(800),
      primary900: primary(900),
      success50: semantic("success", 50),
      success100: semantic("success", 100),
      success200: semantic("success", 200),
      success300: semantic("success", 300),
      success400: semantic("success", 400),
      success500: semantic("success", 500),
      success600: semantic("success", 600),
      success700: semantic("success", 700),
      success800: semantic("success", 800),
      success900: semantic("success", 900),
      error50: semantic("error", 50),
      error100: semantic("error", 100),
      error200: semantic("error", 200),
      error300: semantic("error", 300),
      error400: semantic("error", 400),
      error500: semantic("error", 500),
      error600: semantic("error", 600),
      error700: semantic("error", 700),
      error800: semantic("error", 800),
      error900: semantic("error", 900),
      warning50: semantic("warning", 50),
      warning100: semantic("warning", 100),
      warning200: semantic("warning", 200),
      warning300: semantic("warning", 300),
      warning400: semantic("warning", 400),
      warning500: semantic("warning", 500),
      warning600: semantic("warning", 600),
      warning700: semantic("warning", 700),
      warning800: semantic("warning", 800),
      warning900: semantic("warning", 900),
    };
  }, [activeColorTheme]);
};
