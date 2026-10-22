import { useMemo } from "react";
import { request } from ".";
import type { AuditableResponse } from "../utils/types";
import type { EmergencyAlertStatusEnum } from "../utils/enums";

const EMERGENCY_ALERT_URLS = {
  BASE: "/api/v1/emergency-alerts",
};

// Mirrors com.elderhive.dtos.Emergency.EmergencyAlertResponse field-for-field. claim/
// resolve/dispatch-override (Prompt 84's other endpoints) have no frontend caller yet -
// that's Prompt 86 (caretaker) and Prompt 87 (admin); respondingCaretakerId/Name,
// responseTimeSeconds and isOverdue are always null/false/unset coming out of trigger()
// below, but mirrored here now so this type is already correct once those prompts land.
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

// The SOS trigger (EmergencyAlertController, Prompt 83) - ELDER/FAMILY_MEMBER only
// server-side, with its own ownership check (elder self, family owner, or co-managing
// family) independent of that role gate.
export const useEmergencyAlertService = () => {
  return useMemo(
    () => ({
      trigger: (payload: EmergencyAlertTriggerPayload) =>
        request<EmergencyAlertResponse>("POST", EMERGENCY_ALERT_URLS.BASE, payload),
    }),
    []
  );
};
