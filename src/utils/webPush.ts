// Web Push helpers — VAPID key conversion and feature-detection, ported close to verbatim
// from ElderSphere's utils/webPush.ts. Kept out of hooks/useWebPushSubscription.ts so the
// (well-known but easy to get subtly wrong) base64url -> Uint8Array conversion has one
// tested home.

/**
 * Converts a VAPID public key delivered as a base64url string (the shape
 * GET /api/v1/push-subscriptions/vapid-public-key returns, and the shape
 * PushManager.subscribe requires as applicationServerKey) into the Uint8Array the Push API
 * actually wants.
 *
 * Standard recipe: base64url uses "-"/"_" instead of "+"/"/" and typically omits padding, so
 * both are restored before the browser's built-in atob does the heavy lifting.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}
