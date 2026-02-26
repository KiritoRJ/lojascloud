import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { NetworkFirst } from 'workbox-strategies';
import { processSyncQueue } from './utils/supabaseSync';

declare let self: ServiceWorkerGlobalScope;

// 1. Precache e limpeza de caches antigos
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// 2. Fallback para navegação SPA (sempre serve o index.html)
const handler = createHandlerBoundToURL('/index.html');
const navigationRoute = new NavigationRoute(handler);
registerRoute(navigationRoute);

// 3. Configuração do Background Sync para a nossa fila
const bgSyncPlugin = new BackgroundSyncPlugin('sync-assist-pro-queue', {
  maxRetentionTime: 24 * 60, // Tentar por 24 horas
  onSync: async ({ queue }) => {
    console.log('Service Worker: Evento de sync recebido.');
    try {
      const successful = await processSyncQueue();
      if (successful) {
        console.log('Service Worker: Fila de sincronização processada com sucesso.');
      } else {
        console.error('Service Worker: Falha ao processar a fila de sincronização. A tentativa será refeita.');
        // Lança um erro para que o Workbox saiba que deve tentar novamente mais tarde
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Service Worker: Erro crítico durante o processamento da fila de sync.', error);
      throw error; // Garante que o Workbox tentará novamente
    }
  },
});

// 4. Estratégia de NetworkFirst para a API do Supabase (com o plugin de sync)
const supabaseApiStrategy = new NetworkFirst({
  cacheName: 'supabase-api-cache',
  plugins: [bgSyncPlugin],
  networkTimeoutSeconds: 10,
});

// 5. Registrar a rota para a API do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
if (supabaseUrl) {
  registerRoute(
    ({ url }) => url.hostname === new URL(supabaseUrl).hostname,
    supabaseApiStrategy,
    'POST' // Aplica apenas para requisições POST (ou PUT, PATCH, DELETE se necessário)
  );
  registerRoute(
    ({ url }) => url.hostname === new URL(supabaseUrl).hostname,
    supabaseApiStrategy,
    'PATCH' // Aplica apenas para requisições POST (ou PUT, PATCH, DELETE se necessário)
  );
}

// 6. Listener para pular a espera e ativar o novo SW imediatamente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});