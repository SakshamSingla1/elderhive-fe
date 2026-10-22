import { useMemo } from "react";
import { request } from ".";
import { replaceUrlParams } from "../utils/helper";
import type { AuditableResponse } from "../utils/types";
import type { EmergencyAlertStatusEnum } from "../utils/enums";

const EMERGENCY_ALERT_URLS = {
  BASE: "/api/v1/emergency-alerts",
  NEARBY: "/api/v1/emergency-alerts/nearby",
  CLAIM: "/api/v1/emergency-alerts/:id/claim",
  RESOLVE: "/api/v1/emergency-alerts/:id/resolve",
};

// Mirrors com.elderhive.dtos.Emergency.EmergencyAlertResponse field-for-field.
// dispatch-override (Prompt 84's remaining endpoint) has no frontend caller yet - that's
// Prompt 87 (admin).
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

// Trigger (Prompt 83, ELDER/FAMILY_MEMBER) plus the caretaker claim/resolve/nearby-queue
// endpoints (Prompt 84/86, CARETAKER) - dispatch-override (ADMIN) isn't called from
// anywhere in the frontend yet.
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
    }),
    []
  );
};
