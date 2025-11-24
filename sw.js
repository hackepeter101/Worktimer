// Service Worker for Workday Countdown
// Handles web push notifications for break reminders

'use strict';

self.addEventListener('install', (event) => {
  // Activate worker immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all clients immediately
  event.waitUntil(clients.claim());
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Focus or open the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, focus it
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        // Otherwise, open a new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
        return Promise.resolve();
      })
      .catch((error) => {
        console.error('Failed to handle notification click:', error);
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  // Optional: Track notification dismissal
  // Can be used for analytics or user preferences
});
