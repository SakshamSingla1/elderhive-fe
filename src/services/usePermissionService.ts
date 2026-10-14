import { useMemo } from "react";
import { request } from ".";
import { replaceUrlParams } from "../utils/helper";

const PERMISSION_URLS = {
  BASE: "/permissions",
  ASSIGN_OR_UNASSIGN: "/permissions/roles/:roleId/:permissionId",
};

// Mirrors com.elderhive.dtos.Permission.PermissionResponse field-for-field.
export interface PermissionResponse {
  id: number;
  code: string;
  description?: string | null;
}

// Read-only listing + role-permission assign/unassign (see PermissionController) — no
// create/delete here: the permission catalog is seeder-owned (AdminBootstrapSeeder,
// Prompt 24), never created through the API. ROLE_MANAGE-gated, same as useRoleService.
export const usePermissionService = () => {
  return useMemo(
    () => ({
      getAll: () => request<PermissionResponse[]>("GET", PERMISSION_URLS.BASE),
      assignToRole: (roleId: number, permissionId: number) =>
        request<string>("POST", replaceUrlParams(PERMISSION_URLS.ASSIGN_OR_UNASSIGN, { roleId, permissionId })),
      unassignFromRole: (roleId: number, permissionId: number) =>
        request<string>("DELETE", replaceUrlParams(PERMISSION_URLS.ASSIGN_OR_UNASSIGN, { roleId, permissionId })),
    }),
    []
  );
};
