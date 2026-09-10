import { db, SyncItem } from './localDb';
import { OnlineDB } from './api';
import { ServiceOrder, Product, Sale, Transaction, AppSettings, User, Customer } from '../types';
import { ConnectionStatusManager } from './connectionStatus';

export class OfflineSync {
  private static isSyncing = false;
  private static retryTimeout: any = null;
  private static isInitialized = false;

  static async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Escuta retorno da conexão no navegador
    window.addEventListener('online', () => {
      console.log('[OfflineSync] Dispositivo online detectado pelo navegador. Iniciando sincronização...');
      this.processQueue();
    });

    // Escuta o ConnectionStatusManager quando o banco SQL voltar a responder
    ConnectionStatusManager.subscribe((state) => {
      if (state.status === 'online' && state.pendingSyncCount > 0 && !this.isSyncing) {
        console.log('[OfflineSync] Status online confirmado pelo gerenciador. Disparando sincronização...');
        this.processQueue();
      }
    });

    // Processa fila na inicialização se estiver online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      setTimeout(() => this.processQueue(), 2000);
    }
  }

  // Enfileiramento inteligente com deduplicação para não acumular requisições repetidas
  static async enqueue(item: SyncItem): Promise<void> {
    try {
      const itemId = item.data?.id;

      if (itemId && item.tenantId) {
        // Busca se já existe pendência para este mesmo registro
        const existingItems = await db.syncQueue
          .where('tenantId')
          .equals(item.tenantId)
          .filter(q => q.type === item.type && q.data?.id === itemId)
          .toArray();

        if (existingItems.length > 0) {
          if (item.action === 'delete') {
            // Se foi excluído, remove os upserts anteriores pendentes
            for (const ex of existingItems) {
              if (ex.id) await db.syncQueue.delete(ex.id);
            }
          } else if (item.action === 'upsert') {
            // Se foi editado novamente enquanto offline, atualiza com a versão mais recente
            const first = existingItems[0];
            if (first.id) {
              await db.syncQueue.update(first.id, {
                data: item.data,
                timestamp: Date.now()
              });
              // Remove eventuais duplicatas extras
              for (let i = 1; i < existingItems.length; i++) {
                if (existingItems[i].id) await db.syncQueue.delete(existingItems[i].id!);
              }
              await ConnectionStatusManager.refreshPendingCount();
              return;
            }
          }
        }
      }

      await db.syncQueue.add(item);
    } catch (e) {
      console.warn('[OfflineSync] Erro ao adicionar à fila de sincronização:', e);
    } finally {
      await ConnectionStatusManager.refreshPendingCount();
    }
  }

  // Processa a fila de sincronização em lote (batch) otimizado
  static async processQueue() {
    if (this.isSyncing) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    this.isSyncing = true;
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    try {
      const queue = await db.syncQueue.orderBy('timestamp').toArray();
      await ConnectionStatusManager.refreshPendingCount();

      if (queue.length === 0) {
        this.isSyncing = false;
        return;
      }

      console.log(`[OfflineSync] Sincronizando ${queue.length} pendência(s) com o Supabase...`);

      const handledItemIds = new Set<number>();
      const tenantIds = Array.from(new Set(queue.map(q => q.tenantId)));

      for (const tenantId of tenantIds) {
        const tenantItems = queue.filter(q => q.tenantId === tenantId && !handledItemIds.has(q.id!));

        // 1. SINCRONIZAÇÃO EM LOTE DE ORDENS DE SERVIÇO (UPSERTS)
        const orderUpserts = tenantItems.filter(q => q.type === 'orders' && q.action === 'upsert');
        if (orderUpserts.length > 0) {
          const ordersToSync = orderUpserts.map(q => q.data);
          try {
            const res = await OnlineDB.upsertOrders(tenantId, ordersToSync);
            if (res.success) {
              for (const q of orderUpserts) {
                if (q.id) {
                  await db.syncQueue.delete(q.id);
                  handledItemIds.add(q.id);
                }
              }
            }
          } catch (err) {
            console.error('[OfflineSync] Falha no batch de O.S.:', err);
          }
        }

        // 2. SINCRONIZAÇÃO EM LOTE DE PRODUTOS (UPSERTS)
        const productUpserts = tenantItems.filter(q => q.type === 'products' && q.action === 'upsert');
        if (productUpserts.length > 0) {
          const productsToSync = productUpserts.map(q => q.data);
          try {
            const res = await OnlineDB.upsertProducts(tenantId, productsToSync);
            if (res.success) {
              for (const q of productUpserts) {
                if (q.id) {
                  await db.syncQueue.delete(q.id);
                  handledItemIds.add(q.id);
                }
              }
            }
          } catch (err) {
            console.error('[OfflineSync] Falha no batch de produtos:', err);
          }
        }

        // 3. SINCRONIZAÇÃO EM LOTE DE CLIENTES (UPSERTS)
        const customerUpserts = tenantItems.filter(q => q.type === 'customers' && q.action === 'upsert');
        if (customerUpserts.length > 0) {
          const customersToSync = customerUpserts.map(q => q.data);
          try {
            const res = await OnlineDB.upsertCustomers(tenantId, customersToSync);
            if (res.success) {
              for (const q of customerUpserts) {
                if (q.id) {
                  await db.syncQueue.delete(q.id);
                  handledItemIds.add(q.id);
                }
              }
            }
          } catch (err) {
            console.error('[OfflineSync] Falha no batch de clientes:', err);
          }
        }

        // 4. SINCRONIZAÇÃO EM LOTE DE VENDAS (UPSERTS)
        const saleUpserts = tenantItems.filter(q => q.type === 'sales' && q.action === 'upsert');
        if (saleUpserts.length > 0) {
          const salesToSync = saleUpserts.map(q => q.data);
          try {
            const res = await OnlineDB.upsertSales(tenantId, salesToSync);
            if (res.success) {
              for (const q of saleUpserts) {
                if (q.id) {
                  await db.syncQueue.delete(q.id);
                  handledItemIds.add(q.id);
                }
              }
            }
          } catch (err) {
            console.error('[OfflineSync] Falha no batch de vendas:', err);
          }
        }

        // 5. SINCRONIZAÇÃO EM LOTE DE TRANSAÇÕES FINANCEIRAS (UPSERTS)
        const transactionUpserts = tenantItems.filter(q => q.type === 'transactions' && q.action === 'upsert');
        if (transactionUpserts.length > 0) {
          const transactionsToSync = transactionUpserts.map(q => q.data);
          try {
            const res = await OnlineDB.upsertTransactions(tenantId, transactionsToSync);
            if (res.success) {
              for (const q of transactionUpserts) {
                if (q.id) {
                  await db.syncQueue.delete(q.id);
                  handledItemIds.add(q.id);
                }
              }
            }
          } catch (err) {
            console.error('[OfflineSync] Falha no batch de transações:', err);
          }
        }

        // 6. PROCESSAMENTO DOS ITENS RESTANTES (DELETES, SETTINGS, ETC.)
        const remaining = tenantItems.filter(q => !handledItemIds.has(q.id!));
        for (const item of remaining) {
          let success = false;
          try {
            switch (item.type) {
              case 'orders':
                if (item.action === 'delete') {
                  const res = await OnlineDB.deleteOS(item.data.id);
                  success = res.success;
                }
                break;
              case 'products':
                if (item.action === 'delete') {
                  const res = await OnlineDB.deleteProduct(item.data.id);
                  success = res.success;
                }
                break;
              case 'sales':
                if (item.action === 'delete') {
                  const res = await OnlineDB.deleteSale(item.data.id);
                  success = res.success;
                }
                break;
              case 'transactions':
                if (item.action === 'delete') {
                  const res = await OnlineDB.deleteTransaction(item.data.id);
                  success = res.success;
                }
                break;
              case 'settings':
                const res = await OnlineDB.syncPush(item.tenantId, 'settings', item.data);
                success = res.success;
                break;
              case 'customers':
                if (item.action === 'delete') {
                  const res = await OnlineDB.deleteCustomer(item.tenantId, item.data.id);
                  success = res.success;
                }
                break;
            }
          } catch (err) {
            console.error('[OfflineSync] Erro sincronizando item individual:', item, err);
            success = false;
          }

          if (success) {
            if (item.id) {
              await db.syncQueue.delete(item.id);
              handledItemIds.add(item.id);
            }
          } else {
            // Se falhou, interrompe os itens restantes para não desordenar
            break;
          }
        }
      }

      await ConnectionStatusManager.refreshPendingCount();
      const remainingCount = await db.syncQueue.count();

      if (remainingCount === 0) {
        console.log('[OfflineSync] Todas as pendências foram sincronizadas com sucesso!');
        ConnectionStatusManager.reportSuccess();
      } else {
        console.warn(`[OfflineSync] Restam ${remainingCount} itens na fila. Reagendando tentativa em 12 segundos.`);
        this.retryTimeout = setTimeout(() => {
          if (typeof navigator !== 'undefined' && navigator.onLine) {
            OfflineSync.processQueue();
          }
        }, 12000);
      }
    } catch (e) {
      console.warn('[OfflineSync] Erro inesperado ao processar fila:', e);
    } finally {
      this.isSyncing = false;
      await ConnectionStatusManager.refreshPendingCount();
    }
  }

  // Salvar Ordem de Serviço
  static async saveOrder(tenantId: string, order: ServiceOrder) {
    await db.orders.put({ ...order, tenantId });
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const res = await OnlineDB.upsertOrders(tenantId, [order]);
        if (res.success) return;
      } catch {}
    }
    await this.enqueue({
      tenantId,
      type: 'orders',
      action: 'upsert',
      data: order,
      timestamp: Date.now()
    });
  }

  // Salvar lote de Ordens de Serviço (evita repetições e enfileira apenas alterações reais)
  static async saveOrdersBatch(tenantId: string, allOrders: ServiceOrder[], changedOrders: ServiceOrder[]) {
    // 1. Salva todas localmente no IndexedDB em alta performance
    await db.orders.bulkPut(allOrders.map(o => ({ ...o, tenantId })));

    // 2. Sincroniza apenas as ordens que realmente mudaram ou foram criadas
    if (changedOrders.length === 0) return;

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const res = await OnlineDB.upsertOrders(tenantId, changedOrders);
        if (res.success) return;
      } catch {}
    }

    for (const order of changedOrders) {
      await this.enqueue({
        tenantId,
        type: 'orders',
        action: 'upsert',
        data: order,
        timestamp: Date.now()
      });
    }
  }

  static async deleteOrder(tenantId: string, orderId: string) {
    const order = await db.orders.get(orderId);
    if (order) {
      await db.orders.update(orderId, { isDeleted: true });
    }
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const res = await OnlineDB.deleteOS(orderId);
        if (res.success) return;
      } catch {}
    }
    await this.enqueue({
      tenantId,
      type: 'orders',
      action: 'delete',
      data: { id: orderId },
      timestamp: Date.now()
    });
  }

  // Salvar Produto
  static async saveProduct(tenantId: string, product: Product) {
    await db.products.put({ ...product, tenantId });
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const res = await OnlineDB.upsertProducts(tenantId, [product]);
        if (res.success) return;
      } catch {}
    }
    await this.enqueue({
      tenantId,
      type: 'products',
      action: 'upsert',
      data: product,
      timestamp: Date.now()
    });
  }

  // Salvar lote de Produtos
  static async saveProductsBatch(tenantId: string, allProducts: Product[], changedProducts: Product[]) {
    await db.products.bulkPut(allProducts.map(p => ({ ...p, tenantId })));
    if (changedProducts.length === 0) return;

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const res = await OnlineDB.upsertProducts(tenantId, changedProducts);
        if (res.success) return;
      } catch {}
    }

    for (const p of changedProducts) {
      await this.enqueue({
        tenantId,
        type: 'products',
        action: 'upsert',
        data: p,
        timestamp: Date.now()
      });
    }
  }

  static async deleteProduct(tenantId: string, productId: string) {
    await db.products.delete(productId);
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const res = await OnlineDB.deleteProduct(productId);
        if (res.success) return;
      } catch {}
    }
    await this.enqueue({
      tenantId,
      type: 'products',
      action: 'delete',
      data: { id: productId },
      timestamp: Date.now()
    });
  }

  // Salvar Venda
  static async saveSale(tenantId: string, sale: Sale) {
    await db.sales.put({ ...sale, tenantId });
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const res = await OnlineDB.upsertSales(tenantId, [sale]);
        if (res.success) return;
      } catch {}
    }
    await this.enqueue({
      tenantId,
      type: 'sales',
      action: 'upsert',
      data: sale,
      timestamp: Date.now()
    });
  }

  // Salvar lote de Vendas
  static async saveSalesBatch(tenantId: string, allSales: Sale[], changedSales: Sale[]) {
    await db.sales.bulkPut(allSales.map(s => ({ ...s, tenantId })));
    if (changedSales.length === 0) return;

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const res = await OnlineDB.upsertSales(tenantId, changedSales);
        if (res.success) return;
      } catch {}
    }

    for (const s of changedSales) {
      await this.enqueue({
        tenantId,
        type: 'sales',
        action: 'upsert',
        data: s,
        timestamp: Date.now()
      });
    }
  }

  static async deleteSale(tenantId: string, saleId: string) {
    const sale = await db.sales.get(saleId);
    if (sale) {
      await db.sales.update(saleId, { isDeleted: true });
    }
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const res = await OnlineDB.deleteSale(saleId);
        if (res.success) return;
      } catch {}
    }
    await this.enqueue({
      tenantId,
      type: 'sales',
      action: 'delete',
      data: { id: saleId },
      timestamp: Date.now()
    });
  }

  // Salvar Transação Financeira
  static async saveTransaction(tenantId: string, transaction: Transaction) {
    await db.transactions.put({ ...transaction, tenantId });
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const res = await OnlineDB.upsertTransactions(tenantId, [transaction]);
        if (res.success) return;
      } catch {}
    }
    await this.enqueue({
      tenantId,
      type: 'transactions',
      action: 'upsert',
      data: transaction,
      timestamp: Date.now()
    });
  }

  // Salvar lote de Transações
  static async saveTransactionsBatch(tenantId: string, allTransactions: Transaction[], changedTransactions: Transaction[]) {
    await db.transactions.bulkPut(allTransactions.map(t => ({ ...t, tenantId })));
    if (changedTransactions.length === 0) return;

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const res = await OnlineDB.upsertTransactions(tenantId, changedTransactions);
        if (res.success) return;
      } catch {}
    }

    for (const t of changedTransactions) {
      await this.enqueue({
        tenantId,
        type: 'transactions',
        action: 'upsert',
        data: t,
        timestamp: Date.now()
      });
    }
  }

  static async deleteTransaction(tenantId: string, transactionId: string) {
    const transaction = await db.transactions.get(transactionId);
    if (transaction) {
      await db.transactions.update(transactionId, { isDeleted: true });
    }
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const res = await OnlineDB.deleteTransaction(transactionId);
        if (res.success) return;
      } catch {}
    }
    await this.enqueue({
      tenantId,
      type: 'transactions',
      action: 'delete',
      data: { id: transactionId },
      timestamp: Date.now()
    });
  }

  static async saveUser(tenantId: string, user: User) {
    await db.users.put({ ...user, tenantId });
  }

  static async deleteUser(tenantId: string, userId: string) {
    await db.users.delete(userId);
  }

  static async saveSettings(tenantId: string, settings: AppSettings) {
    await db.settings.put({ ...settings, tenantId });
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const res = await OnlineDB.syncPush(tenantId, 'settings', settings);
        if (res.success) return;
      } catch {}
    }
    await this.enqueue({
      tenantId,
      type: 'settings',
      action: 'upsert',
      data: settings,
      timestamp: Date.now()
    });
  }

  static async saveCustomer(tenantId: string, customer: Customer) {
    await db.customers.put({ ...customer, tenantId });
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const res = await OnlineDB.upsertCustomers(tenantId, [customer]);
        if (res.success) return;
      } catch {}
    }
    await this.enqueue({
      tenantId,
      type: 'customers',
      action: 'upsert',
      data: customer,
      timestamp: Date.now()
    });
  }

  static async saveCustomers(tenantId: string, customers: Customer[]) {
    await db.customers.bulkPut(customers.map(c => ({ ...c, tenantId })));
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const res = await OnlineDB.upsertCustomers(tenantId, customers);
        if (res.success) return;
      } catch {}
    }
    await this.enqueue({
      tenantId,
      type: 'customers',
      action: 'upsert',
      data: customers,
      timestamp: Date.now()
    });
  }

  static async deleteCustomer(tenantId: string, customerId: string) {
    const customer = await db.customers.get(customerId);
    if (customer) {
      await db.customers.update(customerId, { isDeleted: true });
    }
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const res = await OnlineDB.deleteCustomer(tenantId, customerId);
        if (res.success) return;
      } catch {}
    }
    await this.enqueue({
      tenantId,
      type: 'customers',
      action: 'delete',
      data: { id: customerId },
      timestamp: Date.now()
    });
  }

  // --- MÉTODOS DE PUXADA SEGURA (PREVINE SOBRESCREVER DADOS OFFLINE PENDENTES) ---

  static async pullOrders(tenantId: string): Promise<ServiceOrder[] | null> {
    if (!navigator.onLine || !tenantId) return null;
    try {
      await this.processQueue();
      const cloudOrders = await OnlineDB.fetchOrders(tenantId);
      if (Array.isArray(cloudOrders)) {
        // Preserva registros com alterações pendentes na fila local
        const pendingQueue = await db.syncQueue
          .where('tenantId')
          .equals(tenantId)
          .filter(q => q.type === 'orders')
          .toArray();
        const pendingIds = new Set(pendingQueue.map(q => q.data?.id).filter(Boolean));

        const ordersToKeepLocally = await db.orders
          .where('tenantId')
          .equals(tenantId)
          .filter(o => pendingIds.has(o.id))
          .toArray();

        // Remove apenas as não pendentes
        const allLocal = await db.orders.where('tenantId').equals(tenantId).toArray();
        for (const o of allLocal) {
          if (!pendingIds.has(o.id)) {
            await db.orders.delete(o.id);
          }
        }

        const toPut = cloudOrders
          .filter(co => !pendingIds.has(co.id))
          .map((o: any) => ({ ...o, tenantId }));

        await db.orders.bulkPut([...toPut, ...ordersToKeepLocally]);
        return await db.orders.where('tenantId').equals(tenantId).toArray();
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  static async pullProducts(tenantId: string): Promise<Product[] | null> {
    if (!navigator.onLine || !tenantId) return null;
    try {
      await this.processQueue();
      const cloudProducts = await OnlineDB.fetchProducts(tenantId);
      if (Array.isArray(cloudProducts)) {
        const pendingQueue = await db.syncQueue
          .where('tenantId')
          .equals(tenantId)
          .filter(q => q.type === 'products')
          .toArray();
        const pendingIds = new Set(pendingQueue.map(q => q.data?.id).filter(Boolean));

        const productsToKeep = await db.products
          .where('tenantId')
          .equals(tenantId)
          .filter(p => pendingIds.has(p.id))
          .toArray();

        const allLocal = await db.products.where('tenantId').equals(tenantId).toArray();
        for (const p of allLocal) {
          if (!pendingIds.has(p.id)) {
            await db.products.delete(p.id);
          }
        }

        const toPut = cloudProducts
          .filter(cp => !pendingIds.has(cp.id))
          .map((p: any) => ({ ...p, tenantId }));

        await db.products.bulkPut([...toPut, ...productsToKeep]);
        return await db.products.where('tenantId').equals(tenantId).toArray();
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  static async pullSales(tenantId: string): Promise<Sale[] | null> {
    if (!navigator.onLine || !tenantId) return null;
    try {
      await this.processQueue();
      const cloudSales = await OnlineDB.fetchSales(tenantId);
      if (Array.isArray(cloudSales)) {
        const pendingQueue = await db.syncQueue
          .where('tenantId')
          .equals(tenantId)
          .filter(q => q.type === 'sales')
          .toArray();
        const pendingIds = new Set(pendingQueue.map(q => q.data?.id).filter(Boolean));

        const salesToKeep = await db.sales
          .where('tenantId')
          .equals(tenantId)
          .filter(s => pendingIds.has(s.id))
          .toArray();

        const allLocal = await db.sales.where('tenantId').equals(tenantId).toArray();
        for (const s of allLocal) {
          if (!pendingIds.has(s.id)) {
            await db.sales.delete(s.id);
          }
        }

        const toPut = cloudSales
          .filter(cs => !pendingIds.has(cs.id))
          .map((s: any) => ({ ...s, tenantId }));

        await db.sales.bulkPut([...toPut, ...salesToKeep]);
        return await db.sales.where('tenantId').equals(tenantId).toArray();
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  static async pullTransactions(tenantId: string): Promise<Transaction[] | null> {
    if (!navigator.onLine || !tenantId) return null;
    try {
      await this.processQueue();
      const cloudTransactions = await OnlineDB.fetchTransactions(tenantId);
      if (Array.isArray(cloudTransactions)) {
        const pendingQueue = await db.syncQueue
          .where('tenantId')
          .equals(tenantId)
          .filter(q => q.type === 'transactions')
          .toArray();
        const pendingIds = new Set(pendingQueue.map(q => q.data?.id).filter(Boolean));

        const transToKeep = await db.transactions
          .where('tenantId')
          .equals(tenantId)
          .filter(t => pendingIds.has(t.id))
          .toArray();

        const allLocal = await db.transactions.where('tenantId').equals(tenantId).toArray();
        for (const t of allLocal) {
          if (!pendingIds.has(t.id)) {
            await db.transactions.delete(t.id);
          }
        }

        const toPut = cloudTransactions
          .filter(ct => !pendingIds.has(ct.id))
          .map((t: any) => ({ ...t, tenantId }));

        await db.transactions.bulkPut([...toPut, ...transToKeep]);
        return await db.transactions.where('tenantId').equals(tenantId).toArray();
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  static async pullCustomers(tenantId: string): Promise<Customer[] | null> {
    if (!navigator.onLine || !tenantId) return null;
    try {
      await this.processQueue();
      const cloudCustomers = await OnlineDB.fetchCustomers(tenantId);
      if (Array.isArray(cloudCustomers)) {
        const pendingQueue = await db.syncQueue
          .where('tenantId')
          .equals(tenantId)
          .filter(q => q.type === 'customers')
          .toArray();
        const pendingIds = new Set(pendingQueue.map(q => q.data?.id).filter(Boolean));

        const custToKeep = await db.customers
          .where('tenantId')
          .equals(tenantId)
          .filter(c => pendingIds.has(c.id))
          .toArray();

        const allLocal = await db.customers.where('tenantId').equals(tenantId).toArray();
        for (const c of allLocal) {
          if (!pendingIds.has(c.id)) {
            await db.customers.delete(c.id);
          }
        }

        const toPut = cloudCustomers
          .filter(cc => !pendingIds.has(cc.id))
          .map((c: any) => ({ ...c, tenantId }));

        await db.customers.bulkPut([...toPut, ...custToKeep]);
        return await db.customers.where('tenantId').equals(tenantId).toArray();
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  static async pullSettings(tenantId: string): Promise<AppSettings | null> {
    if (!navigator.onLine || !tenantId) return null;
    try {
      const cloudSettings = await OnlineDB.syncPull(tenantId, 'settings');
      if (cloudSettings) {
        await db.settings.put({ ...cloudSettings, tenantId });
        return cloudSettings;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  static async pullAllData(tenantId: string) {
    if (!navigator.onLine) return null;

    try {
      // 1. Descarrega pendências locais primeiro
      await this.processQueue();

      const [cloudSettings, cloudOrders, cloudProducts, cloudSales, cloudTransactions, cloudUsers, cloudCustomers] = await Promise.all([
        OnlineDB.syncPull(tenantId, 'settings'),
        OnlineDB.fetchOrders(tenantId),
        OnlineDB.fetchProducts(tenantId),
        OnlineDB.fetchSales(tenantId),
        OnlineDB.fetchTransactions(tenantId),
        OnlineDB.fetchUsers(tenantId),
        OnlineDB.fetchCustomers(tenantId)
      ]);

      if (cloudOrders === null && cloudProducts === null && cloudSales === null && cloudSettings === null) {
        return null;
      }

      // Identifica itens na fila de sync para não sobrescrever o que o usuário alterou offline
      const pendingQueue = await db.syncQueue.where('tenantId').equals(tenantId).toArray();
      const pendingOrderIds = new Set(pendingQueue.filter(q => q.type === 'orders').map(q => q.data?.id).filter(Boolean));
      const pendingProdIds = new Set(pendingQueue.filter(q => q.type === 'products').map(q => q.data?.id).filter(Boolean));
      const pendingSaleIds = new Set(pendingQueue.filter(q => q.type === 'sales').map(q => q.data?.id).filter(Boolean));
      const pendingTransIds = new Set(pendingQueue.filter(q => q.type === 'transactions').map(q => q.data?.id).filter(Boolean));
      const pendingCustIds = new Set(pendingQueue.filter(q => q.type === 'customers').map(q => q.data?.id).filter(Boolean));

      if (cloudSettings) await db.settings.put({ ...cloudSettings, tenantId });

      if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
        await db.users.where('tenantId').equals(tenantId).delete();
        await db.users.bulkPut(cloudUsers.map((u: any) => ({ ...u, tenantId })));
      }

      if (Array.isArray(cloudOrders)) {
        const keepLocal = await db.orders.where('tenantId').equals(tenantId).filter(o => pendingOrderIds.has(o.id)).toArray();
        const allLocal = await db.orders.where('tenantId').equals(tenantId).toArray();
        for (const o of allLocal) {
          if (!pendingOrderIds.has(o.id)) await db.orders.delete(o.id);
        }
        const toPut = cloudOrders.filter(co => !pendingOrderIds.has(co.id)).map((o: any) => ({ ...o, tenantId }));
        await db.orders.bulkPut([...toPut, ...keepLocal]);
      }

      if (Array.isArray(cloudProducts)) {
        const keepLocal = await db.products.where('tenantId').equals(tenantId).filter(p => pendingProdIds.has(p.id)).toArray();
        const allLocal = await db.products.where('tenantId').equals(tenantId).toArray();
        for (const p of allLocal) {
          if (!pendingProdIds.has(p.id)) await db.products.delete(p.id);
        }
        const toPut = cloudProducts.filter(cp => !pendingProdIds.has(cp.id)).map((p: any) => ({ ...p, tenantId }));
        await db.products.bulkPut([...toPut, ...keepLocal]);
      }

      if (Array.isArray(cloudSales)) {
        const keepLocal = await db.sales.where('tenantId').equals(tenantId).filter(s => pendingSaleIds.has(s.id)).toArray();
        const allLocal = await db.sales.where('tenantId').equals(tenantId).toArray();
        for (const s of allLocal) {
          if (!pendingSaleIds.has(s.id)) await db.sales.delete(s.id);
        }
        const toPut = cloudSales.filter(cs => !pendingSaleIds.has(cs.id)).map((s: any) => ({ ...s, tenantId }));
        await db.sales.bulkPut([...toPut, ...keepLocal]);
      }

      if (Array.isArray(cloudTransactions)) {
        const keepLocal = await db.transactions.where('tenantId').equals(tenantId).filter(t => pendingTransIds.has(t.id)).toArray();
        const allLocal = await db.transactions.where('tenantId').equals(tenantId).toArray();
        for (const t of allLocal) {
          if (!pendingTransIds.has(t.id)) await db.transactions.delete(t.id);
        }
        const toPut = cloudTransactions.filter(ct => !pendingTransIds.has(ct.id)).map((t: any) => ({ ...t, tenantId }));
        await db.transactions.bulkPut([...toPut, ...keepLocal]);
      }

      if (Array.isArray(cloudCustomers)) {
        const keepLocal = await db.customers.where('tenantId').equals(tenantId).filter(c => pendingCustIds.has(c.id)).toArray();
        const allLocal = await db.customers.where('tenantId').equals(tenantId).toArray();
        for (const c of allLocal) {
          if (!pendingCustIds.has(c.id)) await db.customers.delete(c.id);
        }
        const toPut = cloudCustomers.filter(cc => !pendingCustIds.has(cc.id)).map((c: any) => ({ ...c, tenantId }));
        await db.customers.bulkPut([...toPut, ...keepLocal]);
      }

      return await this.getLocalData(tenantId);
    } catch (e) {
      console.warn('[OfflineSync] Conexão instável ao puxar da nuvem, mantendo dados locais salvos.');
      return null;
    }
  }

  static async getLocalData(tenantId: string) {
    const [settings, orders, products, sales, transactions, users, customers] = await Promise.all([
      db.settings.get(tenantId),
      db.orders.where('tenantId').equals(tenantId).toArray(),
      db.products.where('tenantId').equals(tenantId).toArray(),
      db.sales.where('tenantId').equals(tenantId).toArray(),
      db.transactions.where('tenantId').equals(tenantId).toArray(),
      db.users.where('tenantId').equals(tenantId).toArray(),
      db.customers.where('tenantId').equals(tenantId).toArray()
    ]);

    return { 
      settings, 
      orders: orders || [], 
      products: products || [], 
      sales: sales || [], 
      transactions: transactions || [], 
      users: users || [], 
      customers: customers || [] 
    };
  }
}
