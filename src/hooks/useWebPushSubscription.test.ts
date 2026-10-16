import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWebPushSubscription } from "./useWebPushSubscription";
import { usePushSubscriptionService } from "../services/usePushSubscriptionService";
import * as webPush from "../utils/webPush";

vi.mock("../services/usePushSubscriptionService", () => ({
  usePushSubscriptionService: vi.fn(),
}));

const mockedUsePushSubscriptionService = vi.mocked(usePushSubscriptionService);

describe("useWebPushSubscription", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error - cleaning up test-only globals
    delete global.Notification;
    // @ts-expect-error - cleaning up test-only globals
    delete navigator.serviceWorker;
  });

  it("reports unsupported when the browser has no Push API (the real jsdom default)", async () => {
    mockedUsePushSubscriptionService.mockReturnValue({
      getVapidPublicKey: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    });

    const { result } = renderHook(() => useWebPushSubscription());

    await waitFor(() => expect(result.current.status).toBe("unsupported"));
  });

  describe("when the Push API is supported", () => {
    let getSubscription: ReturnType<typeof vi.fn>;
    let subscribe: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.spyOn(webPush, "isPushSupported").mockReturnValue(true);
      vi.spyOn(webPush, "urlBase64ToUint8Array").mockReturnValue(new Uint8Array([1, 2, 3]));

      getSubscription = vi.fn();
      subscribe = vi.fn();

      // @ts-expect-error - minimal test double of ServiceWorkerRegistration
      navigator.serviceWorker = {
        ready: Promise.resolve({
          pushManager: { getSubscription, subscribe },
        }),
      };

      // @ts-expect-error - minimal test double of the Notification global
      global.Notification = {
        permission: "default",
        requestPermission: vi.fn().mockResolvedValue("granted"),
      };
    });

    it("reports unsubscribed when no subscription exists yet", async () => {
      getSubscription.mockResolvedValue(null);
      mockedUsePushSubscriptionService.mockReturnValue({
        getVapidPublicKey: vi.fn(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
      });

      const { result } = renderHook(() => useWebPushSubscription());

      await waitFor(() => expect(result.current.status).toBe("unsubscribed"));
    });

    it("reports subscribed when a subscription already exists", async () => {
      getSubscription.mockResolvedValue({ endpoint: "https://push.example.com/ep/1" });
      mockedUsePushSubscriptionService.mockReturnValue({
        getVapidPublicKey: vi.fn(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
      });

      const { result } = renderHook(() => useWebPushSubscription());

      await waitFor(() => expect(result.current.status).toBe("subscribed"));
    });

    it("subscribe() requests permission, subscribes via the Push API, and registers with the backend", async () => {
      getSubscription.mockResolvedValue(null);
      subscribe.mockResolvedValue({
        toJSON: () => ({ endpoint: "https://push.example.com/ep/new", keys: { p256dh: "p", auth: "a" } }),
      });
      const registerBackend = vi.fn().mockResolvedValue(undefined);
      mockedUsePushSubscriptionService.mockReturnValue({
        getVapidPublicKey: vi.fn().mockResolvedValue({ publicKey: "server-public-key" }),
        subscribe: registerBackend,
        unsubscribe: vi.fn(),
      });

      const { result } = renderHook(() => useWebPushSubscription());
      await waitFor(() => expect(result.current.status).toBe("unsubscribed"));

      await act(async () => {
        await result.current.subscribe();
      });

      expect(registerBackend).toHaveBeenCalledWith({
        endpoint: "https://push.example.com/ep/new",
        keys: { p256dh: "p", auth: "a" },
      });
      expect(result.current.status).toBe("subscribed");
    });

    it("subscribe() stops at denied permission without calling the Push API", async () => {
      getSubscription.mockResolvedValue(null);
      global.Notification.requestPermission = vi.fn().mockResolvedValue("denied");
      mockedUsePushSubscriptionService.mockReturnValue({
        getVapidPublicKey: vi.fn(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
      });

      const { result } = renderHook(() => useWebPushSubscription());
      await waitFor(() => expect(result.current.status).toBe("unsubscribed"));

      await act(async () => {
        await result.current.subscribe();
      });

      expect(subscribe).not.toHaveBeenCalled();
      expect(result.current.status).toBe("denied");
    });

    it("unsubscribe() removes the backend registration and the browser subscription", async () => {
      const existing = { endpoint: "https://push.example.com/ep/1", unsubscribe: vi.fn().mockResolvedValue(true) };
      getSubscription.mockResolvedValue(existing);
      const removeBackend = vi.fn().mockResolvedValue(undefined);
      mockedUsePushSubscriptionService.mockReturnValue({
        getVapidPublicKey: vi.fn(),
        subscribe: vi.fn(),
        unsubscribe: removeBackend,
      });

      const { result } = renderHook(() => useWebPushSubscription());
      await waitFor(() => expect(result.current.status).toBe("subscribed"));

      await act(async () => {
        await result.current.unsubscribe();
      });

      expect(removeBackend).toHaveBeenCalledWith("https://push.example.com/ep/1");
      expect(existing.unsubscribe).toHaveBeenCalledTimes(1);
      expect(result.current.status).toBe("unsubscribed");
    });
  });
});
