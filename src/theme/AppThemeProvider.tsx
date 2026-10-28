import React, { useMemo } from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { useColors } from "../hooks/useColors";
import { useTheme } from "../contexts/ThemeContext";
import { DEFAULT_PALETTE } from "../utils/themeConstants";
import type { ColorPalette } from "../services/useColorThemeService";
import { createAppTheme } from "./createAppTheme";

function findShade(palette: ColorPalette, colorName: string): string | undefined {
  for (const group of palette.colorGroups) {
    for (const shade of group.colorShades) {
      if (shade.colorName === colorName) return shade.colorCode;
    }
  }
  return undefined;
}

/**
 * Bridges ThemeContext's ColorTheme system into MUI's own theme engine. Must render
 * inside ThemeContext's ThemeProvider (useColors/useTheme both require it) - see
 * App.tsx for where this is mounted, alongside ThemeInjector (the CSS-custom-property
 * mechanism; this is the MUI-palette mechanism, both driven by the same
 * activeColorTheme so neither one can drift from the other).
 */
const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const colors = useColors();
  const { activeColorTheme } = useTheme();

  const theme = useMemo(() => {
    const palette = activeColorTheme?.palette ?? DEFAULT_PALETTE;
    const accent = {
      main: findShade(palette, "accent500") ?? findShade(DEFAULT_PALETTE, "accent500")!,
      light: findShade(palette, "accent200") ?? findShade(DEFAULT_PALETTE, "accent200")!,
      dark: findShade(palette, "accent700") ?? findShade(DEFAULT_PALETTE, "accent700")!,
    };
    return createAppTheme(colors, accent);
  }, [colors, activeColorTheme]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
};

export default AppThemeProvider;
