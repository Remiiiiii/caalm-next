/* global self */
// Appwrite Web Push Service Worker placeholder
// Appwrite SDK will interact with this worker for push notifications.
self.addEventListener('push', (event) => {
  try {
    const data = event.data?.json() || {};
    const title = data.title || 'Notification';
    const options = {
      body: data.body || data.message,
      icon: '/icons/icon-192x192.png',
      data: data,
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    // fallback
    event.waitUntil(
      self.registration.showNotification('Notification', {
        body: 'You have a new message',
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.actionUrl || '/';
  event.waitUntil(clients.openWindow(url));
});
