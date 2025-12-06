// Service worker with Workbox and offline fallback
// Fixed for WebView APK compatibility
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

const CACHE = "trendisfriend-v2";
const offlineFallbackPage = "/offline.html";

// Skip waiting to activate new service worker immediately
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener('install', async (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.add(offlineFallbackPage))
      .catch((err) => console.log('Cache install error:', err))
  );
  // Force immediate activation
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control immediately
      clients.claim()
    ])
  );
});

if (workbox && workbox.navigationPreload && workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

// Improved fetch handler for WebView compatibility
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip API calls, Supabase, and external requests
  if (
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/auth/') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('onesignal') ||
    url.hostname !== self.location.hostname
  ) {
    return;
  }

  // Handle navigation requests (SPA routing)
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        // Try preload response first
        const preloadResp = await event.preloadResponse;
        if (preloadResp) {
          return preloadResp;
        }

        // Try network with timeout for WebView
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const networkResp = await fetch(request, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        // Only return successful responses
        if (networkResp.ok) {
          return networkResp;
        }
        
        // For 500 errors, try to serve index.html from cache or network
        if (networkResp.status >= 500) {
          const indexResp = await fetch('/index.html');
          if (indexResp.ok) {
            return indexResp;
          }
        }
        
        return networkResp;
      } catch (error) {
        // Network failed - try to serve cached index.html first, then offline page
        try {
          const indexResp = await fetch('/index.html');
          if (indexResp.ok) {
            return indexResp;
          }
        } catch (e) {
          // Index.html also failed, serve offline page
        }
        
        const cache = await caches.open(CACHE);
        const cachedResp = await cache.match(offlineFallbackPage);
        if (cachedResp) {
          return cachedResp;
        }
        
        // Last resort - return a basic HTML response
        return new Response(
          '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TREND IS FRIEND</title></head><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background:#1a1a2e;color:white;margin:0;"><div style="text-align:center;"><h1>Loading...</h1><p>Please check your connection</p><button onclick="location.reload()" style="padding:10px 20px;background:#6366f1;color:white;border:none;border-radius:8px;cursor:pointer;margin-top:20px;">Retry</button></div></body></html>',
          { 
            headers: { 'Content-Type': 'text/html' },
            status: 200
          }
        );
      }
    })());
    return;
  }

  // For static assets, use cache-first strategy
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New trading signal available!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('TREND IS FRIEND', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
