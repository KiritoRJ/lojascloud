import Dexie, { Table } from 'dexie';

// Definição das interfaces para os dados
export interface IProduct {
  id: string;
  name: string;
  barcode?: string;
  photo?: string;
  costPrice: number;
  salePrice: number;
  quantity: number;
  updated_at?: string;
}

export interface IServiceOrder {
  id: string;
  customerName: string;
  phoneNumber?: string;
  deviceBrand: string;
  deviceModel: string;
  status: string;
  // ... outros campos da OS
  updated_at?: string;
}

export interface ISale {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  finalPrice: number;
  date: string;
  // ... outros campos da venda
  updated_at?: string;
}

export interface ICustomer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  // ... outros campos do cliente
  updated_at?: string;
}

export interface ISyncQueue {
  id?: number;
  operation: 'create' | 'update' | 'delete';
  tableName: 'products' | 'service_orders' | 'sales' | 'customers';
  data: any;
  timestamp: number;
}

class OfflineDB extends Dexie {
  products!: Table<IProduct>;
  service_orders!: Table<IServiceOrder>;
  sales!: Table<ISale>;
  customers!: Table<ICustomer>;
  sync_queue!: Table<ISyncQueue>;

  constructor() {
    super('AssistProDB');
    this.version(1).stores({
      products: 'id, name, updated_at',
      service_orders: 'id, customerName, status, updated_at',
      sales: 'id, productId, date, updated_at',
      customers: 'id, name, phone, updated_at',
      sync_queue: '++id, timestamp',
    });
  }

  // Métodos para interagir com a fila de sincronização
  async addToSyncQueue(item: ISyncQueue) {
    return await this.sync_queue.add(item);
  }

  async getPendingSyncItems(): Promise<ISyncQueue[]> {
    return await this.sync_queue.orderBy('timestamp').toArray();
  }

  async clearSyncQueue() {
    return await this.sync_queue.clear();
  }
}

export const db = new OfflineDB();