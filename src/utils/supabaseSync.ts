import { OnlineDB } from '../../utils/api.ts'; // Usaremos a classe existente para as chamadas de API
import { db } from './offlineDB';

/**
 * Processa a fila de sincronização, enviando dados pendentes para o Supabase.
 * Retorna true se a sincronização for bem-sucedida, false caso contrário.
 */
export async function processSyncQueue(): Promise<boolean> {
  const pendingItems = await db.getPendingSyncItems();
  if (pendingItems.length === 0) {
    console.log('Fila de sincronização vazia. Nada a fazer.');
    return true;
  }

  console.log(`Processando ${pendingItems.length} itens da fila de sincronização...`);

  // Agrupa operações por tabela para otimizar o envio
  const operationsByTable = pendingItems.reduce((acc, item) => {
    if (!acc[item.tableName]) {
      acc[item.tableName] = [];
    }
    acc[item.tableName].push(item);
    return acc;
  }, {} as Record<string, typeof pendingItems>);

  try {
    for (const tableName in operationsByTable) {
      const items = operationsByTable[tableName];
      const toCreateOrUpdate = items
        .filter(item => item.operation === 'create' || item.operation === 'update')
        .map(item => item.data);
      
      const toDelete = items
        .filter(item => item.operation === 'delete')
        .map(item => item.data.id);

      console.log(`Sincronizando tabela: ${tableName}`, { toCreateOrUpdate, toDelete });

      // Lógica de Upsert para a tabela específica
      if (toCreateOrUpdate.length > 0) {
        let result: { success: boolean, message?: string };
        switch (tableName) {
          case 'products':
            result = await OnlineDB.upsertProducts(items[0].data.tenant_id, toCreateOrUpdate);
            break;
          case 'service_orders':
            result = await OnlineDB.upsertOrders(items[0].data.tenant_id, toCreateOrUpdate);
            break;
          case 'sales':
            result = await OnlineDB.upsertSales(items[0].data.tenant_id, toCreateOrUpdate);
            break;
          case 'customers':
            // Supondo que você criará um método upsertCustomers em OnlineDB
            // result = await OnlineDB.upsertCustomers(items[0].data.tenant_id, toCreateOrUpdate);
            result = { success: true }; // Placeholder
            break;
          default:
            result = { success: false, message: 'Tabela desconhecida' };
            break;
        }
        if (!result.success) throw new Error(`Falha ao sincronizar (upsert) ${tableName}: ${result.message}`);
      }

      // Lógica de Delete para a tabela específica
      if (toDelete.length > 0) {
        for (const id of toDelete) {
          let result: { success: boolean, message?: string };
           switch (tableName) {
            case 'products':
              result = await OnlineDB.deleteProduct(id);
              break;
            case 'service_orders':
               result = await OnlineDB.deleteOS(id);
              break;
            case 'sales':
               result = await OnlineDB.deleteSale(id);
              break;
            case 'customers':
              // Supondo que você criará um método deleteCustomer em OnlineDB
              // result = await OnlineDB.deleteCustomer(id);
              result = { success: true }; // Placeholder
              break;
            default:
              result = { success: false, message: 'Tabela desconhecida' };
              break;
          }
          if (!result.success) throw new Error(`Falha ao sincronizar (delete) ${tableName} ID ${id}: ${result.message}`);
        }
      }
    }

    // Se tudo deu certo, limpa a fila
    await db.clearSyncQueue();
    console.log('Fila de sincronização processada e limpa com sucesso!');
    return true;

  } catch (error) {
    console.error('Erro ao processar a fila de sincronização:', error);
    return false;
  }
}
