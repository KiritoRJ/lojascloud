import { db } from '../db';
import { SupabaseClient } from '@supabase/supabase-js';

interface OfflineOperation {
  id?: number;
  table: string;
  type: 'add' | 'update' | 'delete';
  payload: any;
  timestamp: number;
}

export class OfflineSyncService {
  private supabase: SupabaseClient;
  private isSyncing: boolean = false;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
    window.addEventListener('online', this.syncOfflineData.bind(this));
  }

  async queueOperation(table: string, type: 'add' | 'update' | 'delete', payload: any) {
    await db.table<OfflineOperation>('offlineOperations').add({
      table,
      type,
      payload,
      timestamp: Date.now(),
    });
    console.log(`Operation queued for ${table}: ${type}`, payload);
    this.syncOfflineData(); // Attempt to sync immediately if online
  }

  async syncOfflineData() {
    if (!navigator.onLine || this.isSyncing) {
      return;
    }

    this.isSyncing = true;
    console.log('Attempting to sync offline data...');

    const operations = await db.table<OfflineOperation>('offlineOperations').toArray();

    for (const op of operations.sort((a, b) => a.timestamp - b.timestamp)) {
      try {
        console.log(`Processing offline operation: ${op.type} on ${op.table} with payload`, op.payload);
        switch (op.type) {
          case 'add':
            await this.supabase.from(op.table).insert(op.payload);
            break;
          case 'update':
            await this.supabase.from(op.table).update(op.payload).match({ id: op.payload.id });
            break;
          case 'delete':
            await this.supabase.from(op.table).delete().match({ id: op.payload.id });
            break;
        }
        await db.table<OfflineOperation>('offlineOperations').delete(op.id);
        console.log(`Successfully synced operation: ${op.type} on ${op.table}`);
      } catch (error) {
        console.error(`Failed to sync operation ${op.type} on ${op.table}:`, error);
        // Depending on error, might re-queue or mark as failed
        // For now, we'll stop on first error to prevent data corruption issues
        this.isSyncing = false;
        return;
      }
    }
    this.isSyncing = false;
    console.log('Offline data synchronization complete.');
  }
}
