import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./index";
import { usePushSubscriptionService } from "./usePushSubscriptionService";

vi.mock("./index", () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe("usePushSubscriptionService", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined);
  });

  it("getVapidPublicKey hits GET /api/v1/push-subscriptions/vapid-public-key", async () => {
    const { result } = renderHook(() => usePushSubscriptionService());
    await result.current.getVapidPublicKey();
    expect(mockedRequest).toHaveBeenCalledWith("GET", "/api/v1/push-subscriptions/vapid-public-key");
  });

  it("subscribe posts the subscription JSON to /api/v1/push-subscriptions", async () => {
    const { result } = renderHook(() => usePushSubscriptionService());
    const subscription = { endpoint: "https://push.example.com/ep/1", keys: { p256dh: "p", auth: "a" } };
    await result.current.subscribe(subscription);
    expect(mockedRequest).toHaveBeenCalledWith("POST", "/api/v1/push-subscriptions", subscription);
  });

  it("unsubscribe deletes with { endpoint } in the body", async () => {
    const { result } = renderHook(() => usePushSubscriptionService());
    await result.current.unsubscribe("https://push.example.com/ep/1");
    expect(mockedRequest).toHaveBeenCalledWith("DELETE", "/api/v1/push-subscriptions", { endpoint: "https://push.example.com/ep/1" });
  });
});
