// Custom PWA Service Worker logic for @ducanh2912/next-pwa
// High-Urgency Pinned Notification & Dual-Mode Lockscreen Action Handler

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = { title: "🚨 NEW ORDER RECEIVED!", body: "Check dashboard now." };
  try {
    payload = event.data.json();
  } catch (e) {
    payload.body = event.data.text();
  }

  const notificationOptions = {
    body: payload.body || "A customer just placed a new order.",
    icon: payload.icon || "/icon-192x192.png",
    badge: payload.badge || "/icon-192x192.png",
    tag: "hive-order-alert",
    renotify: true,
    requireInteraction: true,
    vibrate: [500, 200, 500, 200, 500, 200, 1000, 300, 500, 200, 500],
    actions: [
      { action: "silence", title: "🔕 Silence Alarm" },
      { action: "open", title: "📦 View Order" },
    ],
    data: {
      url: payload.url || "/boutique/orders",
      orderNumber: payload.orderNumber,
    },
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(payload.title || "🚨 NEW ORDER!", notificationOptions),
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: "TRIGGER_ORDER_ALARM",
            payload,
          });
          client.postMessage({
            type: "PLAY_ORDER_CHIME",
            payload,
          });
        });
      }),
    ])
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Handle direct lockscreen action button "Silence Alarm"
  if (event.action === "silence") {
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "STOP_ORDER_ALARM" });
        });
      })
    );
    return;
  }

  let rawUrl = (event.notification.data && event.notification.data.url) || "/boutique/orders";
  if (rawUrl.startsWith("/boutique/orders/")) {
    rawUrl = "/boutique/orders";
  }
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && client.url.includes("/boutique") && "focus" in client) {
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
