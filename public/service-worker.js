// Service worker with Workbox and offline fallback
// Fixed for WebView APK + VPN compatibility
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

const CACHE = "trendisfriend-v3";
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
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      clients.claim()
    ])
  );
});

if (workbox && workbox.navigationPreload && workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

// VPN-friendly fetch with retry logic
async function fetchWithRetry(request, retries = 2, timeout = 15000) {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(request, {
        signal: controller.signal,
        cache: 'no-store',
        credentials: 'same-origin'
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok || response.status < 500) {
        return response;
      }
      
      // On 500 error, wait and retry
      if (i < retries) {
        await new Promise(r => setTimeout(r, 500 * (i + 1)));
      }
    } catch (error) {
      if (i === retries) throw error;
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw new Error('Fetch failed after retries');
}

// Improved fetch handler for WebView + VPN compatibility
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
        if (preloadResp && preloadResp.ok) {
          return preloadResp;
        }

        // Try network with retry for VPN connections
        const networkResp = await fetchWithRetry(request);
        
        if (networkResp.ok) {
          return networkResp;
        }
        
        // For server errors, serve index.html
        if (networkResp.status >= 500) {
          const indexResp = await fetchWithRetry(new Request('/index.html'));
          if (indexResp.ok) {
            return indexResp;
          }
        }
        
        return networkResp;
      } catch (error) {
        // Network failed - try index.html directly
        try {
          const indexResp = await fetch('/index.html', { cache: 'no-store' });
          if (indexResp.ok) {
            return indexResp;
          }
        } catch (e) {}
        
        // Try cached offline page
        const cache = await caches.open(CACHE);
        const cachedResp = await cache.match(offlineFallbackPage);
        if (cachedResp) {
          return cachedResp;
        }
        
        // Last resort - inline HTML
        return new Response(
          '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TREND IS FRIEND</title></head><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background:#1a1a2e;color:white;margin:0;"><div style="text-align:center;"><h1>Loading...</h1><p>Please check your connection</p><button onclick="location.reload()" style="padding:10px 20px;background:#6366f1;color:white;border:none;border-radius:8px;cursor:pointer;margin-top:20px;">Retry</button></div></body></html>',
          { headers: { 'Content-Type': 'text/html' }, status: 200 }
        );
      }
    })());
    return;
  }

  // For static assets, use cache-first with network fallback
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request, { cache: 'no-store' }).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        }).catch(() => {
          // Return empty response for failed assets
          return new Response('', { status: 404 });
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
