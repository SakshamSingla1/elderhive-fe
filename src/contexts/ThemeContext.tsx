import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuthenticatedUser } from "./AuthenticatedUserContext";
import { useColorThemeService } from "../services/useColorThemeService";
import type { ColorThemeResponse } from "../services/useColorThemeService";
import { useUserThemeService } from "../services/useUserThemeService";

const STORAGE_KEY = "theme";

/**
 * The shape components/atoms/ColorPicker's eventual Theme Builder page (Prompt 49) hands
 * to setActiveTheme for an instant, no-reload preview of just the two colors that most
 * define a theme's identity — mirrors Portfolio's ThemeColors exactly. This is the
 * LIGHTER of this file's two styling mechanisms; the heavier one (the full
 * neutral/primary/success/error/warning scale every component actually reads day to day)
 * is useColors() + ThemeInjector, driven by activeColorTheme below instead.
 */
export interface ThemeColors {
  primary: string;
  accent: string;
  background: string;
  foreground: string;
  card: string;
  muted: string;
  border: string;
}

export interface ThemeContextType {
  isDark: boolean;
  isPreviewActive: boolean;
  activeThemeName: string;
  /**
   * The full ColorTheme (with its palette) currently backing useColors() — null until
   * the on-login fetch below resolves, in which case useColors() falls back to Prompt
   * 45's seeded DEFAULT_PALETTE. Not part of Portfolio's ThemeContextType (Portfolio
   * reads this off useAuthenticatedUser() instead); it lives here because ElderHive's
   * AuthenticatedUserContext (Prompt 30) is deliberately user-identity-only, and adding
   * theme data to it would entangle two independent concerns for no benefit.
   */
  activeColorTheme: ColorThemeResponse | null;
  setColorMode: (mode: "light" | "dark") => void;
  setActiveTheme: (themeName: string, colors: ThemeColors) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthenticatedUser();
  const userThemeService = useUserThemeService();
  const colorThemeService = useColorThemeService();

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [activeThemeName, setActiveThemeName] = useState("Default");
  const [activeColorTheme, setActiveColorTheme] = useState<ColorThemeResponse | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  // On login (including a cached session restored on page load, since `user` is already
  // non-null then), resolve the user's active theme id (UserThemeService, Prompt 44) and
  // fetch that theme's full palette (ColorThemeService, Prompt 42/43) — UserThemeResponse
  // itself only carries themeId/themeName, not the palette useColors() actually needs.
  // Best-effort: any failure here (network hiccup, nothing resolvable yet) just leaves
  // activeColorTheme null, and useColors() falls back to the seeded default rather than
  // blocking the rest of the app on a styling concern.
  useEffect(() => {
    if (!user) {
      setActiveColorTheme(null);
      return;
    }
    let cancelled = false;
    userThemeService
      .getActiveTheme()
      .then((userTheme) => colorThemeService.getColorThemeById(userTheme.themeId))
      .then((theme) => {
        if (!cancelled) setActiveColorTheme(theme);
      })
      .catch(() => {
        if (!cancelled) setActiveColorTheme(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const setActiveTheme = useCallback((themeName: string, colors: ThemeColors) => {
    const root = document.documentElement;
    root.style.setProperty("--color-primary", colors.primary);
    root.style.setProperty("--color-accent", colors.accent);
    setActiveThemeName(themeName);
    setIsPreviewActive(true);
  }, []);

  const setColorMode = useCallback((mode: "light" | "dark") => {
    setIsDark(mode === "dark");
  }, []);

  const resetTheme = useCallback(() => {
    const root = document.documentElement;
    root.style.removeProperty("--color-primary");
    root.style.removeProperty("--color-accent");
    setIsDark(false);
    setIsPreviewActive(false);
    setActiveThemeName("Default");
    localStorage.removeItem("customTheme");
  }, []);

  const value = useMemo<ThemeContextType>(
    () => ({
      isDark,
      isPreviewActive,
      activeThemeName,
      activeColorTheme,
      setColorMode,
      setActiveTheme,
      resetTheme,
    }),
    [isDark, isPreviewActive, activeThemeName, activeColorTheme, setColorMode, setActiveTheme, resetTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export default ThemeProvider;
