
import Dexie, { Table } from 'dexie';
import { ServiceOrder, Product, Sale, Transaction, AppSettings, User } from '../types';

export interface SyncItem {
  id: string; // Mudei para UUID string
  tenantId: string;
  type: 'orders' | 'products' | 'sales' | 'transactions' | 'settings' | 'users';
  action: 'upsert' | 'delete';
  data: any;
  sincronizado: 0 | 1; // 0 para false, 1 para true (melhor para indexação)
  criadoEm: number;
}

export class AssistenciaProDB extends Dexie {
  orders!: Table<ServiceOrder & { tenantId: string }, string>;
  products!: Table<Product & { tenantId: string }, string>;
  sales!: Table<Sale & { tenantId: string }, string>;
  transactions!: Table<Transaction & { tenantId: string }, string>;
  settings!: Table<AppSettings & { tenantId: string }, string>;
  users!: Table<User & { tenantId: string }, string>;
  pendentes!: Table<SyncItem, string>;

  constructor() {
    super('AssistenciaPro_OfflineDB');
    this.version(11).stores({
      // Mantemos as tabelas de dados para leitura e exibição offline rápida
      orders: 'id, tenantId, customerName, status, isDeleted',
      products: 'id, tenantId, name, barcode',
      sales: 'id, tenantId, productId, date, isDeleted',
      transactions: 'id, tenantId, type, date, isDeleted',
      settings: 'tenantId',
      users: 'id, tenantId, username, role',
      // A nova fila de sincronização, como solicitado
      pendentes: 'id, sincronizado, criadoEm'
    });
  }
}

export const db = new AssistenciaProDB();
