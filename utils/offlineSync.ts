
import { db, SyncItem } from './localDb';
import { OnlineDB } from './api';
import { v4 as uuidv4 } from 'uuid';
import { ServiceOrder, Product, Sale, Transaction, AppSettings, User } from '../types';

export class OfflineSync {
  private static isSyncing = false;

  static async init() {
    // Listener para quando o app voltar a ficar online
    window.addEventListener('online', this.sincronizarPendentes);

    // Listener para mensagens do Service Worker
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.type === 'SYNC_REQUEST') {
        console.log('[App] Mensagem SYNC_REQUEST recebida do SW. Iniciando sincronização.');
        this.sincronizarPendentes();
      }
    });

    // Sincroniza ao iniciar se estiver online
    if (navigator.onLine) {
      this.sincronizarPendentes();
    }
  }

  // Função unificada para salvar qualquer tipo de dado localmente
  static async salvarLocalmente(tenantId: string, type: SyncItem['type'], action: SyncItem['action'], data: any) {
    const id = data.id || uuidv4();
    const item: SyncItem = {
      id,
      tenantId,
      type,
      action,
      data: { ...data, id },
      sincronizado: 0,
      criadoEm: Date.now(),
    };

    await db.transaction('rw', db.pendentes, async () => {
      await db.pendentes.put(item);
    });

    // Tenta registrar um background sync
    this.requestBackgroundSync();

    // Se estiver online, tenta sincronizar imediatamente como fallback
    if (navigator.onLine) {
      this.sincronizarPendentes();
    }

    return item.data; // Retorna o dado com o ID gerado
  }

  static async sincronizarPendentes() {
    if (this.isSyncing || !navigator.onLine) return;
    this.isSyncing = true;
    console.log('Iniciando sincronização de pendentes...');

    try {
      const pendentes = await db.pendentes.where('sincronizado').equals(0).sortBy('criadoEm');
      if (pendentes.length === 0) {
        console.log('Nenhum item para sincronizar.');
        return;
      }

      console.log(`Encontrados ${pendentes.length} itens para sincronizar.`);

      for (const item of pendentes) {
        let success = false;
        try {
          // Lógica de envio para a API baseada no tipo e ação
          switch (item.type) {
            case 'users':
              if (item.action === 'upsert') {
                const res = await OnlineDB.upsertUser(item.tenantId, item.data.store_name, item.data);
                success = res.success;
              } else if (item.action === 'delete') {
                const res = await OnlineDB.deleteRemoteUser(item.data.id);
                success = res.success;
              }
              break;
            case 'orders':
              if (item.action === 'upsert') {
                const res = await OnlineDB.upsertOrders(item.tenantId, [item.data]);
                success = res.success;
              } else if (item.action === 'delete') {
                const res = await OnlineDB.deleteOS(item.data.id);
                success = res.success;
              }
              break;
            case 'products':
              if (item.action === 'upsert') {
                const res = await OnlineDB.upsertProducts(item.tenantId, [item.data]);
                success = res.success;
              } else if (item.action === 'delete') {
                const res = await OnlineDB.deleteProduct(item.data.id);
                success = res.success;
              }
              break;
            case 'sales':
              if (item.action === 'upsert') {
                const res = await OnlineDB.upsertSales(item.tenantId, [item.data]);
                success = res.success;
              } else if (item.action === 'delete') {
                const res = await OnlineDB.deleteSale(item.data.id);
                success = res.success;
              }
              break;
            case 'transactions':
              if (item.action === 'upsert') {
                const res = await OnlineDB.upsertTransactions(item.tenantId, [item.data]);
                success = res.success;
              } else if (item.action === 'delete') {
                const res = await OnlineDB.deleteTransaction(item.data.id);
                success = res.success;
              }
              break;
            case 'settings':
              const res = await OnlineDB.syncPush(item.tenantId, 'settings', item.data);
              success = res.success;
              break;
          }
        } catch (error) {
          console.error(`Falha ao sincronizar item ${item.id}:`, error);
          success = false;
        }

        if (success) {
          await db.pendentes.update(item.id, { sincronizado: 1 });
          console.log(`Item ${item.id} sincronizado com sucesso.`);
        } else {
          console.warn(`Não foi possível sincronizar o item ${item.id}. Tentará novamente mais tarde.`);
        }
      }
    } catch (error) {
      console.error('Erro geral no processo de sincronização:', error);
    } finally {
      this.isSyncing = false;
      console.log('Sincronização finalizada.');
    }
  }

  private static async requestBackgroundSync(retries = 3, delay = 100) {
    // Verifica se o SW está no controle. Se não, espera e tenta novamente.
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      console.warn(`[Sync] Service worker não está no controle. Tentativas restantes: ${retries}`);
      if (retries > 0) {
        setTimeout(() => this.requestBackgroundSync(retries - 1, delay), delay);
      }
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      if ('sync' in registration) {
        await registration.sync.register('sync-pendentes');
        console.log('Background sync registrado com sucesso.');
      } else {
        console.warn('[Sync] Background Sync API não disponível.');
      }
    } catch (error) {
      console.error(`Registro do background sync falhou (tentativas restantes: ${retries}):`, error);
      if (retries > 0) {
        // Tenta novamente com um delay maior (exponential backoff)
        setTimeout(() => this.requestBackgroundSync(retries - 1, delay * 2), delay);
      }
    }
  }
  
  // Funções para obter dados (lêem das tabelas locais)
  static async getLocalData(tenantId: string) {
     const [settings, orders, products, sales, transactions, users] = await Promise.all([
      db.settings.get(tenantId),
      db.orders.where('tenantId').equals(tenantId).toArray(),
      db.products.where('tenantId').equals(tenantId).toArray(),
      db.sales.where('tenantId').equals(tenantId).toArray(),
      db.transactions.where('tenantId').equals(tenantId).toArray(),
      db.users.where('tenantId').equals(tenantId).toArray()
    ]);

    return { settings, orders, products, sales, transactions, users };
  }

  static async pullAllData(tenantId: string) {
    if (!navigator.onLine) return;

    try {
      console.log('Puxando todos os dados da nuvem...');
      const [cloudSettings, cloudOrders, cloudProducts, cloudSales, cloudTransactions, cloudUsers] = await Promise.all([
        OnlineDB.syncPull(tenantId, 'settings'),
        OnlineDB.fetchOrders(tenantId),
        OnlineDB.fetchProducts(tenantId),
        OnlineDB.fetchSales(tenantId),
        OnlineDB.fetchTransactions(tenantId),
        OnlineDB.fetchUsers(tenantId)
      ]);

      await db.transaction('rw', db.settings, db.users, db.orders, db.products, db.sales, db.transactions, async () => {
        if (cloudSettings) await db.settings.put({ ...cloudSettings, tenantId });
        if (cloudUsers && cloudUsers.length > 0) await db.users.bulkPut(cloudUsers.map((u: any) => ({ ...u, tenantId })));
        if (cloudOrders && cloudOrders.length > 0) await db.orders.bulkPut(cloudOrders.map((o: any) => ({ ...o, tenantId })));
        if (cloudProducts && cloudProducts.length > 0) await db.products.bulkPut(cloudProducts.map((p: any) => ({ ...p, tenantId })));
        if (cloudSales && cloudSales.length > 0) await db.sales.bulkPut(cloudSales.map((s: any) => ({ ...s, tenantId })));
        if (cloudTransactions && cloudTransactions.length > 0) await db.transactions.bulkPut(cloudTransactions.map((t: any) => ({ ...t, tenantId })));
      });

      console.log('Dados da nuvem salvos localmente com sucesso.');

    } catch (e) {
      console.error('Erro ao puxar dados da nuvem:', e);
    }
  }
}
