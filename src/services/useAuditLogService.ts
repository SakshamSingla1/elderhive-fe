import { useMemo } from "react";
import { request } from ".";
import type { PageResponse } from "../utils/types";
import type { ActionType, EntityTypeEnum } from "../utils/enums";

const AUDIT_LOG_URLS = {
  BASE: "/audit-logs",
};

// Mirrors com.elderhive.dtos.AuditLog.AuditLogResponse field-for-field.
export interface AuditLogResponse {
  id: number;
  entityType: EntityTypeEnum;
  entityId: string;
  actionType: ActionType;
  actorUserId: number | null;
  actorEmail: string | null;
  data: string | null;
  timestamp: string;
}

export interface AuditLogFilter {
  page?: number;
  size?: number;
  entityType?: EntityTypeEnum;
  actionType?: ActionType;
  // ISO-8601 instants (e.g. from a date picker's .toISOString()) - bound AuditLog.timestamp
  // inclusively, same as AuditLogController's own `from`/`to` query params.
  from?: string;
  to?: string;
  // Spring Data Web's standard "field,direction" convention - AuditLogController takes a
  // plain `Pageable` parameter, so this is supported for free server-side even though
  // AuditLog.page.tsx (the only caller before Admin/Dashboard.page.tsx's own "Recent
  // Activity" widget) never needed to pass one. Omit for the unsorted default that page
  // already relies on - findByCriteria's own JPQL has no ORDER BY of its own.
  sort?: string;
}

// Read-only (see AuditLogController) - ROLE_MANAGE-gated, same as useRoleService/
// usePermissionService, Super-Admin-only in practice today.
export const useAuditLogService = () => {
  return useMemo(
    () => ({
      search: ({ page = 0, size = 20, entityType, actionType, from, to, sort }: AuditLogFilter = {}) =>
        request<PageResponse<AuditLogResponse>>("GET", AUDIT_LOG_URLS.BASE, null, {
          params: { page, size, entityType, actionType, from, to, sort },
        }),
    }),
    []
  );
};
