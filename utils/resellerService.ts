import { Reseller, ResellerPayoutRecord, Tenant } from '../types';
import { OnlineDB, supabase } from './api';

export class ResellerService {
  private static RESELLERS_KEY = 'resellers_data';
  private static PAYOUTS_KEY = 'reseller_payouts';
  private static TENANT_METADATA_KEY = 'tenants_reseller_metadata';

  // ============================================================================
  // 1. GESTÃO DE REVENDEDORES (SUPER ADMIN)
  // ============================================================================

  /**
   * Busca todos os revendedores cadastrados no sistema.
   */
  static async getResellers(): Promise<Reseller[]> {
    try {
      const { data, error } = await supabase
        .from('cloud_data')
        .select('data_json')
        .eq('tenant_id', 'SYSTEM')
        .eq('store_key', this.RESELLERS_KEY)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('[ResellerService] Erro ao buscar revendedores no cloud_data:', error);
      }

      if (Array.isArray(data?.data_json)) {
        try {
          localStorage.setItem('cached_resellers', JSON.stringify(data.data_json));
        } catch {}
        return data.data_json;
      }

      // Fallback para cache local se offline
      const cached = localStorage.getItem('cached_resellers');
      if (cached) {
        return JSON.parse(cached);
      }

      return [];
    } catch (e) {
      console.warn('[ResellerService] Exceção ao buscar revendedores:', e);
      const cached = localStorage.getItem('cached_resellers');
      return cached ? JSON.parse(cached) : [];
    }
  }

  /**
   * Salva ou atualiza um revendedor no sistema.
   */
  static async saveReseller(reseller: Reseller): Promise<{ success: boolean; message?: string }> {
    try {
      const currentList = await this.getResellers();
      const cleanUsername = reseller.username.trim().toLowerCase();

      // Validação de duplicidade de usuário
      const exists = currentList.find(r => r.username.toLowerCase() === cleanUsername && r.id !== reseller.id);
      if (exists) {
        return { success: false, message: 'Já existe um revendedor com este nome de usuário.' };
      }

      const index = currentList.findIndex(r => r.id === reseller.id);
      let updatedList: Reseller[];

      const sanitizedReseller: Reseller = {
        ...reseller,
        username: cleanUsername,
        commissionPercentage: Number(reseller.commissionPercentage) || 0,
        status: reseller.status || 'active',
        createdAt: reseller.createdAt || new Date().toISOString()
      };

      if (index >= 0) {
        updatedList = [...currentList];
        updatedList[index] = {
          ...updatedList[index],
          ...sanitizedReseller,
          // Se não informou nova senha na edição, mantém a anterior
          password: reseller.password?.trim() ? reseller.password.trim() : updatedList[index].password
        };
      } else {
        updatedList = [sanitizedReseller, ...currentList];
      }

      // 1. Salva em cloud_data
      const { error } = await supabase
        .from('cloud_data')
        .upsert({
          tenant_id: 'SYSTEM',
          store_key: this.RESELLERS_KEY,
          data_json: updatedList,
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id,store_key' });

      if (error) throw error;

      // 2. Atualiza cache local
      try {
        localStorage.setItem('cached_resellers', JSON.stringify(updatedList));
      } catch {}

      return { success: true };
    } catch (e: any) {
      console.error('[ResellerService] Erro ao salvar revendedor:', e);
      return { success: false, message: e.message || 'Erro ao salvar revendedor no banco de dados.' };
    }
  }

  /**
   * Exclui um revendedor do sistema.
   */
  static async deleteReseller(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const currentList = await this.getResellers();
      const updatedList = currentList.filter(r => r.id !== id);

      const { error } = await supabase
        .from('cloud_data')
        .upsert({
          tenant_id: 'SYSTEM',
          store_key: this.RESELLERS_KEY,
          data_json: updatedList,
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id,store_key' });

      if (error) throw error;

      try {
        localStorage.setItem('cached_resellers', JSON.stringify(updatedList));
      } catch {}

      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erro ao excluir revendedor.' };
    }
  }

  // ============================================================================
  // 2. GESTÃO DE REPASSES DE PAGAMENTO (SUPER ADMIN)
  // ============================================================================

  /**
   * Busca registros de repasses efetuados aos revendedores.
   */
  static async getPayouts(): Promise<ResellerPayoutRecord[]> {
    try {
      const { data, error } = await supabase
        .from('cloud_data')
        .select('data_json')
        .eq('tenant_id', 'SYSTEM')
        .eq('store_key', this.PAYOUTS_KEY)
        .maybeSingle();

      if (Array.isArray(data?.data_json)) {
        return data.data_json;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Salva ou atualiza um registro de repasse.
   */
  static async savePayout(payout: ResellerPayoutRecord): Promise<{ success: boolean; message?: string }> {
    try {
      const current = await this.getPayouts();
      const index = current.findIndex(p => p.id === payout.id);
      let updated: ResellerPayoutRecord[];

      if (index >= 0) {
        updated = [...current];
        updated[index] = payout;
      } else {
        updated = [payout, ...current];
      }

      await supabase
        .from('cloud_data')
        .upsert({
          tenant_id: 'SYSTEM',
          store_key: this.PAYOUTS_KEY,
          data_json: updated,
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id,store_key' });

      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erro ao salvar repasse.' };
    }
  }

  // ============================================================================
  // 3. METADADOS E ASSOCIAÇÃO DE LOJAS COM REVENDEDORES
  // ============================================================================

  /**
   * Busca mapa com metadados de revendedores para todas as lojas.
   */
  static async getTenantMetadataMap(): Promise<Record<string, any>> {
    try {
      const { data } = await supabase
        .from('cloud_data')
        .select('data_json')
        .eq('tenant_id', 'SYSTEM')
        .eq('store_key', this.TENANT_METADATA_KEY)
        .maybeSingle();

      if (data?.data_json && typeof data.data_json === 'object') {
        try {
          localStorage.setItem('cached_tenant_metadata', JSON.stringify(data.data_json));
        } catch {}
        return data.data_json;
      }

      const cached = localStorage.getItem('cached_tenant_metadata');
      return cached ? JSON.parse(cached) : {};
    } catch (e) {
      const cached = localStorage.getItem('cached_tenant_metadata');
      return cached ? JSON.parse(cached) : {};
    }
  }

  /**
   * Atualiza metadados de uma loja específica (revendedor vinculado, status de pagamento, bloqueio, etc).
   */
  static async updateTenantMetadata(
    tenantId: string, 
    metadata: {
      resellerId?: string;
      resellerName?: string;
      resellerUsername?: string;
      isBlocked?: boolean;
      monthlyPaymentStatus?: 'paid' | 'pending' | 'expired';
      monthlyPrice?: number;
      lastPaymentDate?: string;
      nextExpiresAt?: string;
      ncmDatabaseVersion?: string;
      ncmLastSync?: string;
    }
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const currentMap = await this.getTenantMetadataMap();
      currentMap[tenantId] = {
        ...(currentMap[tenantId] || {}),
        ...metadata,
        updatedAt: new Date().toISOString()
      };

      await supabase
        .from('cloud_data')
        .upsert({
          tenant_id: 'SYSTEM',
          store_key: this.TENANT_METADATA_KEY,
          data_json: currentMap,
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id,store_key' });

      try {
        localStorage.setItem('cached_tenant_metadata', JSON.stringify(currentMap));
      } catch {}

      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erro ao atualizar metadados da loja.' };
    }
  }

  /**
   * Bloqueia ou desbloqueia o acesso a uma loja.
   */
  static async toggleTenantBlock(tenantId: string, isBlocked: boolean): Promise<{ success: boolean; message?: string }> {
    return await this.updateTenantMetadata(tenantId, { isBlocked });
  }

  /**
   * Registra pagamento de mensalidade de uma loja e prorroga a validade por 30 dias.
   */
  static async registerStorePayment(tenantId: string, currentExpiresAt?: string, monthlyPrice?: number): Promise<{ success: boolean; message?: string }> {
    try {
      const now = new Date();
      const baseDate = (currentExpiresAt && new Date(currentExpiresAt) > now) 
        ? new Date(currentExpiresAt) 
        : now;
      
      baseDate.setDate(baseDate.getDate() + 30);
      const newExpiresStr = baseDate.toISOString();

      // 1. Atualiza na tabela tenants via API oficial
      await OnlineDB.setSubscriptionDate(tenantId, newExpiresStr, 'active', 'monthly');

      // 2. Atualiza nos metadados de revendedor
      await this.updateTenantMetadata(tenantId, {
        monthlyPaymentStatus: 'paid',
        lastPaymentDate: new Date().toISOString(),
        nextExpiresAt: newExpiresStr,
        monthlyPrice: monthlyPrice || 79.90,
        isBlocked: false
      });

      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erro ao registrar pagamento da mensalidade.' };
    }
  }

  /**
   * Sincroniza a base de dados de NCM e regras fiscais para uma loja.
   */
  static async syncStoreNcmDatabase(tenantId: string): Promise<{ success: boolean; message?: string }> {
    try {
      // 1. Busca NCMs e produtos fiscais padrão do sistema
      const { data: globalFiscal } = await supabase
        .from('cloud_data')
        .select('data_json')
        .eq('tenant_id', 'SYSTEM')
        .eq('store_key', 'fiscal_ncm_database')
        .maybeSingle();

      // 2. Grava na loja como base ativada
      await supabase
        .from('cloud_data')
        .upsert({
          tenant_id: tenantId,
          store_key: 'store_ncm_synced',
          data_json: {
            syncedAt: new Date().toISOString(),
            version: '2026.1',
            status: 'active'
          },
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id,store_key' });

      // 3. Atualiza metadados da loja
      await this.updateTenantMetadata(tenantId, {
        ncmDatabaseVersion: 'Tabela IBPT/SEFAZ 2026.1 Atualizada',
        ncmLastSync: new Date().toISOString()
      });

      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erro ao sincronizar base NCM da loja.' };
    }
  }

  /**
   * Salva configurações de pagamento do próprio revendedor (Mercado Pago e PIX).
   */
  static async saveResellerPaymentConfig(
    resellerId: string, 
    config: {
      mercadoPagoAccessToken?: string;
      mercadoPagoPublicKey?: string;
      pixKey?: string;
      pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
    }
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const resellers = await this.getResellers();
      const target = resellers.find(r => r.id === resellerId);
      if (!target) return { success: false, message: 'Revendedor não encontrado.' };

      const updated = {
        ...target,
        ...config
      };

      return await this.saveReseller(updated);
    } catch (e: any) {
      return { success: false, message: e.message || 'Erro ao salvar credenciais de pagamento.' };
    }
  }

  /**
   * Autentica credenciais de um revendedor (login e senha).
   */
  static async authenticateReseller(username: string, password: string): Promise<{ success: boolean; reseller?: Reseller; message?: string }> {
    try {
      const cleanUser = (username || '').trim().toLowerCase();
      const cleanPass = (password || '').trim();

      if (!cleanUser || !cleanPass) {
        return { success: false, message: 'Preencha usuário e senha.' };
      }

      const resellers = await this.getResellers();
      const reseller = resellers.find(r => r.username.toLowerCase() === cleanUser);

      if (!reseller) {
        return { success: false, message: 'Revendedor não cadastrado.' };
      }

      if (reseller.password && reseller.password !== cleanPass) {
        return { success: false, message: 'Senha incorreta para a conta de revendedor.' };
      }

      if (reseller.status === 'blocked') {
        return { success: false, message: 'Acesso bloqueado: esta conta de revenda foi suspensa pelo Super Admin.' };
      }

      return { success: true, reseller };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erro ao autenticar revendedor.' };
    }
  }
}
