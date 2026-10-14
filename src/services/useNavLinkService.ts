import { useMemo } from "react";
import { request } from ".";
import { replaceUrlParams } from "../utils/helper";
import type { AuditableResponse, PageResponse } from "../utils/types";
import type { NavLinkStatusEnum } from "../utils/enums";

const NAV_LINK_URLS = {
  BASE: "/nav-links",
  BY_ID: "/nav-links/:id",
  ME: "/nav-links/me",
};

// Mirrors com.elderhive.dtos.NavLink.NavLinkResponse field-for-field — no userType here,
// unlike ElderSphere's equivalent: ElderHive's NavLink (Phase 3, Prompt 21) only ever
// models the admin portal's own sidebar.
export interface NavLinkResponse extends AuditableResponse {
  id: number;
  navGroup?: string | null;
  navIndex: number;
  name: string;
  path: string;
  icon?: string | null;
  requiredPermission?: string | null;
  superAdminOnly: boolean;
  status: NavLinkStatusEnum;
}

// Mirrors com.elderhive.dtos.NavLink.NavLinkRequest field-for-field.
export interface NavLinkPayload {
  navGroup?: string;
  navIndex?: number;
  name: string;
  path: string;
  icon?: string;
  requiredPermission?: string;
  superAdminOnly?: boolean;
  status?: NavLinkStatusEnum;
}

// Sidebar navigation items, DB-backed (see NavLinkController) — getMine() is what
// hooks/useSidebarNavItems.ts calls to build the admin portal's sidebar; the rest is the
// NAVLINK_MANAGE-gated CRUD for a later Admin > Navigation Links page.
export const useNavLinkService = () => {
  return useMemo(
    () => ({
      getMine: () => request<NavLinkResponse[]>("GET", NAV_LINK_URLS.ME),
      create: (payload: NavLinkPayload) => request<NavLinkResponse>("POST", NAV_LINK_URLS.BASE, payload),
      update: (id: number, payload: NavLinkPayload) =>
        request<NavLinkResponse>("PUT", replaceUrlParams(NAV_LINK_URLS.BY_ID, { id }), payload),
      getById: (id: number) => request<NavLinkResponse>("GET", replaceUrlParams(NAV_LINK_URLS.BY_ID, { id })),
      list: (page = 0, size = 50) =>
        request<PageResponse<NavLinkResponse>>("GET", NAV_LINK_URLS.BASE, null, { params: { page, size } }),
      remove: (id: number) => request<string>("DELETE", replaceUrlParams(NAV_LINK_URLS.BY_ID, { id })),
    }),
    []
  );
};
