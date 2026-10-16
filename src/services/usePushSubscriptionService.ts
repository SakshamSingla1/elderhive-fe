import { useMemo } from "react";
import { request } from ".";

const PUSH_SUBSCRIPTION_URLS = {
  BASE: "/api/v1/push-subscriptions",
  VAPID_PUBLIC_KEY: "/api/v1/push-subscriptions/vapid-public-key",
};

// Shape a browser's PushSubscription.toJSON() produces — mirrors
// com.elderhive.dtos.PushSubscription.PushSubscriptionRequest.
export interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface VapidPublicKeyResponse {
  publicKey: string;
}

// Mirrors com.elderhive.controllers.PushSubscriptionController (Prompt 56 + the Prompt 60
// prerequisite's vapid-public-key addition) directly — flat /api/v1/push-subscriptions, not
// ElderSphere's nested /users/me/push-subscriptions.
export const usePushSubscriptionService = () => {
  return useMemo(
    () => ({
      getVapidPublicKey: () => request<VapidPublicKeyResponse>("GET", PUSH_SUBSCRIPTION_URLS.VAPID_PUBLIC_KEY),
      subscribe: (subscription: PushSubscriptionJSON) =>
        request<string>("POST", PUSH_SUBSCRIPTION_URLS.BASE, subscription),
      unsubscribe: (endpoint: string) =>
        request<string>("DELETE", PUSH_SUBSCRIPTION_URLS.BASE, { endpoint }),
    }),
    []
  );
};
