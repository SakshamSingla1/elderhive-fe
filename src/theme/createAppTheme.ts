import { createTheme, alpha, type Theme } from "@mui/material/styles";
import type { Colors } from "../hooks/useColors";

const FONT_BODY = '"Inter", "Helvetica Neue", Arial, sans-serif';
const FONT_DISPLAY = '"Fraunces", "Inter", "Helvetica Neue", Arial, serif';

/**
 * Builds the single MUI theme every portal renders through, from the currently active
 * ColorTheme's resolved shades (useColors()) plus a secondary/accent pair read straight
 * off the raw palette (DEFAULT_PALETTE or an admin-authored ColorTheme both carry an
 * "accent" group - see themeConstants.ts - which useColors() itself doesn't expose,
 * since ThemeInjector/CSS vars never needed it before this).
 *
 * This is the thing that actually makes the admin Theme Builder (Phase 6) change what
 * the app LOOKS like: before this file existed, every page either used plain MUI
 * defaults (Roboto, MUI blue) or a hardcoded hex (Landing.page.tsx's old BRAND_COLOR),
 * completely disconnected from the ColorTheme system. Recomputed (see
 * AppThemeProvider.tsx) whenever `colors`/`accent` change, so switching themes updates
 * every MUI component live with no reload.
 */
export function createAppTheme(colors: Colors, accent: { main: string; dark: string; light: string }): Theme {
  const warmShadow = (opacity: number, blur: number, spread = 0) =>
    `0 ${Math.round(blur / 3)}px ${blur}px ${spread}px ${alpha(colors.neutral900, opacity)}`;

  return createTheme({
    palette: {
      mode: "light",
      primary: {
        main: colors.primary500,
        light: colors.primary300,
        dark: colors.primary700,
        contrastText: colors.neutral0,
      },
      secondary: {
        main: accent.main,
        light: accent.light,
        dark: accent.dark,
        contrastText: colors.neutral900,
      },
      success: { main: colors.success500, light: colors.success100, dark: colors.success700 },
      error: { main: colors.error500, light: colors.error100, dark: colors.error700 },
      warning: { main: colors.warning500, light: colors.warning100, dark: colors.warning700 },
      background: { default: colors.neutral50, paper: colors.neutral0 },
      text: { primary: colors.neutral900, secondary: colors.neutral600 },
      divider: colors.neutral200,
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: FONT_BODY,
      h1: { fontFamily: FONT_DISPLAY, fontWeight: 700, letterSpacing: "-0.02em" },
      h2: { fontFamily: FONT_DISPLAY, fontWeight: 700, letterSpacing: "-0.02em" },
      h3: { fontFamily: FONT_DISPLAY, fontWeight: 600, letterSpacing: "-0.01em" },
      h4: { fontFamily: FONT_DISPLAY, fontWeight: 600, letterSpacing: "-0.01em" },
      h5: { fontFamily: FONT_DISPLAY, fontWeight: 600 },
      h6: { fontFamily: FONT_DISPLAY, fontWeight: 600 },
      button: { fontWeight: 700, textTransform: "none", letterSpacing: 0 },
      body1: { lineHeight: 1.65 },
      body2: { lineHeight: 1.6 },
    },
    shadows: [
      "none",
      warmShadow(0.06, 4),
      warmShadow(0.07, 6),
      warmShadow(0.07, 8),
      warmShadow(0.08, 10),
      warmShadow(0.08, 12),
      warmShadow(0.09, 14),
      warmShadow(0.09, 16),
      warmShadow(0.1, 18),
      warmShadow(0.1, 20),
      warmShadow(0.1, 22),
      warmShadow(0.11, 24),
      warmShadow(0.11, 26),
      warmShadow(0.11, 28),
      warmShadow(0.12, 30),
      warmShadow(0.12, 32),
      warmShadow(0.12, 34),
      warmShadow(0.13, 36),
      warmShadow(0.13, 38),
      warmShadow(0.13, 40),
      warmShadow(0.14, 42),
      warmShadow(0.14, 44),
      warmShadow(0.14, 46),
      warmShadow(0.15, 48),
      warmShadow(0.15, 50),
    ] as Theme["shadows"],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: colors.neutral50 },
          "::selection": { backgroundColor: alpha(colors.primary500, 0.25) },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 12,
            paddingInline: 20,
            paddingBlock: 10,
            fontWeight: 700,
            transition: "transform 150ms ease, box-shadow 150ms ease, background-color 150ms ease",
          },
          sizeLarge: { paddingInline: 28, paddingBlock: 13, fontSize: "1rem" },
          contained: {
            "&:hover": { transform: "translateY(-1px)", boxShadow: warmShadow(0.18, 20) },
          },
          outlined: { borderWidth: 1.5, "&:hover": { borderWidth: 1.5 } },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 18,
            backgroundImage: "none",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none" },
          outlined: { borderColor: colors.neutral200 },
          rounded: { borderRadius: 16 },
        },
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: 999, fontWeight: 600 } },
      },
      MuiTextField: {
        defaultProps: { variant: "outlined" },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: 12, backgroundColor: colors.neutral0 },
        },
      },
      MuiAlert: {
        styleOverrides: { root: { borderRadius: 12 } },
      },
      MuiAppBar: {
        styleOverrides: {
          root: { backgroundColor: colors.neutral0, backgroundImage: "none" },
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            border: `1px solid ${colors.neutral200}`,
            "&:before": { display: "none" },
            "&.Mui-expanded": { margin: 0 },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: { tooltip: { borderRadius: 8, fontSize: "0.75rem" } },
      },
    },
  });
}
