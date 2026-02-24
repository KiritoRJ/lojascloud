
import { db, SyncItem } from './localDb';
import { OnlineDB } from './api';
import { ServiceOrder, Product, Sale, Transaction, AppSettings, User } from '../types';

export class OfflineSync {
  private static isSyncing = false;

  static async init() {
    window.addEventListener('online', () => {
      console.log('App is online. Starting sync...');
      this.processQueue();
    });

    // Process queue on init if online
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  static async processQueue() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const queue = await db.syncQueue.orderBy('timestamp').toArray();
      if (queue.length === 0) {
        this.isSyncing = false;
        return;
      }

      console.log(`Processing ${queue.length} items from sync queue...`);

      for (const item of queue) {
        let success = false;
        try {
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
        } catch (err) {
          console.error('Error syncing item:', item, err);
          success = false;
        }

        if (success) {
          await db.syncQueue.delete(item.id!);
        } else {
          // If one fails, stop and wait for next online event or retry
          console.warn('Sync failed for item, stopping queue processing.');
          break;
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  static async saveOrder(tenantId: string, order: ServiceOrder) {
    console.log('[OfflineSync] Attempting to save order to local DB:', order);
    try {
      await db.orders.put({ ...order, tenantId });
      console.log('[OfflineSync] Order saved to local DB successfully.');
      await db.syncQueue.add({
        tenantId,
        type: 'orders',
        action: 'upsert',
        data: order,
        timestamp: Date.now()
      });
      console.log('[OfflineSync] Order added to sync queue.');
      this.processQueue(); // Tenta sincronizar imediatamente
    } catch (error) {
      console.error('[OfflineSync] CRITICAL: Error saving order to local DB:', error);
    }
  }

  static async deleteOrder(tenantId: string, orderId: string) {
    const order = await db.orders.get(orderId);
    if (order) {
      await db.orders.update(orderId, { isDeleted: true });
    }
    await db.syncQueue.add({
      tenantId,
      type: 'orders',
      action: 'delete',
      data: { id: orderId },
      timestamp: Date.now()
    });
    this.processQueue();
  }

  static async saveProduct(tenantId: string, product: Product) {
    console.log('[OfflineSync] Attempting to save product to local DB:', product);
    try {
      await db.products.put({ ...product, tenantId });
      console.log('[OfflineSync] Product saved to local DB successfully.');
      await db.syncQueue.add({
        tenantId,
        type: 'products',
        action: 'upsert',
        data: product,
        timestamp: Date.now()
      });
      console.log('[OfflineSync] Product added to sync queue.');
      this.processQueue();
    } catch (error) {
      console.error('[OfflineSync] CRITICAL: Error saving product to local DB:', error);
    }
  }

  static async deleteProduct(tenantId: string, productId: string) {
    await db.products.delete(productId);
    await db.syncQueue.add({
      tenantId,
      type: 'products',
      action: 'delete',
      data: { id: productId },
      timestamp: Date.now()
    });
    this.processQueue();
  }

  static async saveSale(tenantId: string, sale: Sale) {
    await db.sales.put({ ...sale, tenantId });
    await db.syncQueue.add({
      tenantId,
      type: 'sales',
      action: 'upsert',
      data: sale,
      timestamp: Date.now()
    });
    this.processQueue();
  }

  static async deleteSale(tenantId: string, saleId: string) {
    const sale = await db.sales.get(saleId);
    if (sale) {
      await db.sales.update(saleId, { isDeleted: true });
    }
    await db.syncQueue.add({
      tenantId,
      type: 'sales',
      action: 'delete',
      data: { id: saleId },
      timestamp: Date.now()
    });
    this.processQueue();
  }

  static async saveTransaction(tenantId: string, transaction: Transaction) {
    await db.transactions.put({ ...transaction, tenantId });
    await db.syncQueue.add({
      tenantId,
      type: 'transactions',
      action: 'upsert',
      data: transaction,
      timestamp: Date.now()
    });
    this.processQueue();
  }

  static async deleteTransaction(tenantId: string, transactionId: string) {
    const transaction = await db.transactions.get(transactionId);
    if (transaction) {
      await db.transactions.update(transactionId, { isDeleted: true });
    }
    await db.syncQueue.add({
      tenantId,
      type: 'transactions',
      action: 'delete',
      data: { id: transactionId },
      timestamp: Date.now()
    });
    this.processQueue();
  }

  static async saveUser(tenantId: string, user: User, storeName: string) {
    await db.users.put({ ...user, tenantId });
    await db.syncQueue.add({
      tenantId,
      type: 'users',
      action: 'upsert',
      data: { ...user, store_name: storeName },
      timestamp: Date.now()
    });
    this.processQueue();
  }

  static async deleteUser(tenantId: string, userId: string) {
    await db.users.delete(userId);
    await db.syncQueue.add({
      tenantId,
      type: 'users',
      action: 'delete',
      data: { id: userId },
      timestamp: Date.now()
    });
    this.processQueue();
  }

  static async saveSettings(tenantId: string, settings: AppSettings) {
    await db.settings.put({ ...settings, tenantId });
    await db.syncQueue.add({
      tenantId,
      type: 'settings',
      action: 'upsert',
      data: settings,
      timestamp: Date.now()
    });
    this.processQueue();
  }

  static async syncAndPullAllData(tenantId: string) {
    if (!navigator.onLine) return;
    console.log('Starting sync and pull...');
    await this.processQueue();
    console.log('Queue processed, now pulling data.');
    await this.pullAllData(tenantId);
  }

  static async pullAllData(tenantId: string) {
    if (!navigator.onLine) return;

    try {
      const [cloudSettings, cloudOrders, cloudProducts, cloudSales, cloudTransactions, cloudUsers] = await Promise.all([
        OnlineDB.syncPull(tenantId, 'settings'),
        OnlineDB.fetchOrders(tenantId),
        OnlineDB.fetchProducts(tenantId),
        OnlineDB.fetchSales(tenantId),
        OnlineDB.fetchTransactions(tenantId),
        OnlineDB.fetchUsers(tenantId)
      ]);

      if (cloudSettings) await db.settings.put({ ...cloudSettings, tenantId });
      if (cloudUsers && cloudUsers.length > 0) {
        await db.users.bulkPut(cloudUsers.map((u: any) => ({ ...u, tenantId })));
      }
      if (cloudOrders && cloudOrders.length > 0) {
        await db.orders.bulkPut(cloudOrders.map((o: any) => ({ ...o, tenantId })));
      }
      if (cloudProducts && cloudProducts.length > 0) {
        await db.products.bulkPut(cloudProducts.map((p: any) => ({ ...p, tenantId })));
      }
      if (cloudSales && cloudSales.length > 0) {
        await db.sales.bulkPut(cloudSales.map((s: any) => ({ ...s, tenantId })));
      }
      if (cloudTransactions && cloudTransactions.length > 0) {
        await db.transactions.bulkPut(cloudTransactions.map((t: any) => ({ ...t, tenantId })));
      }


    } catch (e) {
      console.error('Error pulling data from cloud:', e);
      throw e;
    }
  }

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
}
