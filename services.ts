import Dexie, { Table } from 'dexie';
import { createClient } from '@supabase/supabase-js';
import { ServiceOrder, Product, Sale, Transaction, AppSettings, User } from './types';

// --- SUPABASE CLIENT SETUP ---
const supabaseUrl = 'https://lawcmqsjhwuhogsukhbf.supabase.co';
const supabaseKey = 'sb_publishable_c2wQfanSj96FRWqoCq9KIw_2FhxuRBv';
export const supabase = createClient(supabaseUrl, supabaseKey);

// --- DEXIE DATABASE DEFINITION ---
export class AppDB extends Dexie {
  serviceOrders!: Table<ServiceOrder, string>;
  products!: Table<Product, string>;
  sales!: Table<Sale, string>;
  transactions!: Table<Transaction, string>;
  settings!: Table<AppSettings, string>;
  users!: Table<User, string>;
  syncQueue!: Table<{ id?: number; table: string; recordId: string; action: 'upsert' | 'delete'; tenantId: string; timestamp: number }, number>;

  constructor(tenantId: string) {
    super(`pro_db_${tenantId}`);
    this.version(1).stores({
      serviceOrders: 'id, customerName, status, date, isDeleted',
      products: 'id, name, barcode',
      sales: 'id, productId, date, isDeleted',
      transactions: 'id, type, date, isDeleted',
      settings: 'id', // Use a fixed key for settings
      users: 'id, username, role',
      syncQueue: '++id, table, recordId, action, tenantId',
    });
  }
}

let db: AppDB | null = null;

export const initDB = (tenantId: string) => {
  if (!db || db.name !== `pro_db_${tenantId}`) {
    db = new AppDB(tenantId);
  }
  return db;
};

const getDB = () => {
  if (!db) throw new Error('Database not initialized. Call initDB() first.');
  return db;
};

// --- LOCAL DATA ACCESS API ---

export const LocalData = {
  // Service Orders
  getOrders: () => getDB().serviceOrders.filter(o => !o.isDeleted).toArray(),
  saveOrder: async (order: ServiceOrder, tenantId: string) => {
    await getDB().serviceOrders.put(order);
    await getDB().syncQueue.add({ table: 'serviceOrders', recordId: order.id, action: 'upsert', tenantId, timestamp: Date.now() });
    SyncEngine.pushLocalData(tenantId);
  },
  deleteOrder: async (id: string, tenantId: string) => {
    await getDB().serviceOrders.update(id, { isDeleted: true });
    await getDB().syncQueue.add({ table: 'serviceOrders', recordId: id, action: 'upsert', tenantId, timestamp: Date.now() }); // Upsert with isDeleted: true
    SyncEngine.pushLocalData(tenantId);
  },

  // Products
  getProducts: () => getDB().products.toArray(),
  saveProduct: async (product: Product, tenantId: string) => {
    await getDB().products.put(product);
    await getDB().syncQueue.add({ table: 'products', recordId: product.id, action: 'upsert', tenantId, timestamp: Date.now() });
    SyncEngine.pushLocalData(tenantId);
  },
  deleteProduct: async (id: string, tenantId: string) => {
    await getDB().products.delete(id);
    await getDB().syncQueue.add({ table: 'products', recordId: id, action: 'delete', tenantId, timestamp: Date.now() });
    SyncEngine.pushLocalData(tenantId);
  },

  // Sales
  getSales: () => getDB().sales.filter(s => !s.isDeleted).toArray(),
  saveSale: async (sale: Sale, tenantId: string) => {
    await getDB().sales.put(sale);
    await getDB().syncQueue.add({ table: 'sales', recordId: sale.id, action: 'upsert', tenantId, timestamp: Date.now() });
    SyncEngine.pushLocalData(tenantId);
  },
  deleteSale: async (id: string, tenantId: string) => {
    await getDB().sales.update(id, { isDeleted: true });
    await getDB().syncQueue.add({ table: 'sales', recordId: id, action: 'upsert', tenantId, timestamp: Date.now() }); // Upsert with isDeleted: true
    SyncEngine.pushLocalData(tenantId);
  },

  // Transactions
  getTransactions: () => getDB().transactions.filter(t => !t.isDeleted).toArray(),
  saveTransaction: async (tx: Transaction, tenantId: string) => {
    await getDB().transactions.put(tx);
    await getDB().syncQueue.add({ table: 'transactions', recordId: tx.id, action: 'upsert', tenantId, timestamp: Date.now() });
    SyncEngine.pushLocalData(tenantId);
  },
  deleteTransaction: async (id: string, tenantId: string) => {
    await getDB().transactions.update(id, { isDeleted: true });
    await getDB().syncQueue.add({ table: 'transactions', recordId: id, action: 'upsert', tenantId, timestamp: Date.now() }); // Upsert with isDeleted: true
    SyncEngine.pushLocalData(tenantId);
  },

  // Settings & Users
  getSettings: async (): Promise<AppSettings | null> => {
    const settings = await getDB().settings.get('app_settings');
    // The 'id' property is internal to Dexie, remove it before returning
    if (settings) {
      const { id, ...rest } = settings as any;
      return rest as AppSettings;
    }
    return null;
  },
  saveSettings: async (settings: AppSettings, tenantId: string) => {
    await getDB().settings.put({ ...settings, id: 'app_settings' } as any);
    await getDB().syncQueue.add({ table: 'settings', recordId: 'app_settings', action: 'upsert', tenantId, timestamp: Date.now() });
    SyncEngine.pushLocalData(tenantId);
  },
  getUsers: () => getDB().users.toArray(),
  saveUser: async (user: User, tenantId: string) => {
    await getDB().users.put(user);
    await getDB().syncQueue.add({ table: 'users', recordId: user.id, action: 'upsert', tenantId, timestamp: Date.now() });
    SyncEngine.pushLocalData(tenantId);
  },
  deleteUser: async (id: string, tenantId: string) => {
    await getDB().users.delete(id);
    await getDB().syncQueue.add({ table: 'users', recordId: id, action: 'delete', tenantId, timestamp: Date.now() });
    SyncEngine.pushLocalData(tenantId);
  }
};

// --- SYNC ENGINE ---

export const SyncEngine = {
  async pullAllData(tenantId: string) {
    if (!navigator.onLine) return false;
    console.log('PULL: Baixando dados do Supabase...');
    try {
      const db = getDB();
      const [orders, products, sales, transactions, settings, users] = await Promise.all([
        supabase.from('service_orders').select('*').eq('tenant_id', tenantId).then(res => res.data || []),
        supabase.from('products').select('*').eq('tenant_id', tenantId).then(res => res.data || []),
        supabase.from('sales').select('*').eq('tenant_id', tenantId).then(res => res.data || []),
        supabase.from('transactions').select('*').eq('tenant_id', tenantId).then(res => res.data || []),
        supabase.from('cloud_data').select('data_json').eq('tenant_id', tenantId).eq('store_key', 'settings').maybeSingle().then(res => res.data?.data_json || null),
        supabase.from('users').select('*').eq('tenant_id', tenantId).then(res => res.data || []),
      ]);

      await db.transaction('rw', db.tables, async () => {
        await db.serviceOrders.bulkPut(orders.map((o: any) => ({ ...o, customerName: o.customer_name, deviceBrand: o.device_brand, deviceModel: o.device_model, repairDetails: o.repair_details, partsCost: o.parts_cost, serviceCost: o.service_cost, entryDate: o.entry_date, exitDate: o.exit_date, isDeleted: o.is_deleted, phoneNumber: o.phone_number, finishedPhotos: o.finished_photos })) as ServiceOrder[]);
        await db.products.bulkPut(products.map((p: any) => ({ ...p, costPrice: p.cost_price, salePrice: p.sale_price })) as Product[]);
        await db.sales.bulkPut(sales.map((s: any) => ({ ...s, productId: s.product_id, productName: s.product_name, originalPrice: s.original_price, finalPrice: s.final_price, costAtSale: s.cost_at_sale, paymentMethod: s.payment_method, sellerName: s.seller_name, transactionId: s.transaction_id, isDeleted: s.is_deleted })) as Sale[]);
        await db.transactions.bulkPut(transactions.map((t: any) => ({...t, paymentMethod: t.payment_method, isDeleted: t.is_deleted})) as Transaction[]);
        if (settings) await db.settings.put({ ...(settings as object), id: 'app_settings' } as any);
        await db.users.bulkPut(users as User[]);
      });

      console.log('PULL: Dados baixados e salvos localmente.');
      return true;
    } catch (error) {
      console.error('PULL: Falha ao baixar dados:', error);
      return false;
    }
  },

  async pushLocalData(tenantId: string) {
    if (!navigator.onLine) return false;
    console.log('PUSH: Sincronizando dados locais com o Supabase...');

    const db = getDB();
    const itemsToSync = await db.syncQueue.orderBy('timestamp').toArray();

    if (itemsToSync.length === 0) {
      console.log('PUSH: Nenhuma alteração local para sincronizar.');
      return true;
    }

    for (const item of itemsToSync) {
      try {
        if (item.action === 'upsert') {
          // Fetch the latest version of the record from local DB
          let record: any;
          switch (item.table) {
            case 'serviceOrders': record = await db.serviceOrders.get(item.recordId); break;
            case 'products': record = await db.products.get(item.recordId); break;
            case 'sales': record = await db.sales.get(item.recordId); break;
            case 'transactions': record = await db.transactions.get(item.recordId); break;
            case 'settings': record = await db.settings.get(item.recordId); break;
            case 'users': record = await db.users.get(item.recordId); break;
            default: throw new Error(`Unknown table: ${item.table}`);
          }

          if (record) {
            // Convert to Supabase format if necessary
            const supabaseRecord = this.toSupabaseFormat(item.table, record, item.tenantId);
            await supabase.from(this.getSupabaseTableName(item.table)).upsert(supabaseRecord);
          }
        } else if (item.action === 'delete') {
          await supabase.from(this.getSupabaseTableName(item.table)).delete().eq('id', item.recordId);
        }
        await db.syncQueue.delete(item.id!); // Remove from queue after successful sync
      } catch (error) {
        console.error(`PUSH: Falha ao sincronizar item ${item.recordId} da tabela ${item.table}:`, error);
        // Optionally, implement a retry mechanism or move to a failed queue
        return false; // Stop on first error to prevent data inconsistencies
      }
    }

    console.log('PUSH: Todas as alterações locais sincronizadas com sucesso.');
    return true;
  },

  toSupabaseFormat(table: string, record: any, tenantId: string): any {
    const newRecord = { ...record };
    // Specific conversions for Supabase table column names
    if (table === 'serviceOrders') {
      newRecord.customer_name = newRecord.customerName;
      newRecord.device_brand = newRecord.deviceBrand;
      newRecord.device_model = newRecord.deviceModel;
      newRecord.repair_details = newRecord.repairDetails;
      newRecord.parts_cost = newRecord.partsCost;
      newRecord.service_cost = newRecord.serviceCost;
      newRecord.entry_date = newRecord.entryDate;
      newRecord.exit_date = newRecord.exitDate;
      newRecord.is_deleted = newRecord.isDeleted;
      newRecord.phone_number = newRecord.phoneNumber;
      newRecord.finished_photos = newRecord.finishedPhotos;
      delete newRecord.customerName;
      delete newRecord.deviceBrand;
      delete newRecord.deviceModel;
      delete newRecord.repairDetails;
      delete newRecord.partsCost;
      delete newRecord.serviceCost;
      delete newRecord.entryDate;
      delete newRecord.exitDate;
      delete newRecord.isDeleted;
      delete newRecord.phoneNumber;
      delete newRecord.finishedPhotos;
    } else if (table === 'products') {
      newRecord.cost_price = newRecord.costPrice;
      newRecord.sale_price = newRecord.salePrice;
      delete newRecord.costPrice;
      delete newRecord.salePrice;
    } else if (table === 'sales') {
      newRecord.product_id = newRecord.productId;
      newRecord.product_name = newRecord.productName;
      newRecord.original_price = newRecord.originalPrice;
      newRecord.final_price = newRecord.finalPrice;
      newRecord.cost_at_sale = newRecord.costAtSale;
      newRecord.payment_method = newRecord.paymentMethod;
      newRecord.seller_name = newRecord.sellerName;
      newRecord.transaction_id = newRecord.transactionId;
      newRecord.is_deleted = newRecord.isDeleted;
      delete newRecord.productId;
      delete newRecord.productName;
      delete newRecord.originalPrice;
      delete newRecord.finalPrice;
      delete newRecord.costAtSale;
      delete newRecord.paymentMethod;
      delete newRecord.sellerName;
      delete newRecord.transactionId;
      delete newRecord.isDeleted;
    } else if (table === 'transactions') {
      newRecord.payment_method = newRecord.paymentMethod;
      newRecord.is_deleted = newRecord.isDeleted;
      delete newRecord.paymentMethod;
      delete newRecord.isDeleted;
    }
    // Add tenant_id if not present (should be for all tenant-specific tables)
    if (!newRecord.tenant_id && tenantId) {
      newRecord.tenant_id = tenantId;
    }
    return newRecord;
  },

  getSupabaseTableName(dexieTable: string): string {
    switch (dexieTable) {
      case 'serviceOrders': return 'service_orders';
      case 'products': return 'products';
      case 'sales': return 'sales';
      case 'transactions': return 'transactions';
      case 'settings': return 'cloud_data'; // Special case for settings
      case 'users': return 'users';
      default: throw new Error(`Unknown Dexie table for Supabase mapping: ${dexieTable}`);
    }
  }
};