import { useMemo } from "react";
import { request } from ".";
import { replaceUrlParams } from "../utils/helper";
import type { AuditableResponse } from "../utils/types";

const USER_THEME_URLS = {
  BASE: "/api/v1/user-themes",
  BY_THEME_ID: "/api/v1/user-themes/theme/:themeId",
  COUNT_BY_THEME_ID: "/api/v1/user-themes/theme/:themeId/count",
};

// Mirrors com.elderhive.dtos.UserTheme.UserThemeResponse field-for-field. id/createdAt/
// updatedAt/createdBy/updatedBy are null when this was resolved via the backend's
// default-theme fallback rather than a persisted UserThemeMapping row (no mapping yet for
// this user) — see UserThemeService#getThemeByUserId's own javadoc.
export interface UserThemeResponse extends AuditableResponse {
  id: number | null;
  userId: number;
  userEmail: string | null;
  userFullName?: string | null;
  themeId: number;
  themeName: string;
  createdBy?: number | null;
  updatedBy?: number | null;
}

// Renamed from Portfolio's useProfileThemeService.ts (profile -> user). GET/POST/DELETE
// resolve to the caller's own mapping (no id param - the backend reads it from the
// JWT-backed SecurityContext, see UserThemeController#currentUser). The by-theme reverse
// lookups are ADMIN-with-THEME_MANAGE-only on the backend — a deliberate hardening vs.
// Portfolio, which left its equivalent endpoints open to any authenticated caller, since
// they expose other users' email/full name.
export const useUserThemeService = () => {
  return useMemo(
    () => ({
      getActiveTheme: () => request<UserThemeResponse>("GET", USER_THEME_URLS.BASE),
      setActiveTheme: (themeId: number) =>
        request<UserThemeResponse>("POST", USER_THEME_URLS.BASE, { themeId }),
      resetTheme: () => request<string>("DELETE", USER_THEME_URLS.BASE),
      getUsersByTheme: (themeId: number) =>
        request<UserThemeResponse[]>("GET", replaceUrlParams(USER_THEME_URLS.BY_THEME_ID, { themeId })),
      countUsersByTheme: (themeId: number) =>
        request<number>("GET", replaceUrlParams(USER_THEME_URLS.COUNT_BY_THEME_ID, { themeId })),
    }),
    []
  );
};
