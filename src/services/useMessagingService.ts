import { useMemo } from "react";
import { request } from ".";
import { replaceUrlParams } from "../utils/helper";
import type { AuditableResponse, PageResponse } from "../utils/types";

const MESSAGING_URLS = {
  CONVERSATIONS: "/api/v1/conversations",
  MESSAGES: "/api/v1/conversations/:id/messages",
  READ: "/api/v1/conversations/:id/read",
};

// Mirrors com.elderhive.dtos.Messaging.ConversationResponse field-for-field.
export interface ConversationResponse extends AuditableResponse {
  id: number;
  userAId: number;
  userBId: number;
  otherUserId: number;
  otherUserName: string | null;
  bookingId: number | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

// Mirrors com.elderhive.dtos.Messaging.MessageResponse field-for-field.
export interface MessageResponse {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string | null;
  content: string | null;
  sentAt: string;
  readAt: string | null;
  fileAssetId: number | null;
  fileUrl: string | null;
}

export interface ConversationCreatePayload {
  otherUserId: number;
  bookingId?: number;
}

/**
 * The REST side of messaging only - there is deliberately no sendMessage() here. Realtime
 * send is STOMP-only (ChatWebSocketController's own @MessageMapping
 * "/conversations/{id}/send", Prompt 89 - there's no matching REST endpoint at all), so
 * Messages.page.tsx calls useWebSocket().publish() directly for that, the same way it
 * subscribes to /topic/conversations/{id} directly rather than through this service.
 */
export const useMessagingService = () => {
  return useMemo(
    () => ({
      // Reuses the existing 1:1 conversation with otherUserId (optionally scoped to the
      // same bookingId) if one already exists, or creates one.
      getOrCreateConversation: (payload: ConversationCreatePayload) =>
        request<ConversationResponse>("POST", MESSAGING_URLS.CONVERSATIONS, payload),
      getMyConversations: (page = 0, size = 20) =>
        request<PageResponse<ConversationResponse>>("GET", MESSAGING_URLS.CONVERSATIONS, null, { params: { page, size } }),
      // Paginated, oldest-first within the returned page (ConversationController's own
      // findByConversationIdOrderBySentAtAsc) - unlike ElderSphere's own cursor-based
      // "beforeId" history, ElderHive's backend only supports plain page/size paging, so a
      // generous default size covers a typical conversation's full history in one call;
      // Messages.page.tsx's own "Load more" just requests the next page (continuing
      // forward in time, not backward) for the rare conversation that exceeds it.
      getMessages: (conversationId: number, page = 0, size = 50) =>
        request<PageResponse<MessageResponse>>("GET", replaceUrlParams(MESSAGING_URLS.MESSAGES, { id: conversationId }), null, {
          params: { page, size },
        }),
      markRead: (conversationId: number) =>
        request<void>("PUT", replaceUrlParams(MESSAGING_URLS.READ, { id: conversationId })),
    }),
    []
  );
};
