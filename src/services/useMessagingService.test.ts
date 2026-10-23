import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./index";
import { useMessagingService } from "./useMessagingService";
import type { ConversationCreatePayload } from "./useMessagingService";

vi.mock("./index", () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe("useMessagingService", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined);
  });

  it("getOrCreateConversation posts the exact payload to /api/v1/conversations", async () => {
    const { result } = renderHook(() => useMessagingService());
    const payload: ConversationCreatePayload = { otherUserId: 20, bookingId: 1 };
    await result.current.getOrCreateConversation(payload);
    expect(mockedRequest).toHaveBeenCalledWith("POST", "/api/v1/conversations", payload);
  });

  it("getMyConversations hits GET /api/v1/conversations with default pagination", async () => {
    const { result } = renderHook(() => useMessagingService());
    await result.current.getMyConversations();
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/conversations", null, { params: { page: 0, size: 20 } });
  });

  it("getMyConversations passes through explicit page/size", async () => {
    const { result } = renderHook(() => useMessagingService());
    await result.current.getMyConversations(2, 5);
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/conversations", null, { params: { page: 2, size: 5 } });
  });

  it("getMessages hits GET /api/v1/conversations/:id/messages with default pagination", async () => {
    const { result } = renderHook(() => useMessagingService());
    await result.current.getMessages(50);
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/conversations/50/messages", null, { params: { page: 0, size: 50 } });
  });

  it("getMessages passes through explicit page/size", async () => {
    const { result } = renderHook(() => useMessagingService());
    await result.current.getMessages(50, 1, 20);
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/conversations/50/messages", null, { params: { page: 1, size: 20 } });
  });

  it("markRead hits PUT /api/v1/conversations/:id/read", async () => {
    const { result } = renderHook(() => useMessagingService());
    await result.current.markRead(50);
    expect(mockedRequest).toHaveBeenCalledWith("PUT", "/api/v1/conversations/50/read");
  });
});
