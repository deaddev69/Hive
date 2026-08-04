// Custom PWA Service Worker logic for @ducanh2912/next-pwa (Customer PWA)
// Rich Web Push Notification Banner Handler

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = { title: "🔥 Special Offer from Hive!", body: "Tap to explore new collections." };
  try {
    payload = event.data.json();
  } catch (e) {
    payload.body = event.data.text();
  }

  const notificationOptions = {
    body: payload.body || "Check out new arrivals on Hive.",
    icon: payload.icon || "/icon.png",
    badge: payload.badge || "/icon.png",
    image: payload.bannerUrl, // 🖼️ Passes Cloudflare R2 banner image URL to native OS notification shade
    tag: "hive-customer-campaign",
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: payload.targetUrl || "/",
    },
    actions: [
      { action: "explore", title: "🛍️ Shop Now" },
      { action: "dismiss", title: "Close" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || "Hive Notification", notificationOptions)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          if ("navigate" in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
