import Dexie, { Table } from 'dexie';

export interface Product {
  id?: string;
  name: string;
  price: number;
  description?: string;
}

export interface ServiceOrder {
  id?: string;
  customerName: string;
  description: string;
  status: string;
  price: number;
}

export interface Sale {
  id?: string;
  customerName: string;
  total: number;
  products: {
    productId: string;
    quantity: number;
    price: number;
  }[];
  date: Date;
}

export class AppDB extends Dexie {
  products!: Table<Product>;
  serviceOrders!: Table<ServiceOrder>;
  sales!: Table<Sale>;

  constructor() {
    super('LojasCloudDB');
    this.version(1).stores({
      products: '++id, name, price',
      serviceOrders: '++id, customerName, status',
      sales: '++id, customerName, total, date',
      offlineOperations: '++id, table, type, timestamp',
    });
  }
}

export const db = new AppDB();

export interface OfflineOperation {
  id?: number;
  table: string;
  type: 'add' | 'update' | 'delete';
  payload: any;
  timestamp: number;
}
