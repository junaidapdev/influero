// Inflero service worker — web push only.
//
// Deliberately NO offline/precaching: this is a frequently-updated SPA, and a
// cached app shell is exactly what caused the stale-tab bug the team hit before.
// The empty `fetch` listener exists only so the browser counts a fetch handler
// toward PWA install eligibility — it never calls respondWith, so every request
// falls through to the network unchanged (HMR included).
//
// The push payload is built server-side by the Phase-B send job:
//   { title, body, url, lang, tag }

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_err) {
    payload = {};
  }

  const title = payload.title || "Inflero";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    lang: payload.lang || "ar",
    dir: "auto",
    tag: payload.tag || "inflero-daily",
    renotify: true,
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      }),
  );
});
