// Custom PWA Service Worker logic for @ducanh2912/next-pwa
// This file is automatically compiled and injected into public/sw.js during build.

// Push Notification Event Listener
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};

  const title = data.title || "New Order Received! 🛍️";
  const options = {
    body: data.body || "A customer just placed a new order.",
    icon: data.icon || "/icon-192x192.png",
    badge: data.badge || "/icon-192x192.png",
    sound: "/sounds/order-chime.mp3",
    vibrate: [200, 100, 200, 100, 400],
    tag: "new-order",
    renotify: true,
    data: { url: data.url || "/boutique/orders" },
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({ type: "PLAY_ORDER_CHIME" });
        });
      }),
    ])
  );
});

// Notification Click Event Listener
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification && event.notification.data && event.notification.data.url) || "/boutique/orders";

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
