
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lawcmqsjhwuhogsukhbf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_c2wQfanSj96FRWqoCq9KIw_2FhxuRBv';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export class OnlineDB {
  /**
   * Login Principal
   */
  static async login(username: string, passwordPlain: string) {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = passwordPlain.trim();

    // Bypass Local para Desenvolvedor
    if (cleanUser === 'wandev' && (cleanPass === '123' || cleanPass === 'wan123')) {
      return { success: true, type: 'super' };
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', cleanUser)
        .eq('password', cleanPass)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return { success: false, message: "Usuário ou senha inválidos." };
      }

      return { 
        success: true, 
        type: data.role || 'admin', 
        tenant: { 
          id: data.tenant_id, 
          username: data.username 
        } 
      };
    } catch (err: any) {
      console.error("Erro Login:", err);
      return { success: false, message: "Erro de conexão: " + err.message };
    }
  }

  /**
   * Criação de nova Empresa e Usuário Admin
   */
  static async createTenant(tenantData: any) {
    try {
      // 1. Criar a Loja na tabela 'tenants'
      const { error: tError } = await supabase
        .from('tenants')
        .insert([{
          id: tenantData.id,
          store_name: tenantData.storeName,
          created_at: new Date().toISOString()
        }]);

      if (tError) {
        return { success: false, message: "Erro ao criar loja: " + tError.message };
      }

      // 2. Criar o Usuário na tabela 'users'
      const { error: uError } = await supabase
        .from('users')
        .insert([{
          username: tenantData.adminUsername.toLowerCase().trim(),
          password: tenantData.adminPasswordPlain,
          role: 'admin',
          tenant_id: tenantData.id,
          store_name: tenantData.storeName
        }]);

      if (uError) {
        // Se falhar o usuário, removemos a loja para evitar inconsistência
        await supabase.from('tenants').delete().eq('id', tenantData.id);
        return { success: false, message: "Erro ao criar usuário: " + uError.message };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, message: "Falha crítica: " + e.message };
    }
  }

  /**
   * Listar todas as lojas (Painel Wandev)
   */
  static async getTenants() {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error("Erro getTenants:", e);
      return [];
    }
  }

  /**
   * Sincronização Push
   */
  static async syncPush(tenantId: string, storeKey: string, data: any) {
    if (!tenantId) return { success: false };
    try {
      const { error } = await supabase
        .from('cloud_data')
        .upsert({ 
          tenant_id: tenantId, 
          store_key: storeKey, 
          data_json: data, 
          updated_at: new Date().toISOString() 
        }, { onConflict: 'tenant_id,store_key' });
      
      return { success: !error, error };
    } catch (e) {
      return { success: false, error: e };
    }
  }

  /**
   * Sincronização Pull
   */
  static async syncPull(tenantId: string, storeKey: string) {
    if (!tenantId) return null;
    try {
      const { data, error } = await supabase
        .from('cloud_data')
        .select('data_json')
        .eq('tenant_id', tenantId)
        .eq('store_key', storeKey)
        .maybeSingle();
      
      if (error) return null;
      return data ? data.data_json : null;
    } catch (e) {
      return null;
    }
  }
}
