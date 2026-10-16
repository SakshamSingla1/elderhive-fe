import { useMemo } from "react";
import { request } from ".";
import type { NotificationTypeEnum } from "../utils/enums";

const NOTIFICATION_PREFERENCE_URLS = {
  BASE: "/api/v1/notification-preferences",
};

// Mirrors com.elderhive.dtos.Notification.NotificationPreferenceResponse field-for-field —
// used both for GET's resolved per-type list and PUT's bulk-upsert request items.
export interface NotificationPreferenceDTO {
  type: NotificationTypeEnum;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  webPushEnabled: boolean;
}

// Separate from useNotificationService on purpose — mirrors the backend's own split
// (NotificationController vs. NotificationPreferenceController, Prompt 60's prerequisite
// backend work): preferences are their own resource with their own CRUD lifecycle, not
// something a notification-send call reads or writes.
export const useNotificationPreferenceService = () => {
  return useMemo(
    () => ({
      getPreferences: () => request<NotificationPreferenceDTO[]>("GET", NOTIFICATION_PREFERENCE_URLS.BASE),
      updatePreferences: (preferences: NotificationPreferenceDTO[]) =>
        request<NotificationPreferenceDTO[]>("PUT", NOTIFICATION_PREFERENCE_URLS.BASE, { preferences }),
    }),
    []
  );
};
