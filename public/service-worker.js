// Minimal Web Push service worker — deliberately NOT a full PWA/offline-caching setup
// (ElderHive doesn't have one; that's a separate, unrequested concern). This file exists
// for exactly one reason: navigator.serviceWorker.ready (hooks/useWebPushSubscription.ts)
// never resolves without SOME service worker registered at all, and the browser's Push API
// only ever delivers a push to a registered service worker's "push" event, never directly
// to page JS.
//
// The payload shape here mirrors com.elderhive.webpush.WebPushSenderService#buildPayload on
// the backend: { notificationId, type, title, message, link }.
self.addEventListener("push", (event) => {
  let payload = { title: "ElderHive", message: "You have a new notification." };
  try {
    if (event.data) payload = event.data.json();
  } catch {
    // Non-JSON payload (shouldn't happen - the backend always sends JSON) - fall back to
    // the generic copy above rather than letting the handler throw and drop the push.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "ElderHive", {
      body: payload.message || "",
      data: { link: payload.link || null },
      icon: "/favicon.svg",
    })
  );
});

// Clicking the OS notification focuses an already-open tab on the right page if one
// exists, otherwise opens a new one — standard Push API notification-click recipe.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data && event.notification.data.link;
  const targetUrl = link ? new URL(link, self.location.origin).href : self.location.origin;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === targetUrl && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
