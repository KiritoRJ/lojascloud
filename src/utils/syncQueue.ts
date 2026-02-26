import { db, ISyncQueue } from './offlineDB';

const SYNC_TAG = 'sync-assist-pro';

// Função para registrar o Background Sync
async function registerBackgroundSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(SYNC_TAG);
      console.log('Background Sync registrado com sucesso.');
    } catch (error) {
      console.error('Falha ao registrar Background Sync:', error);
    }
  } else {
    console.warn('Background Sync não é suportado neste navegador.');
  }
}

/**
 * Adiciona uma operação à fila de sincronização e tenta registrar um background sync.
 * @param operation O tipo de operação ('create', 'update', 'delete').
 * @param tableName O nome da tabela alvo.
 * @param data Os dados a serem sincronizados.
 */
export async function addToQueue(
  operation: ISyncQueue['operation'],
  tableName: ISyncQueue['tableName'],
  data: any
) {
  const item: ISyncQueue = {
    operation,
    tableName,
    data,
    timestamp: Date.now(),
  };

  try {
    await db.addToSyncQueue(item);
    console.log('Operação adicionada à fila de sincronização:', item);
    // Após adicionar à fila, registra o sync para que o SW tente processar
    await registerBackgroundSync();
  } catch (error) {
    console.error('Erro ao adicionar operação à fila de sync:', error);
  }
}
