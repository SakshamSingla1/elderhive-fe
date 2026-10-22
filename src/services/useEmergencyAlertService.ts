import { useMemo } from "react";
import { request } from ".";
import { replaceUrlParams } from "../utils/helper";
import type { AuditableResponse, PageResponse } from "../utils/types";
import type { EmergencyAlertStatusEnum } from "../utils/enums";

const EMERGENCY_ALERT_URLS = {
  BASE: "/api/v1/emergency-alerts",
  NEARBY: "/api/v1/emergency-alerts/nearby",
  BY_ID: "/api/v1/emergency-alerts/:id",
  CLAIM: "/api/v1/emergency-alerts/:id/claim",
  RESOLVE: "/api/v1/emergency-alerts/:id/resolve",
  DISPATCH_OVERRIDE: "/api/v1/emergency-alerts/:id/dispatch-override",
};

// Mirrors com.elderhive.dtos.Emergency.EmergencyAlertResponse field-for-field.
export interface EmergencyAlertResponse extends AuditableResponse {
  id: number;
  elderProfileId: number;
  elderName: string | null;
  triggeredByUserId: number;
  latitude: number;
  longitude: number;
  address: string | null;
  status: EmergencyAlertStatusEnum;
  respondingCaretakerId: number | null;
  respondingCaretakerName: string | null;
  responseTimeSeconds: number | null;
  isOverdue: boolean;
  // Only set by getNearby() below (the requesting caretaker's own distance to this
  // specific alert) - null from every other call, which has no single caretaker
  // viewpoint to measure a distance from.
  distanceKm: number | null;
}

// Mirrors com.elderhive.dtos.Emergency.EmergencyAlertTriggerRequest field-for-field - all
// three fields are @NotNull server-side (EmergencyAlert.latitude/longitude are themselves
// NOT NULL columns, Prompt 81), so the caller must always have a real GPS fix before
// calling trigger().
export interface EmergencyAlertTriggerPayload {
  elderProfileId: number;
  latitude: number;
  longitude: number;
}

export interface EmergencyAlertFilterParams {
  elderProfileId?: number;
  status?: EmergencyAlertStatusEnum;
  page?: number;
  size?: number;
}

// Mirrors com.elderhive.dtos.Emergency.EmergencyAlertDispatchOverrideRequest - exactly one
// of the two fields must be set (checked server-side), never both or neither.
export interface EmergencyAlertDispatchOverridePayload {
  respondingCaretakerId?: number;
  forceResolve?: boolean;
}

// Trigger (Prompt 83, ELDER/FAMILY_MEMBER), the caretaker claim/resolve/nearby-queue
// endpoints (Prompt 84/86, CARETAKER), and admin oversight getAll/getById/dispatchOverride
// (Prompt 87, EMERGENCY_DISPATCH-gated server-side).
export const useEmergencyAlertService = () => {
  return useMemo(
    () => ({
      trigger: (payload: EmergencyAlertTriggerPayload) =>
        request<EmergencyAlertResponse>("POST", EMERGENCY_ALERT_URLS.BASE, payload),
      // Every TRIGGERED/ACKNOWLEDGED alert the caller's own CaretakerProfile currently
      // matches via proximity, nearest-first (EmergencyAlertServiceImpl#findNearbyActiveAlerts).
      getNearby: () => request<EmergencyAlertResponse[]>("GET", EMERGENCY_ALERT_URLS.NEARBY),
      claim: (id: number) => request<EmergencyAlertResponse>("PUT", replaceUrlParams(EMERGENCY_ALERT_URLS.CLAIM, { id })),
      resolve: (id: number) => request<EmergencyAlertResponse>("PUT", replaceUrlParams(EMERGENCY_ALERT_URLS.RESOLVE, { id })),
      // Admin oversight - every alert on the platform, optionally filtered.
      getAll: (filters: EmergencyAlertFilterParams = {}) => {
        const { page = 0, size = 20, elderProfileId, status } = filters;
        return request<PageResponse<EmergencyAlertResponse>>("GET", EMERGENCY_ALERT_URLS.BASE, null, {
          params: { page, size, elderProfileId, status },
        });
      },
      getById: (id: number) => request<EmergencyAlertResponse>("GET", replaceUrlParams(EMERGENCY_ALERT_URLS.BY_ID, { id })),
      dispatchOverride: (id: number, payload: EmergencyAlertDispatchOverridePayload) =>
        request<EmergencyAlertResponse>("PUT", replaceUrlParams(EMERGENCY_ALERT_URLS.DISPATCH_OVERRIDE, { id }), payload),
    }),
    []
  );
};
