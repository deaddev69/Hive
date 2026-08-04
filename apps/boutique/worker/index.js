// Custom PWA Service Worker logic for @ducanh2912/next-pwa
// High-Urgency Pinned Notification & Swiggy-Style Alarm Trigger Handler

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
  const targetUrl = (event.notification.data && event.notification.data.url) || "/boutique/orders";

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
