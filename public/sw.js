// Self-destructing service worker
// Replaces old "Attendance-front" service worker, then unregisters itself
self.addEventListener("install", function(event) {
  self.skipWaiting();
});

self.addEventListener("activate", function(event) {
  event.waitUntil(
    self.registration.unregister().then(function() {
      return self.clients.matchAll();
    }).then(function(clients) {
      clients.forEach(function(client) {
        if (client.url.indexOf("sw.js") === -1) {
          client.navigate(client.url);
        }
      });
    })
  );
});

self.addEventListener("fetch", function(event) {
  // Don't intercept any requests - pass through to network
});
