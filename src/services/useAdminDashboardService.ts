import { useMemo } from "react";
import { request } from ".";
import type { UserTypeEnum } from "../utils/enums";

const ADMIN_DASHBOARD_URLS = {
  STATS: "/api/v1/dashboard/stats",
};

// Mirrors com.elderhive.dtos.Dashboard.AdminDashboardStatsResponse field-for-field
// (Prompt 94). activeUsersByRole always has one entry per UserTypeEnum value (zero
// included), so the page can render a fixed set of role cards without a missing-key check.
export interface AdminDashboardStatsResponse {
  activeUsersByRole: Record<UserTypeEnum, number>;
  bookingsThisWeek: number;
  openEmergencyAlerts: number;
  overdueEmergencyAlerts: number;
  pendingCaretakerVerifications: number;
}

// DASHBOARD_VIEW-gated (AdminDashboardController, Prompt 94) - both Admin and Super Admin
// hold it per AdminBootstrapSeeder's seeding.
export const useAdminDashboardService = () => {
  return useMemo(
    () => ({
      getStats: () => request<AdminDashboardStatsResponse>("GET", ADMIN_DASHBOARD_URLS.STATS),
    }),
    []
  );
};
