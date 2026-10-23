import { useMemo } from "react";
import { request } from ".";
import { replaceUrlParams } from "../utils/helper";
import type { AuditableResponse, PageResponse } from "../utils/types";
import type { UserStatusEnum, UserTypeEnum } from "../utils/enums";

const ADMIN_USER_URLS = {
  BASE: "/api/v1/admin/users",
  BY_ID: "/api/v1/admin/users/:id",
  SUSPEND: "/api/v1/admin/users/:id/suspend",
  ROLES: "/api/v1/admin/users/:id/roles",
  ROLE_BY_TYPE: "/api/v1/admin/users/:id/roles/:roleType",
};

// Mirrors com.elderhive.dtos.User.AdminUserResponse field-for-field (Prompt 93).
export interface AdminUserResponse extends AuditableResponse {
  id: number;
  email: string;
  fullName: string | null;
  phone: string | null;
  primaryRole: UserTypeEnum;
  status: UserStatusEnum;
  roles: UserTypeEnum[];
}

export interface AdminUserFilterParams {
  search?: string;
  userType?: UserTypeEnum;
  status?: UserStatusEnum;
  page?: number;
  size?: number;
}

// USER_MANAGE-gated (AdminUserController, Prompt 93); granting/revoking ADMIN or
// SUPER_ADMIN specifically additionally requires the caller to be SUPER_ADMIN -
// enforced server-side (AdminUserServiceImpl#requireSuperAdmin), mirrored client-side by
// ManageUserRolesDialog's own callerIsSuperAdmin prop.
export const useAdminUserService = () => {
  return useMemo(
    () => ({
      getAll: (filters: AdminUserFilterParams = {}) => {
        const { page = 0, size = 20, search, userType, status } = filters;
        return request<PageResponse<AdminUserResponse>>("GET", ADMIN_USER_URLS.BASE, null, {
          params: { page, size, search, userType, status },
        });
      },
      getById: (id: number) => request<AdminUserResponse>("GET", replaceUrlParams(ADMIN_USER_URLS.BY_ID, { id })),
      suspend: (id: number) => request<AdminUserResponse>("PUT", replaceUrlParams(ADMIN_USER_URLS.SUSPEND, { id })),
      grantRole: (id: number, roleType: UserTypeEnum) =>
        request<AdminUserResponse>("POST", replaceUrlParams(ADMIN_USER_URLS.ROLES, { id }), { roleType }),
      revokeRole: (id: number, roleType: UserTypeEnum) =>
        request<AdminUserResponse>("DELETE", replaceUrlParams(ADMIN_USER_URLS.ROLE_BY_TYPE, { id, roleType })),
    }),
    []
  );
};
