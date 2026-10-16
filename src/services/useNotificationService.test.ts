import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./index";
import { useNotificationService } from "./useNotificationService";

vi.mock("./index", () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe("useNotificationService", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined);
  });

  it("list hits GET /api/v1/notifications with page/size params, defaulting to page 0 size 10", async () => {
    const { result } = renderHook(() => useNotificationService());
    await result.current.list();
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/notifications", null, { params: { page: 0, size: 10 } });
  });

  it("list passes through an explicit page/size", async () => {
    const { result } = renderHook(() => useNotificationService());
    await result.current.list(2, 6);
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/notifications", null, { params: { page: 2, size: 6 } });
  });

  it("unreadCount hits GET /api/v1/notifications/unread-count", async () => {
    const { result } = renderHook(() => useNotificationService());
    await result.current.unreadCount();
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/notifications/unread-count");
  });

  it("markAsRead hits PUT /api/v1/notifications/:id/read with the id substituted", async () => {
    const { result } = renderHook(() => useNotificationService());
    await result.current.markAsRead(42);
    expect(mockedRequest).toHaveBeenCalledWith("PUT", "/api/v1/notifications/42/read");
  });

  it("markAllAsRead hits PUT /api/v1/notifications/read-all", async () => {
    const { result } = renderHook(() => useNotificationService());
    await result.current.markAllAsRead();
    expect(mockedRequest).toHaveBeenCalledWith("PUT", "/api/v1/notifications/read-all");
  });
});
