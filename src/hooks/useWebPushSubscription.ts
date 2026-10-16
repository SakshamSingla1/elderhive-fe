import { useCallback, useEffect, useState } from "react";
import { usePushSubscriptionService } from "../services/usePushSubscriptionService";
import { isPushSupported, urlBase64ToUint8Array } from "../utils/webPush";

export type PushSubscriptionStatus = "unsupported" | "checking" | "subscribed" | "unsubscribed" | "denied";

// Drives the "Enable push notifications" toggle (see molecules/NotificationPreferences).
// Deliberately opt-in only — nothing here runs until the caller invokes subscribe(), so the
// app never auto-prompts for Notification permission on page load.
export const useWebPushSubscription = () => {
  const pushSubscriptionService = usePushSubscriptionService();
  const [status, setStatus] = useState<PushSubscriptionStatus>(isPushSupported() ? "checking" : "unsupported");
  const [busy, setBusy] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (!isPushSupported()) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      setStatus(existing ? "subscribed" : "unsubscribed");
    } catch {
      setStatus("unsubscribed");
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const subscribe = useCallback(async () => {
    if (!isPushSupported() || busy) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "unsubscribed");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const { publicKey } = await pushSubscriptionService.getVapidPublicKey();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = subscription.toJSON();
      await pushSubscriptionService.subscribe({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
      });
      setStatus("subscribed");
    } finally {
      setBusy(false);
    }
  }, [busy, pushSubscriptionService]);

  const unsubscribe = useCallback(async () => {
    if (!isPushSupported() || busy) return;
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await pushSubscriptionService.unsubscribe(existing.endpoint);
        await existing.unsubscribe();
      }
      setStatus("unsubscribed");
    } finally {
      setBusy(false);
    }
  }, [busy, pushSubscriptionService]);

  return { status, busy, subscribe, unsubscribe };
};
