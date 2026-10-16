import { useMemo } from "react";
import { request } from ".";
import { replaceUrlParams } from "../utils/helper";
import type { PageResponse } from "../utils/types";
import type { NotificationTypeEnum } from "../utils/enums";

const NOTIFICATION_URLS = {
  BASE: "/api/v1/notifications",
  UNREAD_COUNT: "/api/v1/notifications/unread-count",
  READ: "/api/v1/notifications/:id/read",
  READ_ALL: "/api/v1/notifications/read-all",
};

// Mirrors com.elderhive.dtos.Notification.NotificationResponse field-for-field.
export interface NotificationResponseDTO {
  id: number;
  type: NotificationTypeEnum;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

// No remove()/delete() here — unlike ElderSphere's reference service, ElderHive's
// NotificationController doesn't expose a DELETE endpoint (not asked for by this prompt's
// "full list, mark-read" scope), so there's nothing to call.
export const useNotificationService = () => {
  return useMemo(
    () => ({
      list: (page = 0, size = 10) =>
        request<PageResponse<NotificationResponseDTO>>("GET", NOTIFICATION_URLS.BASE, null, { params: { page, size } }),
      unreadCount: () => request<number>("GET", NOTIFICATION_URLS.UNREAD_COUNT),
      markAsRead: (id: number) => request<string>("PUT", replaceUrlParams(NOTIFICATION_URLS.READ, { id })),
      markAllAsRead: () => request<string>("PUT", NOTIFICATION_URLS.READ_ALL),
    }),
    []
  );
};
