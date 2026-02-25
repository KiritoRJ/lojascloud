import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';



// Precache all assets defined in the Vite build
precacheAndRoute(self.__WB_MANIFEST);

// Cache Google Fonts
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
  })
);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
      }),
    ],
  })
);

// Cache Supabase API requests with a NetworkFirst strategy
registerRoute(
  ({ url }) => url.origin === 'https://lawcmqsjhwuhogsukhbf.supabase.co',
  new NetworkFirst({
    cacheName: 'supabase-api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
      }),
    ],
  })
);

// Use a StaleWhileRevalidate strategy for all other requests.
registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
  })
);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Lógica de Background Sync simplificada
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pendentes') {
    console.log(`[SW] Sync event para 'sync-pendentes' recebido.`);
    event.waitUntil(notifyClients());
  }
});

async function notifyClients() {
  const clients = await self.clients.matchAll({
    includeUncontrolled: true,
    type: 'window',
  });
  clients.forEach((client) => {
    console.log('[SW] Enviando mensagem de sync para o cliente.');
    client.postMessage({ type: 'SYNC_REQUEST' });
  });
}
