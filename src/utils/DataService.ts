import { db, IProduct, IServiceOrder, ISale, ICustomer } from './offlineDB';
import { addToQueue } from './syncQueue';
import { OnlineDB } from '../../utils/api.ts';

/**
 * Sincroniza os dados do Supabase para o IndexedDB.
 * Esta função deve ser chamada quando o app fica online.
 */
export async function syncOnlineToOffline(tenantId: string) {
  try {
    console.log('Iniciando sincronização da nuvem para o local...');

    const [products, orders, sales, customers] = await Promise.all([
      OnlineDB.fetchProducts(tenantId),
      OnlineDB.fetchOrders(tenantId),
      OnlineDB.fetchSales(tenantId),
      OnlineDB.fetchCustomers(tenantId),
    ]);

    await db.transaction('rw', db.products, db.service_orders, db.sales, db.customers, async () => {
      await db.products.bulkPut(products as IProduct[]);
      await db.service_orders.bulkPut(orders as IServiceOrder[]);
      await db.sales.bulkPut(sales as ISale[]);
      await db.customers.bulkPut(customers as ICustomer[]);
    });

    console.log('Sincronização da nuvem para o local concluída com sucesso.');
    return { success: true };
  } catch (error) {
    console.error('Falha na sincronização da nuvem para o local:', error);
    return { success: false, error };
  }
}

// --- Funções CRUD para Produtos ---

export const getProducts = () => db.products.toArray();

export const upsertProduct = async (product: IProduct, tenantId: string) => {
  await db.products.put(product);
  await addToQueue('update', 'products', { ...product, tenant_id: tenantId });
};

export const deleteProduct = async (id: string) => {
  await db.products.delete(id);
  await addToQueue('delete', 'products', { id });
};

// --- Funções CRUD para Ordens de Serviço ---

export const getServiceOrders = () => db.service_orders.toArray();

export const upsertServiceOrder = async (order: IServiceOrder, tenantId: string) => {
  await db.service_orders.put(order);
  await addToQueue('update', 'service_orders', { ...order, tenant_id: tenantId });
};

export const deleteServiceOrder = async (id: string) => {
  await db.service_orders.delete(id);
  await addToQueue('delete', 'service_orders', { id });
};

// --- Adicione aqui as funções para Vendas e Clientes seguindo o mesmo padrão ---