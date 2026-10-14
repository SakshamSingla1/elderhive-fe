import { useMemo } from "react";
import { request } from ".";
import { replaceUrlParams } from "../utils/helper";
import type { AuditableResponse, PageResponse } from "../utils/types";
import type { RoleStatusEnum } from "../utils/enums";

const ROLE_URLS = {
  BASE: "/roles",
  BY_ID: "/roles/:id",
};

// Mirrors com.elderhive.dtos.Role.RoleResponse field-for-field.
export interface RoleResponse extends AuditableResponse {
  id: number;
  name: string;
  description?: string | null;
  status: RoleStatusEnum;
  // Current Permission.code set granted to this role — read-only here; assigning/
  // unassigning is usePermissionService.ts's job (Prompt 26's PermissionController).
  permissionCodes: string[];
}

// Mirrors com.elderhive.dtos.Role.RoleRequest field-for-field.
export interface RolePayload {
  name: string;
  description?: string;
  status?: RoleStatusEnum;
}

// ROLE_MANAGE-gated CRUD (see RoleController) for a later Admin > Roles page — every
// endpoint here is Super-Admin-only in practice today, since the seeder keeps
// ROLE_MANAGE out of the curated "Admin" role (AdminBootstrapSeeder, Prompt 24).
export const useRoleService = () => {
  return useMemo(
    () => ({
      getAll: (page = 0, size = 50) =>
        request<PageResponse<RoleResponse>>("GET", ROLE_URLS.BASE, null, { params: { page, size } }),
      getById: (id: number) => request<RoleResponse>("GET", replaceUrlParams(ROLE_URLS.BY_ID, { id })),
      create: (payload: RolePayload) => request<RoleResponse>("POST", ROLE_URLS.BASE, payload),
      update: (id: number, payload: RolePayload) =>
        request<RoleResponse>("PUT", replaceUrlParams(ROLE_URLS.BY_ID, { id }), payload),
      remove: (id: number) => request<string>("DELETE", replaceUrlParams(ROLE_URLS.BY_ID, { id })),
    }),
    []
  );
};
