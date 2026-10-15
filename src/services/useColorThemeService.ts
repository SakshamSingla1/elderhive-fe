import { useMemo } from "react";
import { request } from ".";
import { replaceUrlParams } from "../utils/helper";
import type { AuditableResponse, PageResponse } from "../utils/types";
import type { ColorThemeStatusEnum } from "../utils/enums";

const COLOR_THEME_URLS = {
  BASE: "/api/v1/color-themes",
  BY_ID: "/api/v1/color-themes/:id",
};

// Mirrors com.elderhive.dtos.ColorTheme.ColorShadeDTO field-for-field.
export interface ColorShade {
  colorName: string;
  colorCode: string;
}

// Mirrors com.elderhive.dtos.ColorTheme.ColorGroupDTO field-for-field.
export interface ColorGroup {
  groupName: string;
  colorShades: ColorShade[];
}

// Mirrors com.elderhive.dtos.ColorTheme.ColorPaletteDTO field-for-field.
export interface ColorPalette {
  colorGroups: ColorGroup[];
}

// Mirrors com.elderhive.dtos.ColorTheme.ColorThemeResponse field-for-field.
export interface ColorThemeResponse extends AuditableResponse {
  id: number;
  themeName: string;
  palette: ColorPalette;
  status: ColorThemeStatusEnum;
  createdBy?: number | null;
  updatedBy?: number | null;
}

// Mirrors com.elderhive.dtos.ColorTheme.ColorThemeRequest field-for-field.
export interface ColorThemePayload {
  themeName: string;
  palette?: ColorPalette;
  status?: ColorThemeStatusEnum;
}

export interface ColorThemeFilters {
  search?: string;
  status?: ColorThemeStatusEnum;
  page?: number;
  size?: number;
}

// Theme-catalog CRUD (see ColorThemeController) for a later Admin > Themes page.
// Mutations are SUPER_ADMIN-only on the backend (a direct hasRole check, not the Phase 3
// ROLE_MANAGE-style permission system — the theme catalog is a platform-level asset, not
// a per-tenant admin capability); reads are open to any authenticated user, since every
// role browses this catalog to apply a theme to its own dashboard (see
// useUserThemeService.ts).
export const useColorThemeService = () => {
  return useMemo(
    () => ({
      getColorTheme: (filters: ColorThemeFilters = {}) => {
        const { page = 0, size = 50, search, status } = filters;
        return request<PageResponse<ColorThemeResponse>>("GET", COLOR_THEME_URLS.BASE, null, {
          params: { page, size, search, status },
        });
      },
      getColorThemeById: (id: number) =>
        request<ColorThemeResponse>("GET", replaceUrlParams(COLOR_THEME_URLS.BY_ID, { id })),
      createColorTheme: (payload: ColorThemePayload) =>
        request<ColorThemeResponse>("POST", COLOR_THEME_URLS.BASE, payload),
      updateColorTheme: (id: number, payload: ColorThemePayload) =>
        request<ColorThemeResponse>("PUT", replaceUrlParams(COLOR_THEME_URLS.BY_ID, { id }), payload),
      deleteColorTheme: (id: number) =>
        request<string>("DELETE", replaceUrlParams(COLOR_THEME_URLS.BY_ID, { id })),
    }),
    []
  );
};
