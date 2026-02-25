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

// Lógica de Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pendentes') {
    event.waitUntil(sincronizarPendentes());
  }
});

// Definição do DB e lógica de sync (não pode importar do app, então redefinimos aqui)

// Importa o Dexie
self.importScripts('https://unpkg.com/dexie@3/dist/dexie.js');

// Redefine a estrutura do DB para o SW
const db = new Dexie('AssistenciaPro_OfflineDB');
db.version(11).stores({
  orders: 'id, tenantId, customerName, status, isDeleted',
  products: 'id, tenantId, name, barcode',
  sales: 'id, tenantId, productId, date, isDeleted',
  transactions: 'id, tenantId, type, date, isDeleted',
  settings: 'tenantId',
  users: 'id, tenantId, username, role',
  pendentes: 'id, sincronizado, criadoEm'
});

async function sincronizarPendentes() {
  console.log('[SW] Iniciando sincronização de pendentes...');
  const pendentes = await db.pendentes.where('sincronizado').equals(0).toArray();

  if (pendentes.length === 0) {
    console.log('[SW] Nenhum item para sincronizar.');
    return;
  }

  console.log(`[SW] Encontrados ${pendentes.length} itens para sincronizar.`);

  for (const item of pendentes) {
    // A lógica de chamada à API precisa ser replicada aqui.
    // Esta é uma versão simplificada. A URL base da API é necessária.
    const SUPABASE_URL = 'https://lawcmqsjhwuhogsukhbf.supabase.co';
    const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxhd2NtcXNqaHd1aG9nc3VrYmhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTgxMjY5OTQsImV4cCI6MjAzMzcwMjk5NH0.Fp6D8Gf1v_h3a3r1Y1Jfg3Yq5W2hYg4a5sPjnsW3M_4'; // Esta chave é anônima e pública
    
    let endpoint = '';
    let payload = {};
    let method = 'POST';

    // Simplificação: usando upsert para tudo. A API deve ter essa lógica.
    switch (item.type) {
        case 'products': 
            endpoint = `/rest/v1/products`;
            payload = item.data;
            break;
        // Adicionar outros casos aqui
    }

    if (!endpoint) continue;

    try {
        const response = await fetch(`${SUPABASE_URL}${endpoint}`,
        {
            method: 'POST', // Usando POST para upsert
            headers: {
                'Content-Type': 'application/json',
                'apikey': API_KEY,
                'Authorization': `Bearer ${API_KEY}`,
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            await db.pendentes.update(item.id, { sincronizado: 1 });
            console.log(`[SW] Item ${item.id} sincronizado com sucesso.`);
        } else {
            console.error(`[SW] Falha ao sincronizar item ${item.id}. Status: ${response.status}`);
        }
    } catch (error) {
        console.error(`[SW] Erro de rede ao sincronizar item ${item.id}:`, error);
        // Não faz nada, o item continua como não sincronizado para a próxima tentativa
    }
  }
  console.log('[SW] Sincronização finalizada.');
}
