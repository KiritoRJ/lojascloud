
import { createClient } from '@supabase/supabase-js';
import { Customer, ServiceOrder } from '../types';
import { OfflineAuth } from './offlineAuth';

const SUPABASE_URL = (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || (import.meta as any).env?.VITE_SUPABASE_URL || 'https://lawcmqsjhwuhogsukhbf.supabase.co';
const SUPABASE_KEY = (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_c2wQfanSj96FRWqoCq9KIw_2FhxuRBv';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper para detectar falhas transitórias de conexão / offline
export function isNetworkOrOfflineError(err: any): boolean {
  if (!err) return false;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  const str = String(err?.message || err?.details || err?.hint || err || '').toLowerCase();
  return (
    str.includes('failed to fetch') ||
    str.includes('networkerror') ||
    str.includes('network error') ||
    str.includes('load failed') ||
    str.includes('abort') ||
    str.includes('timeout') ||
    str.includes('offline') ||
    str.includes('econnrefused') ||
    str.includes('typeerror: failed to fetch')
  );
}

// Callback para notificar em tempo real sobre o estado do banco SQL e rede
let onApiErrorCallback: ((error: any, context: string) => void) | null = null;
let onApiSuccessCallback: (() => void) | null = null;

export function registerApiStatusReporter(
  onError: (error: any, context: string) => void,
  onSuccess: () => void
) {
  onApiErrorCallback = onError;
  onApiSuccessCallback = onSuccess;
}

export function markSupabaseSuccess() {
  if (onApiSuccessCallback) {
    onApiSuccessCallback();
  }
}

// Log suave para não alarmar o usuário quando o app estiver offline ou com instabilidade de rede
export function logSupabaseNotice(context: string, error: any) {
  if (onApiErrorCallback) {
    onApiErrorCallback(error, context);
  }
  if (isNetworkOrOfflineError(error)) {
    console.debug(`[Modo Offline/Cache] ${context}: conexão com a nuvem indisponível no momento.`);
  } else {
    console.warn(`[Supabase] ${context}:`, error?.message || error);
  }
}

export class OnlineDB {
  // Busca configurações globais do sistema
  static async getGlobalSettings() {
    try {
      const { data, error } = await supabase
        .from('cloud_data')
        .select('data_json')
        .eq('tenant_id', 'SYSTEM')
        .eq('store_key', 'global_plans')
        .maybeSingle();
      
      if (error) throw error;
      
      const defaultSettings = {
        monthly: { price: 49.90, maxUsers: 2, maxOS: 999, maxProducts: 999 },
        quarterly: { price: 129.90, maxUsers: 999, maxOS: 999, maxProducts: 999 },
        yearly: { price: 499.00, maxUsers: 999, maxOS: 999, maxProducts: 999 },
        trial: { maxUsers: 1000, maxOS: 1000, maxProducts: 1000 },
        supportPhone: '5511999999999',
        aiPackages: {
          package50: { price: 14.90, credits: 50 },
          package150: { price: 29.90, credits: 150 },
          package500: { price: 69.90, credits: 500 },
        },
        aiApiKey: '',
        aiDisabledGlobally: false
      };

      if (!data?.data_json) return defaultSettings;

      // Compatibilidade com formato antigo (apenas preços)
      const json = data.data_json;
      if (typeof json.monthly === 'number') {
        return {
          ...defaultSettings,
          monthly: { ...defaultSettings.monthly, price: json.monthly },
          quarterly: { ...defaultSettings.quarterly, price: json.quarterly },
          yearly: { ...defaultSettings.yearly, price: json.yearly }
        };
      }

      return {
        ...defaultSettings,
        ...json,
        aiApiKey: json.aiApiKey || json.geminiApiKey || '',
        aiDisabledGlobally: json.aiDisabledGlobally === true || json.isAiDisabledGlobally === true
      };
    } catch (e) {
      return {
        monthly: { price: 49.90, maxUsers: 2, maxOS: 999, maxProducts: 999 },
        quarterly: { price: 129.90, maxUsers: 999, maxOS: 999, maxProducts: 999 },
        yearly: { price: 499.00, maxUsers: 999, maxOS: 999, maxProducts: 999 },
        trial: { maxUsers: 1000, maxOS: 1000, maxProducts: 1000 },
        supportPhone: '5511999999999',
        aiPackages: {
          package50: { price: 14.90, credits: 50 },
          package150: { price: 29.90, credits: 150 },
          package500: { price: 69.90, credits: 500 },
        },
        aiApiKey: '',
        aiDisabledGlobally: false
      };
    }
  }

  // Testa a chave de API da IA (Google Gemini) no backend
  static async testAIApiKey(apiKey?: string) {
    try {
      const response = await fetch('/api/ai/test-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });
      const text = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (_) {
        return {
          success: false,
          error: `O servidor retornou uma resposta não-JSON (Status ${response.status}). Verifique a implantação na Vercel.`,
        };
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Falha de conexão com o servidor ao testar a chave da IA.',
      };
    }
  }

  // Obtém status detalhado da IA no sistema
  static async getAISystemStatus() {
    try {
      const response = await fetch('/api/ai/system-status');
      const text = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (_) {
        return {
          success: false,
          aiDisabledGlobally: false,
          hasApiKey: false,
          keySource: 'none',
        };
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        aiDisabledGlobally: false,
        hasApiKey: false,
        keySource: 'none',
      };
    }
  }

  // Atualiza configurações globais do sistema
  static async updateGlobalSettings(plans: any) {
    try {
      // 1. Tenta garantir que o tenant 'SYSTEM' existe no banco caso a foreign key ainda esteja ativa
      try {
        await supabase
          .from('tenants')
          .upsert({
            id: 'SYSTEM',
            store_name: 'Configurações Globais do Sistema'
          }, { onConflict: 'id' });
      } catch (ignored) {
        // Silencioso se o schema de tenants já estiver resolvido ou com restrição removida
      }

      // 2. Salva na tabela cloud_data
      const { error } = await supabase
        .from('cloud_data')
        .upsert({
          tenant_id: 'SYSTEM',
          store_key: 'global_plans',
          data_json: plans,
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id,store_key' });
      
      if (error) {
        // Fallback: se houve erro de constraint no cliente, tentar via rota backend com service role
        try {
          const apiRes = await fetch('/api/ai/save-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings: plans })
          });
          const apiData = await apiRes.json().catch(() => null);
          if (apiRes.ok && apiData?.success) {
            return { success: true };
          }
        } catch (_) {}

        throw error;
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  // Atualiza preços customizados de uma loja
  static async updateTenantCustomPrices(tenantId: string, prices: { monthly?: number, quarterly?: number, yearly?: number }) {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          custom_monthly_price: prices.monthly,
          custom_quarterly_price: prices.quarterly,
          custom_yearly_price: prices.yearly
        })
        .eq('id', tenantId);
      
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  // Atualiza permissões de recursos e limite de usuários de uma loja
  static async updateTenantFeatures(tenantId: string, features: any, maxUsers: number, maxOS: number, maxProducts: number, printerSize?: 58 | 80, retentionMonths?: number) {
    try {
      const { error: tenantError } = await supabase
        .from('tenants')
        .update({
          enabled_features: features,
          max_users: maxUsers,
          printer_size: printerSize,
          retention_months: retentionMonths
        })
        .eq('id', tenantId);
      if (tenantError) throw tenantError;

      const { error: limitsError } = await supabase
        .from('tenant_limits')
        .upsert({ 
          tenant_id: tenantId, 
          max_os: maxOS, 
          max_products: maxProducts 
        }, { onConflict: 'tenant_id' });
      if (limitsError) throw limitsError;

      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  // Ativa ou desativa rapidamente o Modo Fiscal de uma loja
  static async toggleTenantFiscalMode(tenantId: string, enabled: boolean) {
    try {
      const { data: tenant, error: fetchErr } = await supabase
        .from('tenants')
        .select('enabled_features')
        .eq('id', tenantId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;

      const currentFeatures = tenant?.enabled_features || {};
      const updatedFeatures = {
        ...currentFeatures,
        fiscalMode: enabled,
        fiscalTab: enabled
      };

      const { error: updateErr } = await supabase
        .from('tenants')
        .update({
          enabled_features: updatedFeatures
        })
        .eq('id', tenantId);

      if (updateErr) throw updateErr;
      return { success: true, enabled };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  // Realiza o login do usuário via API do servidor (seguro)
  static async login(username: string, passwordPlain: string) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: passwordPlain })
      });
      return await response.json();
    } catch (err) {
      return { success: false, message: "Erro ao conectar com o servidor." };
    }
  }

  // Verifica limite de usuários e registra sessão
  static async checkAndRegisterSession(tenantId: string, maxUsers: number, deviceId: string, userName: string) {
    try {
      // 1. Limpa sessões inativas (mais de 5 minutos sem heartbeat)
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      await supabase.from('active_sessions').delete().eq('tenant_id', tenantId).lt('last_seen', fiveMinsAgo);

      // 2. Conta as sessões ativas para esta loja
      const { count, error: countError } = await supabase
        .from('active_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      if (countError) throw countError;

      // 3. Verifica se este dispositivo já tem uma sessão
      const { data: existing } = await supabase
        .from('active_sessions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('device_id', deviceId)
        .maybeSingle();

      // Se não tem sessão e o limite foi atingido, bloqueia o login
      if (!existing && count !== null && count >= maxUsers) {
        return { success: false, message: `Limite de telas atingido. O plano atual permite apenas ${maxUsers} acesso(s) simultâneo(s).` };
      }

      // 4. Registra ou atualiza a sessão
      const { error: upsertError } = await supabase
        .from('active_sessions')
        .upsert({
          tenant_id: tenantId,
          device_id: deviceId,
          user_name: userName,
          last_seen: new Date().toISOString()
        }, { onConflict: 'tenant_id, device_id' });

      if (upsertError) throw upsertError;

      return { success: true };
    } catch (e: any) {
      console.error("Erro ao registrar sessão:", e);
      return { success: false, message: e.message };
    }
  }

  // Atualiza o "sinal de vida" da sessão
  static async heartbeatSession(tenantId: string, deviceId: string, maxUsers: number) {
    try {
      // Limpa sessões inativas primeiro
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      await supabase.from('active_sessions').delete().eq('tenant_id', tenantId).lt('last_seen', fiveMinsAgo);

      // Verifica se a nossa sessão ainda existe
      const { data: existing } = await supabase
        .from('active_sessions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('device_id', deviceId)
        .maybeSingle();

      if (!existing) {
         // Perdemos a sessão (ficamos offline muito tempo). Verifica se ainda tem vaga.
         const { count } = await supabase
          .from('active_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId);

         if (count !== null && count >= maxUsers) {
           return { success: false, kicked: true }; // Força o logout
         }
      }

      // Atualiza o last_seen
      await supabase
        .from('active_sessions')
        .upsert({
          tenant_id: tenantId,
          device_id: deviceId,
          last_seen: new Date().toISOString()
        }, { onConflict: 'tenant_id, device_id' });

      return { success: true };
    } catch (e) {
       // Ignora erros de rede durante o heartbeat para não deslogar à toa
       return { success: true };
    }
  }

  // Remove a sessão explicitamente (Logout)
  static async removeSession(tenantId: string, deviceId: string) {
    try {
      await supabase.from('active_sessions').delete().eq('tenant_id', tenantId).eq('device_id', deviceId);
    } catch (e) {
      console.error("Erro ao remover sessão:", e);
    }
  }

  // Altera a senha do administrador via API do servidor (seguro)
  static async changePassword(tenantId: string, oldPassword: string, newPassword: string) {
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, oldPassword, newPassword })
      });
      const data = await response.json();
      if (data && data.success) {
        try {
          const storedUser = localStorage.getItem('currentUser_pro');
          const storedSession = localStorage.getItem('session_pro');
          if (storedUser && storedSession) {
            const u = JSON.parse(storedUser);
            const s = JSON.parse(storedSession);
            await OfflineAuth.saveOfflineAuth(
              u.username || 'admin',
              newPassword,
              'admin',
              tenantId,
              s,
              u,
              s
            );
          }
        } catch (e) {
          console.warn('[OfflineAuth] Falha ao atualizar credenciais offline após troca de senha:', e);
        }
      }
      return data;
    } catch (err) {
      return { success: false, message: "Erro ao conectar com o servidor." };
    }
  }

  // Altera a senha do Super Admin via API do servidor (seguro)
  static async changeSuperPassword(oldPassword: string, newPassword: string) {
    try {
      const response = await fetch('/api/auth/change-super-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await response.json();
      if (data && data.success) {
        try {
          const storedUser = localStorage.getItem('currentUser_pro');
          const storedSession = localStorage.getItem('session_pro');
          if (storedUser && storedSession) {
            const u = JSON.parse(storedUser);
            const s = JSON.parse(storedSession);
            await OfflineAuth.saveOfflineAuth(
              u.username || 'super',
              newPassword,
              'super',
              'super_tenant',
              s,
              u,
              s
            );
          }
        } catch (e) {
          console.warn('[OfflineAuth] Falha ao atualizar credenciais super offline após troca de senha:', e);
        }
      }
      return data;
    } catch (err) {
      return { success: false, message: "Erro ao conectar com o servidor." };
    }
  }

  // Verifica a senha do administrador via API do servidor (seguro) com fallback offline automático
  static async verifyAdminPassword(tenantId: string, passwordPlain: string) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return await OfflineAuth.verifyOfflineAdminPassword(tenantId, passwordPlain);
    }
    try {
      const response = await fetch('/api/auth/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, password: passwordPlain })
      });
      const data = await response.json();
      if (data && data.success) return data;
      // Se o servidor respondeu explicitamente que a senha está errada, retorna
      if (data && data.success === false && data.message !== "Erro ao conectar com o servidor.") {
        return data;
      }
      // Se falhou por servidor/conexão, tenta offline
      return await OfflineAuth.verifyOfflineAdminPassword(tenantId, passwordPlain);
    } catch (err) {
      return await OfflineAuth.verifyOfflineAdminPassword(tenantId, passwordPlain);
    }
  }

  // Busca todos os usuários vinculados a uma loja
  static async fetchUsers(tenantId: string) {
    if (!tenantId) return [];
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', tenantId)
        .neq('role', 'deleted')
        .order('role', { ascending: true });
      
      if (error) throw error;
      return (data || []).map(u => ({
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        photo: u.photo,
        password: u.password,
        specialty: u.specialty
      }));
    } catch (e) {
      return [];
    }
  }

  // Cria uma nova loja e seu usuário administrador via API do servidor (seguro)
  static async createTenant(tenantData: { 
    id: string; 
    storeName: string; 
    adminUsername: string; 
    adminPasswordPlain: string; 
    logoUrl: string | null; 
    phoneNumber: string; 
    customMonthlyPrice?: number;
    customQuarterlyPrice?: number;
    customYearlyPrice?: number;
    trialDays?: number;
  }) {
    try {
      const response = await fetch('/api/auth/register-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenantData)
      });
      return await response.json();
    } catch (e) {
      return { success: false, message: "Erro ao conectar com o servidor." };
    }
  }

  static async registerTenant(tenantData: {
    id: string; 
    storeName: string; 
    adminUsername: string; 
    adminPasswordPlain: string; 
    logoUrl?: string | null; 
    phoneNumber: string;
    customMonthlyPrice?: number;
    customQuarterlyPrice?: number;
    customYearlyPrice?: number;
    trialDays?: number;
  }) {
    return this.createTenant({ ...tenantData, logoUrl: tenantData.logoUrl || null });
  }

  // Atualiza a assinatura de uma loja para uma data específica
  static async setSubscriptionDate(tenantId: string, date: string, status: 'trial' | 'active' | 'expired' = 'active', planType?: 'monthly' | 'quarterly' | 'yearly') {
    try {
      const updateData: any = {
        subscription_status: status,
        subscription_expires_at: date,
        last_plan_type: planType
      };

      // Se o plano for definido manualmente, também aplica os limites padrão do plano
      if (planType) {
        const globalSettings = await this.getGlobalSettings();
        const planLimits = globalSettings[planType];
        
        if (planLimits) {
          updateData.max_users = planLimits.maxUsers;
          updateData.enabled_features = {
            osTab: true,
            customersTab: true,
            stockTab: true,
            salesTab: true,
            financeTab: true,
            profiles: true,
            xmlExportImport: true,
            hideFinancialReports: false
          };

          const { error: limitsError } = await supabase
            .from('tenant_limits')
            .upsert({ 
              tenant_id: tenantId, 
              max_os: planLimits.maxOS, 
              max_products: planLimits.maxProducts 
            }, { onConflict: 'tenant_id' });
          if (limitsError) throw limitsError;
        }
      }

      const { error } = await supabase
        .from('tenants')
        .update(updateData)
        .eq('id', tenantId);
      
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  // Atualiza a assinatura de uma loja
  static async updateSubscription(tenantId: string, months: number, planType: 'monthly' | 'quarterly' | 'yearly') {
    try {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + months);

      const globalSettings = await this.getGlobalSettings();
      const planLimits = globalSettings[planType];

      const updateData: any = {
        subscription_status: 'active',
        subscription_expires_at: expiresAt.toISOString(),
        last_plan_type: planType
      };

      if (planLimits) {
        updateData.max_users = planLimits.maxUsers;
        updateData.enabled_features = {
          osTab: true,
          customersTab: true,
          stockTab: true,
          salesTab: true,
          financeTab: true,
          profiles: true,
          xmlExportImport: true,
          hideFinancialReports: false
        };
        const { error: limitsError } = await supabase
          .from('tenant_limits')
          .upsert({ 
            tenant_id: tenantId, 
            max_os: planLimits.maxOS, 
            max_products: planLimits.maxProducts 
          }, { onConflict: 'tenant_id' });
        if (limitsError) throw limitsError;
      }

      const { error } = await supabase
        .from('tenants')
        .update(updateData)
        .eq('id', tenantId);
      
      if (error) throw error;
      return { success: true, expiresAt: expiresAt.toISOString() };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  // Remove uma loja do sistema com exclusão em cascata completa
  static async deleteTenant(tenantId: string) {
    if (!tenantId) return { success: false, message: 'ID da loja não informado.' };

    try {
      // 1. Tenta deletar primeiro através da rota segura do servidor Node
      try {
        const response = await fetch('/api/super/delete-tenant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId })
        });
        if (response.ok) {
          const resData = await response.json();
          if (resData.success) {
            return { success: true };
          }
          if (resData.message) {
            console.warn('[deleteTenant] Aviso da rota do servidor:', resData.message);
          }
        }
      } catch (apiErr) {
        console.warn('[deleteTenant] Servidor indisponível, executando cascata direta via Supabase:', apiErr);
      }

      // 2. Cascata direta ordenada no Supabase caso necessário:
      // A) Coleta IDs de usuários vinculados à loja
      const { data: tenantUsers } = await supabase
        .from('users')
        .select('id')
        .eq('tenant_id', tenantId);
      const userIds = (tenantUsers || []).map((u: any) => u.id).filter(Boolean);

      // B) Coleta IDs de funcionários vinculados à loja
      const { data: tenantEmployees } = await supabase
        .from('employees')
        .select('id')
        .eq('tenant_id', tenantId);
      const employeeIds = (tenantEmployees || []).map((e: any) => e.id).filter(Boolean);

      if (userIds.length > 0) {
        const { data: extraEmps } = await supabase
          .from('employees')
          .select('id')
          .in('user_id', userIds);
        if (extraEmps) {
          for (const e of extraEmps) {
            if (e.id && !employeeIds.includes(e.id)) {
              employeeIds.push(e.id);
            }
          }
        }
      }

      // C) Deleta regras de comissão, logs e metas (evita foreign key em employees)
      await supabase.from('commissions_log').delete().eq('tenant_id', tenantId);
      if (employeeIds.length > 0) {
        await supabase.from('commissions_log').delete().in('employee_id', employeeIds);
      }

      await supabase.from('goal_tiers').delete().eq('tenant_id', tenantId);
      if (employeeIds.length > 0) {
        await supabase.from('goal_tiers').delete().in('employee_id', employeeIds);
      }

      await supabase.from('commission_rules').delete().eq('tenant_id', tenantId);
      if (employeeIds.length > 0) {
        await supabase.from('commission_rules').delete().in('employee_id', employeeIds);
      }

      // D) Deleta employees (resolve o erro: "employees_user_id_fkey" on table "employees")
      await supabase.from('employees').delete().eq('tenant_id', tenantId);
      if (userIds.length > 0) {
        await supabase.from('employees').delete().in('user_id', userIds);
      }
      if (employeeIds.length > 0) {
        await supabase.from('employees').delete().in('id', employeeIds);
      }

      // E) Deleta sessões ativas
      await supabase.from('active_sessions').delete().eq('tenant_id', tenantId);
      if (userIds.length > 0) {
        await supabase.from('active_sessions').delete().in('user_id', userIds);
      }

      // F) Deleta dados operacionais da loja
      await supabase.from('service_orders').delete().eq('tenant_id', tenantId);
      await supabase.from('sales').delete().eq('tenant_id', tenantId);
      await supabase.from('products').delete().eq('tenant_id', tenantId);
      await supabase.from('transactions').delete().eq('tenant_id', tenantId);
      await supabase.from('customers').delete().eq('tenant_id', tenantId);
      await supabase.from('suppliers').delete().eq('tenant_id', tenantId);
      await supabase.from('cloud_data').delete().eq('tenant_id', tenantId);
      await supabase.from('tenant_limits').delete().eq('tenant_id', tenantId);

      // G) Deleta usuários da loja (agora sem violar a foreign key de employees)
      await supabase.from('users').delete().eq('tenant_id', tenantId);
      if (userIds.length > 0) {
        await supabase.from('users').delete().in('id', userIds);
      }

      // H) Deleta a loja na tabela tenants
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenantId);
      
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      console.error('[deleteTenant] Erro ao excluir loja:', e);
      return { success: false, message: e.message || 'Erro ao excluir loja.' };
    }
  }

  // Salva ou atualiza dados de um usuário via API do servidor (seguro)
  static async upsertUser(tenantId: string, storeName: string, user: any) {
    try {
      const response = await fetch('/api/auth/upsert-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, storeName, user })
      });
      return await response.json();
    } catch (e) {
      return { success: false, message: "Erro ao conectar com o servidor." };
    }
  }

  // Lista todas as lojas cadastradas
  static async getTenants() {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*, tenant_limits(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      const tenantsList = data || [];
      // Garante que qualquer loja em plano de teste tenha a data de expiração de 7 dias calculada e salva
      for (const t of tenantsList) {
        if (t.subscription_status === 'trial' && !t.subscription_expires_at) {
          const created = t.created_at ? new Date(t.created_at) : new Date();
          const trialExp = new Date(created);
          trialExp.setDate(trialExp.getDate() + 7);
          trialExp.setHours(23, 59, 59, 999);
          t.subscription_expires_at = trialExp.toISOString();
          try {
            await supabase.from('tenants').update({ subscription_expires_at: t.subscription_expires_at }).eq('id', t.id);
          } catch (_) {}
        }
      }

      return tenantsList;
    } catch (e) {
      return [];
    }
  }

  // Busca uma loja pelo ID
  static async getTenantById(tenantId: string) {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*, tenant_limits(*), users(*)')
        .eq('id', tenantId)
        .maybeSingle();
      
      if (error) {
        logSupabaseNotice("Aviso ao buscar loja por ID", error);
        return null;
      }
      return data || null;
    } catch (e: any) {
      logSupabaseNotice("Conexão ao buscar loja por ID", e);
      return null;
    }
  }

  // Remove uma O.S. pelo ID (Soft Delete)
  static async deleteOS(osId: string) {
    try {
      const { error } = await supabase
        .from('service_orders')
        .update({ is_deleted: true })
        .eq('id', osId);
      if (error) logSupabaseNotice("Aviso ao deletar OS", error);
      return { success: !error };
    } catch (e) { return { success: false }; }
  }

  // --- MAPEADORES DE LINHAS SQL PARA ENTIDADES DO APP (ZERO EGRESS SYNC) ---
  static mapOrderFromRow(d: any) {
    if (!d) return null;
    let diagnosticTests: any = undefined;
    let cleanChecklist: string[] = [];
    if (Array.isArray(d.checklist)) {
      for (const item of d.checklist) {
        if (typeof item === 'string' && item.startsWith('__DIAG_JSON__:')) {
          try {
            diagnosticTests = JSON.parse(item.substring(14));
          } catch (e) {}
        } else {
          cleanChecklist.push(item);
        }
      }
    }

    return {
      id: d.id,
      customerName: d.customer_name,
      phoneNumber: d.phone_number,
      address: d.address,
      deviceBrand: d.device_brand,
      deviceModel: d.device_model,
      defect: d.defect,
      repairDetails: d.repair_details || '', 
      partsCost: Number(d.parts_cost || 0),
      serviceCost: Number(d.service_cost || 0),
      total: Number(d.total || 0),
      status: d.status,
      photos: d.photos || [],
      finishedPhotos: d.finished_photos || [], 
      date: d.created_at,
      entryDate: d.entry_date || '',
      exitDate: d.exit_date || '',
      isDeleted: d.is_deleted || false,
      signature: d.signature || '',
      checklist: cleanChecklist,
      diagnosticTests: diagnosticTests,
      partSupplierId: d.part_supplier_id || '',
      partSupplierWarranty: d.part_supplier_warranty || '',
      customerId: d.customer_id || '',
      trackingToken: d.tracking_token || '',
      publicNotes: d.public_notes || '',
      isTrackingEnabled: d.is_tracking_enabled !== false
    };
  }

  static mapProductFromRow(d: any, extraFiscal?: Record<string, any>) {
    if (!d) return null;
    let videoUrl = d.video_url || null;
    let additionalPhotos = d.additional_photos || [];
    
    const videoEntryIndex = additionalPhotos.findIndex((p: string) => typeof p === 'string' && p.startsWith('VIDEO:'));
    if (videoEntryIndex !== -1) {
      videoUrl = additionalPhotos[videoEntryIndex].replace('VIDEO:', '');
      additionalPhotos = additionalPhotos.filter((_: string, i: number) => i !== videoEntryIndex);
    }

    const fiscal = (extraFiscal && extraFiscal[d.id]) || d.fiscal_data || {};
    const hasExplicitFiscal = !!(fiscal.taxProfileId || fiscal.csosnCst);

    return {
      id: d.id,
      name: d.name,
      category: d.description?.startsWith('[CAT:') ? d.description.split(']')[0].replace('[CAT:', '') : undefined,
      barcode: d.barcode,
      photo: d.photo,
      costPrice: Number(d.cost_price || 0),
      salePrice: Number(d.sale_price || 0),
      quantity: Number(d.quantity || 0),
      description: d.description?.startsWith('[CAT:') ? d.description.split(']').slice(1).join(']').trim() : d.description,
      additionalPhotos: additionalPhotos,
      promotionalPrice: Number(d.promotional_price || 0),
      isPromotion: d.is_promotion || false,
      videoUrl: videoUrl,
      discount: Number(d.discount || 0),
      brand: d.brand || undefined,
      model: d.model || undefined,
      ncm: fiscal.ncm || d.ncm || undefined,
      cest: fiscal.cest || d.cest || undefined,
      cfop: (hasExplicitFiscal && fiscal.cfop) ? fiscal.cfop : (d.cfop || fiscal.cfop || undefined),
      // Dados Fiscais Mapeados e Preservados com Prioridade para Fiscal Real
      csosnCst: (hasExplicitFiscal && fiscal.csosnCst) ? fiscal.csosnCst : (d.csosn_cst || d.csosn || d.cst || fiscal.csosnCst || undefined),
      origin: (hasExplicitFiscal && fiscal.origin !== undefined) ? String(fiscal.origin) : (d.origin !== undefined && d.origin !== null ? String(d.origin) : (fiscal.origin !== undefined ? String(fiscal.origin) : undefined)),
      cstPis: (hasExplicitFiscal && fiscal.cstPis) ? fiscal.cstPis : (d.cst_pis || fiscal.cstPis || undefined),
      cstCofins: (hasExplicitFiscal && fiscal.cstCofins) ? fiscal.cstCofins : (d.cst_cofins || fiscal.cstCofins || undefined),
      crtCode: (hasExplicitFiscal && fiscal.crtCode) ? fiscal.crtCode : (d.crt_code || fiscal.crtCode || undefined),
      taxProfileId: fiscal.taxProfileId || d.tax_profile_id || undefined,
      taxProfileName: fiscal.taxProfileName || d.tax_profile_name || undefined,
      icmsAliquota: (hasExplicitFiscal && fiscal.icmsAliquota !== undefined) ? Number(fiscal.icmsAliquota) : (d.icms_rate !== undefined && d.icms_rate !== null ? Number(d.icms_rate) : (fiscal.icmsAliquota !== undefined ? Number(fiscal.icmsAliquota) : undefined)),
      pisAliquota: (hasExplicitFiscal && fiscal.pisAliquota !== undefined) ? Number(fiscal.pisAliquota) : (d.pis_rate !== undefined && d.pis_rate !== null ? Number(d.pis_rate) : (fiscal.pisAliquota !== undefined ? Number(fiscal.pisAliquota) : undefined)),
      cofinsAliquota: (hasExplicitFiscal && fiscal.cofinsAliquota !== undefined) ? Number(fiscal.cofinsAliquota) : (d.cofins_rate !== undefined && d.cofins_rate !== null ? Number(d.cofins_rate) : (fiscal.cofinsAliquota !== undefined ? Number(fiscal.cofinsAliquota) : undefined)),
      tipoOperacao: fiscal.tipoOperacao || d.tipo_operacao || undefined,
      destinoOperacao: fiscal.destinoOperacao || d.destino_operacao || undefined,
      tipoDestinatario: fiscal.tipoDestinatario || d.tipo_destinatario || undefined,
      modalidadeBc: fiscal.modalidadeBc || d.modalidade_bc || undefined,
      mvaPercentual: fiscal.mvaPercentual !== undefined ? Number(fiscal.mvaPercentual) : undefined,
      icmsStAliquotaDestino: fiscal.icmsStAliquotaDestino !== undefined ? Number(fiscal.icmsStAliquotaDestino) : undefined,
      modalidadeBcSt: fiscal.modalidadeBcSt || undefined,
      fcpAliquota: fiscal.fcpAliquota !== undefined ? Number(fiscal.fcpAliquota) : undefined,
      pisTipoCalculo: fiscal.pisTipoCalculo || undefined,
      cofinsTipoCalculo: fiscal.cofinsTipoCalculo || undefined,
      cstIpi: fiscal.cstIpi || undefined,
      cEnqIpi: fiscal.cEnqIpi || undefined,
      issExigibilidade: fiscal.issExigibilidade || undefined,
      issRegimeEspecial: fiscal.issRegimeEspecial || undefined,
      issAliquota: fiscal.issAliquota !== undefined ? Number(fiscal.issAliquota) : undefined,
      issRetencao: fiscal.issRetencao !== undefined ? Boolean(fiscal.issRetencao) : undefined,
      issResponsavelRetencao: fiscal.issResponsavelRetencao || undefined,
      itemLc116: fiscal.itemLc116 || undefined,
      codigoTributacaoNacional: fiscal.codigoTributacaoNacional || undefined
    };
  }

  static mapSaleFromRow(d: any) {
    if (!d) return null;
    return {
      id: d.id,
      productId: d.product_id,
      productName: d.product_name?.startsWith('[CAT:') ? d.product_name.split(']').slice(1).join(']').trim() : d.product_name,
      category: d.product_name?.startsWith('[CAT:') ? d.product_name.split(']')[0].replace('[CAT:', '') : undefined,
      date: d.date,
      quantity: d.quantity,
      originalPrice: Number(d.original_price || 0),
      discount: Number(d.discount || 0),
      finalPrice: Number(d.final_price || 0),
      costAtSale: Number(d.cost_at_sale || 0),
      costPerUnitAtSale: Number(d.cost_per_unit_at_sale || (d.quantity > 0 ? (d.cost_at_sale || 0) / d.quantity : 0)),
      salePricePerUnitAtSale: Number(d.sale_price_per_unit_at_sale || d.original_price || 0),
      paymentMethod: d.payment_method,
      sellerName: d.seller_name,
      sellerId: d.seller_id,
      transactionId: d.transaction_id,
      isDeleted: d.is_deleted || false
    };
  }

  static mapTransactionFromRow(d: any) {
    if (!d) return null;
    return {
      id: d.id,
      type: d.type,
      description: d.description,
      amount: Number(d.amount || 0),
      date: d.date,
      category: d.category,
      paymentMethod: d.payment_method,
      isDeleted: d.is_deleted || false,
      status: d.status || 'paid',
      dueDate: d.due_date,
      installments: d.installments,
      recurrence: d.recurrence
    };
  }

  static mapCustomerFromRow(d: any) {
    if (!d) return null;
    return {
      id: d.id,
      tenantId: d.tenant_id,
      name: d.name,
      phoneNumber: d.phone_number || d.phone || '',
      address: d.address || '',
      document: d.document || d.cpf || '',
      email: d.email || '',
      notes: d.notes || '',
      notesHistory: d.notes_history || [],
      createdAt: d.created_at || new Date().toISOString(),
      updatedAt: d.updated_at,
      isDeleted: d.is_deleted || false
    };
  }

  // Busca as Ordens de Serviço e mapeia as novas colunas entry_date e exit_date
  static async fetchOrders(tenantId: string): Promise<any[] | null> {
    if (!tenantId) return [];
    try {
      const { data, error } = await supabase
        .from('service_orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (error) {
        logSupabaseNotice("Aviso ao buscar ordens", error);
        return null;
      }
      
      return (data || []).map(d => this.mapOrderFromRow(d)).filter(Boolean);
    } catch (e: any) { 
      logSupabaseNotice("Conexão ao buscar ordens", e);
      return null; 
    }
  }

  // Busca catálogo público (apenas produtos em estoque e configurações da loja)
  static async getTenantIdBySlug(slug: string) {
    try {
      const { data, error } = await supabase
        .from('cloud_data')
        .select('tenant_id')
        .eq('store_key', 'settings')
        .eq('data_json->>catalogSlug', slug)
        .maybeSingle();
        
      if (error) {
        logSupabaseNotice("Aviso ao buscar loja pelo link", error);
        return null;
      }
      return data?.tenant_id || null;
    } catch (e: any) {
      logSupabaseNotice("Conexão ao buscar loja pelo link", e);
      return null;
    }
  }

  static async getPublicCatalog(tenantId: string) {
    try {
      const [productsData, settingsData] = await Promise.all([
        supabase.from('products').select('*').eq('tenant_id', tenantId).gt('quantity', 0).order('id', { ascending: false }),
        supabase.from('cloud_data').select('data_json').eq('tenant_id', tenantId).eq('store_key', 'settings').maybeSingle()
      ]);

      const products = (productsData.data || []).map(d => {
        let videoUrl = d.video_url || null;
        let additionalPhotos = d.additional_photos || [];
        
        const videoEntryIndex = additionalPhotos.findIndex((p: string) => p.startsWith('VIDEO:'));
        if (videoEntryIndex !== -1) {
          videoUrl = additionalPhotos[videoEntryIndex].replace('VIDEO:', '');
          additionalPhotos = additionalPhotos.filter((_: string, i: number) => i !== videoEntryIndex);
        }

        return {
          id: d.id,
          name: d.name,
          category: d.description?.startsWith('[CAT:') ? d.description.split(']')[0].replace('[CAT:', '') : undefined,
          barcode: d.barcode,
          photo: d.photo,
          costPrice: Number(d.cost_price || 0),
          salePrice: Number(d.sale_price || 0),
          quantity: Number(d.quantity || 0),
          description: d.description?.startsWith('[CAT:') ? d.description.split(']').slice(1).join(']').trim() : d.description,
          additionalPhotos: additionalPhotos,
          promotionalPrice: Number(d.promotional_price || 0),
          isPromotion: d.is_promotion || false,
          videoUrl: videoUrl
        };
      });

      const settings = settingsData.data?.data_json || null;

      return { products, settings };
    } catch (e: any) {
      logSupabaseNotice("Conexão ao buscar catálogo público", e);
      return null;
    }
  }

  // Busca produtos em estoque
  static async fetchProducts(tenantId: string): Promise<any[] | null> {
    if (!tenantId) return [];
    try {
      const [prodRes, fiscalRes] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('id', { ascending: false }),
        supabase
          .from('cloud_data')
          .select('data_json')
          .eq('tenant_id', tenantId)
          .eq('store_key', 'products_fiscal_data')
          .maybeSingle()
      ]);
      
      if (prodRes.error) {
        logSupabaseNotice("Aviso ao buscar produtos do Supabase", prodRes.error);
        return null;
      }
      
      let fiscalMap: Record<string, any> = {};
      if (fiscalRes.data?.data_json && typeof fiscalRes.data.data_json === 'object') {
        fiscalMap = fiscalRes.data.data_json;
      } else {
        try {
          const cached = localStorage.getItem(`products_fiscal_cache_${tenantId}`);
          if (cached) fiscalMap = JSON.parse(cached);
        } catch {}
      }

      // Se existir perfil padrão na loja, usa como preenchimento garantido
      let defaultTaxProf: any = null;
      try {
        const storedProfiles = localStorage.getItem(`tax_profiles_${tenantId}`);
        if (storedProfiles) {
          const parsed = JSON.parse(storedProfiles);
          if (Array.isArray(parsed)) {
            defaultTaxProf = parsed.find((p: any) => p.isDefault) || parsed[0];
          }
        }
      } catch {}

      return (prodRes.data || []).map(d => {
        const mapped = this.mapProductFromRow(d, fiscalMap);
        if (!mapped) return null;
        if (defaultTaxProf) {
          // Se o produto não tiver perfil específico ou se ele estiver marcado com o perfil padrão da loja
          if (!mapped.taxProfileId || mapped.taxProfileId === defaultTaxProf.id) {
            mapped.taxProfileId = defaultTaxProf.id;
            mapped.taxProfileName = defaultTaxProf.name;
            mapped.csosnCst = mapped.csosnCst || defaultTaxProf.csosnCst;
            mapped.origin = mapped.origin || defaultTaxProf.origin || '0';
            mapped.cstPis = mapped.cstPis || defaultTaxProf.cstPis || '07';
            mapped.cstCofins = mapped.cstCofins || defaultTaxProf.cstCofins || '07';
            mapped.crtCode = mapped.crtCode || defaultTaxProf.crtCode || '4';
            mapped.cfop = mapped.cfop || defaultTaxProf.defaultCfopInternal || '5102';
            mapped.icmsAliquota = mapped.icmsAliquota !== undefined ? mapped.icmsAliquota : (defaultTaxProf.icmsAliquota || 0);
            mapped.pisAliquota = mapped.pisAliquota !== undefined ? mapped.pisAliquota : (defaultTaxProf.pisAliquota || 0);
            mapped.cofinsAliquota = mapped.cofinsAliquota !== undefined ? mapped.cofinsAliquota : (defaultTaxProf.cofinsAliquota || 0);
          }
        }
        return mapped;
      }).filter(Boolean);
    } catch (e: any) { 
      logSupabaseNotice("Conexão ao buscar produtos", e);
      return null; 
    }
  }

  // Busca histórico de vendas
  static async fetchSales(tenantId: string): Promise<any[] | null> {
    if (!tenantId) return [];
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false });
      
      if (error) {
        logSupabaseNotice("Aviso ao buscar vendas", error);
        return null;
      }
      
      return (data || []).map(d => this.mapSaleFromRow(d)).filter(Boolean);
    } catch (e: any) {
      logSupabaseNotice("Conexão ao buscar vendas", e);
      return null;
    }
  }

  // Busca transações manuais (entradas e saídas)
  static async fetchTransactions(tenantId: string): Promise<any[] | null> {
    if (!tenantId) return [];
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false });
      
      if (error) {
        logSupabaseNotice("Aviso ao buscar transações", error);
        return null;
      }
      
      return (data || []).map(d => this.mapTransactionFromRow(d)).filter(Boolean);
    } catch (e: any) {
      logSupabaseNotice("Conexão ao buscar transações", e);
      return null;
    }
  }

  // Garante que o tenantId existe na tabela tenants antes de inserir dados vinculados por foreign key
  static async ensureTenant(tenantId: string) {
    if (!tenantId || tenantId === 'undefined' || tenantId === 'null') return;
    try {
      const { data } = await supabase.from('tenants').select('id, subscription_status, subscription_expires_at, created_at').eq('id', tenantId).maybeSingle();
      if (!data) {
        // Lojas criadas em plano de teste devem ter data para expirar de 7 dias
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        expiresAt.setHours(23, 59, 59, 999);

        // Tenta criar primeiro com store_name (padrão do sistema)
        const res = await supabase.from('tenants').upsert([{
          id: tenantId,
          store_name: 'Minha Loja',
          created_at: new Date().toISOString(),
          subscription_status: 'trial',
          subscription_expires_at: expiresAt.toISOString(),
          custom_monthly_price: 79.90
        }], { onConflict: 'id' });

        if (res.error) {
          // Se falhar, tenta com a coluna alternativa 'name'
          await supabase.from('tenants').upsert([{
            id: tenantId,
            name: 'Minha Loja',
            created_at: new Date().toISOString(),
            subscription_status: 'trial',
            subscription_expires_at: expiresAt.toISOString(),
            custom_monthly_price: 79.90
          }], { onConflict: 'id' });
        }
      } else if (data.subscription_status === 'trial' && !data.subscription_expires_at) {
        // Se a loja existe mas não tem data para expirar definida, garante 7 dias
        const created = data.created_at ? new Date(data.created_at) : new Date();
        const trialExp = new Date(created);
        trialExp.setDate(trialExp.getDate() + 7);
        trialExp.setHours(23, 59, 59, 999);
        await supabase.from('tenants').update({ subscription_expires_at: trialExp.toISOString() }).eq('id', tenantId);
      }
    } catch (e) {
      console.warn('[ensureTenant] Erro ao assegurar registro do tenant:', e);
    }
  }

  // Salva Ordens de Serviço no Banco de Dados
  static async upsertOrders(tenantId: string, orders: any[]) {
    if (!tenantId || !orders.length) return { success: true };
    await this.ensureTenant(tenantId);
    try {
      const payload = orders.map(os => {
        let checklistArr = Array.isArray(os.checklist) ? [...os.checklist] : [];
        if (os.diagnosticTests) {
          checklistArr = checklistArr.filter((item: string) => typeof item === 'string' && !item.startsWith('__DIAG_JSON__:'));
          checklistArr.push(`__DIAG_JSON__:${JSON.stringify(os.diagnosticTests)}`);
        }

        return {
          id: os.id,
          tenant_id: tenantId,
          customer_name: os.customerName,
          phone_number: os.phoneNumber,
          address: os.address,
          device_brand: os.deviceBrand,
          device_model: os.deviceModel,
          defect: os.defect,
          repair_details: os.repairDetails, 
          parts_cost: os.partsCost,
          service_cost: os.serviceCost,
          total: os.total,
          status: os.status,
          photos: os.photos,
          finished_photos: os.finishedPhotos || [], 
          created_at: os.date || new Date().toISOString(),
          // ENVIO DAS NOVAS DATAS PARA O SQL
          entry_date: os.entryDate,
          exit_date: os.exitDate,
          is_deleted: os.isDeleted || false,
          signature: os.signature || '',
          checklist: checklistArr,
          part_supplier_id: os.partSupplierId || '',
          part_supplier_warranty: os.partSupplierWarranty || '',
          customer_id: os.customerId || null,
          tracking_token: os.trackingToken || null,
          public_notes: os.publicNotes || null,
          is_tracking_enabled: os.isTrackingEnabled !== false
        };
      });
      const { error } = await supabase.from('service_orders').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      return { success: true };
    } catch (e: any) { 
      logSupabaseNotice("Erro ao salvar ordens no Supabase", e);
      return { success: false }; 
    }
  }

  // Salva produtos no Banco de Dados com persistência fiscal garantida
  static async upsertProducts(tenantId: string, products: any[]) {
    if (!tenantId || !products.length) return { success: true };
    await this.ensureTenant(tenantId);
    try {
      // 0. Cache síncrono local imediato para resiliência offline e recarregamento sem perdas
      let currentMap: Record<string, any> = {};
      try {
        const cached = localStorage.getItem(`products_fiscal_cache_${tenantId}`);
        if (cached) currentMap = JSON.parse(cached);
      } catch {}

      for (const p of products) {
        currentMap[p.id] = {
          taxProfileId: p.taxProfileId,
          taxProfileName: p.taxProfileName,
          csosnCst: p.csosnCst,
          origin: p.origin,
          cstPis: p.cstPis,
          cstCofins: p.cstCofins,
          crtCode: p.crtCode,
          icmsAliquota: p.icmsAliquota,
          pisAliquota: p.pisAliquota,
          cofinsAliquota: p.cofinsAliquota,
          tipoOperacao: p.tipoOperacao,
          destinoOperacao: p.destinoOperacao,
          tipoDestinatario: p.tipoDestinatario,
          modalidadeBc: p.modalidadeBc,
          mvaPercentual: p.mvaPercentual,
          icmsStAliquotaDestino: p.icmsStAliquotaDestino,
          modalidadeBcSt: p.modalidadeBcSt,
          fcpAliquota: p.fcpAliquota,
          pisTipoCalculo: p.pisTipoCalculo,
          cofinsTipoCalculo: p.cofinsTipoCalculo,
          cstIpi: p.cstIpi,
          cEnqIpi: p.cEnqIpi,
          issExigibilidade: p.issExigibilidade,
          issRegimeEspecial: p.issRegimeEspecial,
          issAliquota: p.issAliquota,
          issRetencao: p.issRetencao,
          issResponsavelRetencao: p.issResponsavelRetencao,
          itemLc116: p.itemLc116,
          codigoTributacaoNacional: p.codigoTributacaoNacional,
          cfop: p.cfop,
          ncm: p.ncm,
          cest: p.cest
        };
      }

      try {
        localStorage.setItem(`products_fiscal_cache_${tenantId}`, JSON.stringify(currentMap));
      } catch {}

      // 1. Grava no cloud_data (store_key: 'products_fiscal_data') como garantia total e imediata
      try {
        const { data: cloudFiscal } = await supabase
          .from('cloud_data')
          .select('data_json')
          .eq('tenant_id', tenantId)
          .eq('store_key', 'products_fiscal_data')
          .maybeSingle();

        if (cloudFiscal?.data_json && typeof cloudFiscal.data_json === 'object') {
          currentMap = { ...cloudFiscal.data_json, ...currentMap };
        }

        await supabase.from('cloud_data').upsert({
          tenant_id: tenantId,
          store_key: 'products_fiscal_data',
          data_json: currentMap,
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id,store_key' });
      } catch (fErr) {
        console.warn('Aviso ao sincronizar backup fiscal em cloud_data:', fErr);
      }

      // 2. Prepara basePayload incluindo colunas fiscais básicas padrão
      const basePayload = products.map(p => {
        let additionalPhotos = p.additionalPhotos || [];
        additionalPhotos = additionalPhotos.filter((photo: string) => typeof photo === 'string' && !photo.startsWith('VIDEO:'));
        
        if (p.videoUrl) {
          additionalPhotos.push(`VIDEO:${p.videoUrl}`);
        }

        return {
          id: p.id,
          tenant_id: tenantId,
          name: p.name,
          barcode: p.barcode,
          photo: p.photo,
          cost_price: p.costPrice,
          sale_price: p.salePrice,
          quantity: p.quantity,
          description: p.category ? `[CAT:${p.category}] ${p.description || ''}` : p.description,
          additional_photos: additionalPhotos,
          promotional_price: p.promotionalPrice || 0,
          is_promotion: p.isPromotion || false,
          discount: p.discount || 0,
          brand: p.brand || null,
          model: p.model || null,
          ncm: p.ncm || null,
          cest: p.cest || null,
          cfop: p.cfop || '5102',
          origin: p.origin !== undefined && p.origin !== null ? (isNaN(Number(p.origin)) ? 0 : Number(p.origin)) : 0,
          csosn: p.csosnCst || null,
          csosn_cst: p.csosnCst || null,
          cst: p.csosnCst || null,
          icms_rate: p.icmsAliquota || 0,
          pis_rate: p.pisAliquota || 0,
          cofins_rate: p.cofinsAliquota || 0
        };
      });

      // Nível 1: payload completo com todas as colunas fiscais avançadas + fiscal_data JSONB
      const fullFiscalPayload = basePayload.map((base, idx) => {
        const p = products[idx];
        return {
          ...base,
          cst_pis: p.cstPis || null,
          cst_cofins: p.cstCofins || null,
          crt_code: p.crtCode || null,
          tax_profile_id: p.taxProfileId || null,
          tax_profile_name: p.taxProfileName || null,
          fiscal_data: currentMap[p.id] || null
        };
      });

      const fullRes = await supabase.from('products').upsert(fullFiscalPayload, { onConflict: 'id' });
      if (fullRes.error) {
        // Nível 2: colunas fiscais básicas padrão
        const standardRes = await supabase.from('products').upsert(basePayload, { onConflict: 'id' });
        if (standardRes.error) {
          // Nível 3: campos mínimos legados caso as colunas fiscais não existam ainda
          const minimalPayload = basePayload.map(b => {
            const { csosn, csosn_cst, cst, origin, icms_rate, pis_rate, cofins_rate, ...minimal } = b;
            return minimal;
          });
          const minimalRes = await supabase.from('products').upsert(minimalPayload, { onConflict: 'id' });
          if (minimalRes.error) throw minimalRes.error;
        }
      }

      return { success: true };
    } catch (e: any) { 
      logSupabaseNotice("Erro ao salvar produtos no Supabase", e);
      return { success: false }; 
    }
  }

  // Salva vendas no Banco de Dados
  static async upsertSales(tenantId: string, sales: any[]) {
    if (!tenantId || !sales.length) return { success: true };
    await this.ensureTenant(tenantId);
    try {
      const buildPayload = (sanitizeSeller = false, sanitizeProduct = false) => {
        return sales.map(s => {
          let sellerId = s.sellerId;
          // Se for string vazia ou IDs fictícios, neutraliza
          if (!sellerId || sellerId === 'admin' || sellerId === 'sistema') {
            sellerId = null;
          }
          if (sanitizeSeller) {
            sellerId = null;
          }

          let productId = s.productId;
          if (sanitizeProduct || !productId) {
            productId = null;
          }

          return {
            id: s.id,
            tenant_id: tenantId,
            product_id: productId,
            product_name: s.category ? `[CAT:${s.category}] ${s.productName}` : s.productName,
            date: s.date,
            quantity: s.quantity,
            original_price: s.originalPrice,
            discount: s.discount,
            final_price: s.finalPrice,
            cost_at_sale: s.costAtSale,
            payment_method: s.paymentMethod,
            seller_name: s.sellerName,
            seller_id: sellerId,
            transaction_id: s.transactionId,
            is_deleted: s.isDeleted || false
          };
        });
      };

      let payload = buildPayload(false, false);
      const { error } = await supabase.from('sales').upsert(payload, { onConflict: 'id' });
      
      if (error) {
        const isFkeyError = error.code === '23503' || 
          error.message?.includes('foreign key constraint') || 
          error.message?.includes('sales_seller_id_fkey') || 
          error.message?.includes('violates foreign key');

        if (isFkeyError) {
          console.warn('[Supabase] Chave estrangeira não correspondente detectada em vendas (sales_seller_id_fkey). Reenviando com seller_id nulo para preservar dados e liberar fila offline...');
          payload = buildPayload(true, false);
          const retryRes = await supabase.from('sales').upsert(payload, { onConflict: 'id' });
          if (!retryRes.error) {
            return { success: true };
          }

          // Se falhar por causa de product_id fkey
          if (retryRes.error.code === '23503' || retryRes.error.message?.includes('foreign key')) {
            payload = buildPayload(true, true);
            const retryRes2 = await supabase.from('sales').upsert(payload, { onConflict: 'id' });
            if (!retryRes2.error) return { success: true };
            throw retryRes2.error;
          }
          throw retryRes.error;
        }
        throw error;
      }
      return { success: true };
    } catch (e: any) {
      logSupabaseNotice("Erro ao salvar vendas no Supabase", e);
      return { success: false };
    }
  }

  // Salva transações no Banco de Dados
  static async upsertTransactions(tenantId: string, transactions: any[]) {
    if (!tenantId || !transactions.length) return { success: true };
    await this.ensureTenant(tenantId);
    try {
      const payload = transactions.map(t => ({
        id: t.id,
        tenant_id: tenantId,
        type: t.type,
        description: t.description,
        amount: t.amount,
        date: t.date,
        category: t.category,
        payment_method: t.paymentMethod,
        is_deleted: t.isDeleted || false,
        status: t.status,
        due_date: t.dueDate,
        installments: t.installments,
        recurrence: t.recurrence
      }));
      const { error } = await supabase.from('transactions').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      logSupabaseNotice("Erro ao salvar transações no Supabase", e);
      return { success: false };
    }
  }

  // Sincroniza configurações globais
  static async syncPush(tenantId: string, storeKey: string, data: any) {
    if (!tenantId) return { success: false };
    try {
      let finalData = data;
      if (storeKey === 'settings') {
        const { users, ...cleanSettings } = data;
        finalData = cleanSettings;
      }

      const { error } = await supabase
        .from('cloud_data')
        .upsert({ 
          tenant_id: tenantId, 
          store_key: storeKey, 
          data_json: finalData, 
          updated_at: new Date().toISOString() 
        }, { onConflict: 'tenant_id,store_key' });
      return { success: !error };
    } catch (e) { return { success: false }; }
  }

  // Recupera configurações sincronizadas
  static async syncPull(tenantId: string, storeKey: string) {
    if (!tenantId) return null;
    try {
      const { data, error } = await supabase
        .from('cloud_data')
        .select('data_json')
        .eq('tenant_id', tenantId)
        .eq('store_key', storeKey)
        .maybeSingle();
      return data ? data.data_json : null;
    } catch (e) { return null; }
  }

  // Remove um produto
  static async deleteProduct(id: string) {
    try {
      const { error, status } = await supabase.from('products').delete().eq('id', id);
      return { success: !error };
    } catch (e) { return { success: false }; }
  }

  // Cancela uma venda e remove do banco (Soft Delete)
  static async deleteSale(id: string) {
    try {
      const { error, status } = await supabase
        .from('sales')
        .update({ is_deleted: true })
        .eq('id', id);
      if (error) return { success: false, message: error.message };
      return { success: status >= 200 && status < 300 };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  // Remove uma transação (Soft Delete)
  static async deleteTransaction(id: string) {
    try {
      const { error, status } = await supabase
        .from('transactions')
        .update({ is_deleted: true })
        .eq('id', id);
      if (error) return { success: false, message: error.message };
      return { success: status >= 200 && status < 300 };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  // Remove um usuário colaborador
  static async deleteRemoteUser(id: string) {
    try {
      // Soft delete: apenas marca como deletado para preservar histórico de vendas/comissões
      await supabase
        .from('employees')
        .update({ status: 'deleted' })
        .eq('user_id', id);

      const { error } = await supabase
        .from('users')
        .update({ role: 'deleted' })
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      console.error("Erro Soft Delete User:", e);
      return { success: false, message: e.message };
    }
  }

  // Limpeza de dados antigos (baseado no tempo de retenção da loja)
  static async cleanupOldData(tenantId: string, retentionMonths: number = 6) {
    if (!tenantId) return { success: false };
    try {
      const limitDate = new Date();
      limitDate.setMonth(limitDate.getMonth() - retentionMonths);
      const dateLimitStr = limitDate.toISOString();

      // Deleta OS marcadas como excluídas há mais de X meses
      await supabase
        .from('service_orders')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('is_deleted', true)
        .lt('updated_at', dateLimitStr);

      // Deleta vendas marcadas como excluídas há mais de X meses
      await supabase
        .from('sales')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('is_deleted', true)
        .lt('updated_at', dateLimitStr);

      // Deleta transações marcadas como excluídas há mais de X meses
      await supabase
        .from('transactions')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('is_deleted', true)
        .lt('updated_at', dateLimitStr);

      return { success: true };
    } catch (e) { return { success: false }; }
  }

  // --- GESTÃO DE FUNCIONÁRIOS E COMISSÕES ---

  // Busca funcionários (integrado com usuários)
  static async fetchEmployees(tenantId: string) {
    if (!tenantId) return [];
    try {
      // 1. Busca usuários do sistema (auth/perfis) - ignora deletados
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', tenantId)
        .neq('role', 'deleted');

      if (usersError) throw usersError;

      // 2. Busca dados estendidos de funcionários (RH/Comissões) - ignora deletados
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('tenant_id', tenantId)
        .neq('status', 'deleted');

      if (empError) throw empError;

      // 3. Mescla os dados. Se um usuário não tiver registro em employees, cria um objeto temporário
      const mergedList = (users || []).map(u => {
        const emp = employees?.find(e => e.user_id === u.id || e.email === u.username); // Tenta vincular por ID ou email/username
        
        // Se não existir registro em employees, vamos criar um "virtual" para exibição
        // O ideal seria criar no banco, mas vamos deixar o usuário salvar para persistir
        return {
          id: emp?.id || u.id, // Usa ID do employee se existir, senão do user (mas cuidado ao salvar)
          tenantId: tenantId,
          userId: u.id, // Referência ao usuário original
          name: u.name, // Nome vem do usuário (fonte da verdade)
          email: u.username,
          phone: emp?.phone,
          role: emp?.role || (u.role === 'admin' ? 'administrador' : (u.specialty === 'Técnico' ? 'tecnico' : 'vendedor')),
          status: emp?.status || 'active',
          admissionDate: emp?.admission_date || new Date().toISOString().split('T')[0],
          photoUrl: u.photo || emp?.photo_url,
          salaryBase: Number(emp?.salary_base || 0),
          commissionType: emp?.commission_type || 'sales_percent',
          defaultCommissionPercent: Number(emp?.default_commission_percent || 0),
          serviceCommissionPercent: Number(emp?.service_commission_percent || 0),
          goalMonthly: Number(emp?.goal_monthly || 0),
          permissions: emp?.permissions || { open_os: true, sell: true, view_finance: false, edit_price: false, cancel_sale: false }
        };
      });

      return mergedList.sort((a, b) => a.name.localeCompare(b.name));
    } catch (e) {
      console.error("Erro ao buscar funcionários:", e);
      return [];
    }
  }

  // Salva/Atualiza funcionário
  static async upsertEmployee(tenantId: string, employee: any) {
    try {
      // Prepara payload para tabela employees
      const payload: any = {
        tenant_id: tenantId,
        user_id: employee.userId, // Importante vincular
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        cpf: employee.cpf,
        rg: employee.rg,
        birth_date: employee.birthDate,
        address: employee.address, // Supabase JSONB
        pix_key: employee.pixKey,
        pix_key_type: employee.pixKeyType,
        role: employee.role,
        status: employee.status,
        admission_date: employee.admissionDate,
        photo_url: employee.photoUrl,
        salary_base: employee.salaryBase,
        commission_type: employee.commissionType,
        default_commission_percent: employee.defaultCommissionPercent,
        service_commission_percent: employee.serviceCommissionPercent,
        goal_monthly: employee.goalMonthly,
        permissions: employee.permissions
      };

      if (employee.id && employee.id.length > 10) { // Verifica se é um ID válido (UUID ou longo)
         // Se o ID for igual ao userId, significa que é um registro novo virtual, então deixamos o banco gerar o ID do employee
         if (employee.id !== employee.userId) {
            payload.id = employee.id;
         }
      } else if (employee.id) {
         // Se tiver ID curto, usa ele mesmo
         payload.id = employee.id;
      }

      const { data, error } = await supabase
        .from('employees')
        .upsert(payload) // Se tiver ID, atualiza. Se não, cria.
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  // Deleta / desativa um colaborador
  static async deleteEmployee(id: string) {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ status: 'deleted' })
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  // Busca ordens de serviço da loja para apuração de comissões de técnicos
  static async fetchServiceOrders(tenantId: string): Promise<ServiceOrder[]> {
    try {
      const { data, error } = await supabase
        .from('service_orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .neq('is_deleted', true);
      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.id,
        date: d.date || d.created_at,
        entryDate: d.entry_date || d.date,
        exitDate: d.exit_date,
        customerName: d.customer_name || 'Cliente',
        phoneNumber: d.phone_number || '',
        address: d.address || '',
        deviceBrand: d.device_brand || '',
        deviceModel: d.device_model || '',
        defect: d.defect || '',
        repairDetails: d.repair_details || '',
        partsCost: Number(d.parts_cost || 0),
        serviceCost: Number(d.service_cost || 0),
        total: Number(d.total || 0),
        status: d.status || 'Concluído',
        photos: d.photos || [],
        technicianId: d.technician_id,
        sellerId: d.seller_id,
        paymentMethod: d.payment_method,
        isDeleted: d.is_deleted
      }));
    } catch (e) {
      return [];
    }
  }

  // Busca Regras de Comissão
  static async fetchCommissionRules(tenantId: string) {
    try {
      const { data, error } = await supabase.from('commission_rules').select('*').eq('tenant_id', tenantId).order('priority', { ascending: false });
      if (error) throw error;
      return (data || []).map(d => ({
        id: d.id,
        tenantId: d.tenant_id,
        name: d.name,
        description: d.description,
        targetType: d.target_type,
        targetId: d.target_id,
        employeeId: d.employee_id,
        ruleType: d.rule_type,
        calculationBase: d.calculation_base,
        value: Number(d.value || 0),
        minAmount: Number(d.min_amount || 0),
        priority: Number(d.priority || 0),
        isActive: d.is_active,
        requiresGoalMet: d.requires_goal_met
      }));
    } catch (e) { return []; }
  }

  // Salva Regra de Comissão
  static async upsertCommissionRule(tenantId: string, rule: any) {
    try {
      const payload: any = {
        tenant_id: tenantId,
        name: rule.name,
        description: rule.description,
        target_type: rule.targetType,
        target_id: rule.targetId || null,
        employee_id: rule.employeeId || null,
        rule_type: rule.ruleType,
        calculation_base: rule.calculationBase || 'gross_sale',
        value: rule.value,
        min_amount: rule.minAmount || 0,
        priority: rule.priority,
        is_active: rule.isActive,
        requires_goal_met: rule.requiresGoalMet || false
      };
      
      if (rule.id) {
        payload.id = rule.id;
      }
      
      const { error } = await supabase.from('commission_rules').upsert(payload);
      if (error) throw error;
      return { success: true };
    } catch (e: any) { 
      console.error("Error upserting commission rule:", e);
      return { success: false, message: e.message }; 
    }
  }

  // Busca Metas (GoalTiers)
  static async fetchGoalTiers(tenantId: string) {
    try {
      const { data, error } = await supabase.from('goal_tiers').select('*').eq('tenant_id', tenantId).order('min_amount', { ascending: true });
      if (error) throw error;
      return (data || []).map(d => ({
        id: d.id,
        tenantId: d.tenant_id,
        employeeId: d.employee_id,
        name: d.name,
        minAmount: Number(d.min_amount || 0),
        bonusType: d.bonus_type,
        bonusValue: Number(d.bonus_value || 0),
        calculationBase: d.calculation_base
      }));
    } catch (e) { return []; }
  }

  // Salva Meta
  static async upsertGoalTier(tenantId: string, tier: any) {
    try {
      const payload: any = {
        tenant_id: tenantId,
        employee_id: tier.employeeId || null,
        name: tier.name,
        min_amount: tier.minAmount || 0,
        bonus_type: tier.bonusType,
        bonus_value: tier.bonusValue || 0,
        calculation_base: tier.calculationBase || 'gross_sale'
      };
      if (tier.id) payload.id = tier.id;
      const { error } = await supabase.from('goal_tiers').upsert(payload);
      if (error) throw error;
      return { success: true };
    } catch (e: any) { 
      console.error("Error upserting goal tier:", e);
      return { success: false, message: e.message }; 
    }
  }

  // Deleta Meta
  static async deleteGoalTier(tierId: string) {
    try {
      await supabase.from('goal_tiers').delete().eq('id', tierId);
      return { success: true };
    } catch (e) { return { success: false }; }
  }

  // Deleta Regra de Comissão
  static async deleteCommissionRule(ruleId: string) {
    try {
      await supabase.from('commission_rules').delete().eq('id', ruleId);
      return { success: true };
    } catch (e) { return { success: false }; }
  }

  // Busca Log de Comissões
  static async fetchCommissionLogs(tenantId: string, startDate?: Date, endDate?: Date) {
    try {
      let query = supabase.from('commissions_log').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
      
      if (startDate) query = query.gte('created_at', startDate.toISOString());
      if (endDate) query = query.lte('created_at', endDate.toISOString());

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(d => ({
        id: d.id,
        employeeId: d.employee_id,
        originType: d.origin_type,
        originId: d.origin_id,
        description: d.description,
        saleAmount: Number(d.sale_amount || 0),
        profitAmount: Number(d.profit_amount || 0),
        commissionAmount: Number(d.commission_amount || 0),
        status: d.status,
        paymentDate: d.payment_date,
        createdAt: d.created_at
      }));
    } catch (e) { return []; }
  }

  // Registra Comissão (Chamado ao finalizar venda/OS)
  static async logCommission(tenantId: string, log: any) {
    try {
      const { error } = await supabase.from('commissions_log').insert({
        tenant_id: tenantId,
        employee_id: log.employeeId,
        origin_type: log.originType,
        origin_id: log.originId,
        description: log.description,
        sale_amount: log.saleAmount,
        profit_amount: log.profitAmount,
        commission_amount: log.commissionAmount,
        status: log.status || 'pending',
        created_at: new Date().toISOString()
      });
      if (error) throw error;
      return { success: true };
    } catch (e) { return { success: false }; }
  }

  // Cancela Comissão
  static async cancelCommission(originId: string, originType: 'sale' | 'service_order') {
    try {
      const { error } = await supabase
        .from('commissions_log')
        .update({ status: 'cancelled' })
        .eq('origin_id', originId)
        .eq('origin_type', originType);
      if (error) throw error;
      return { success: true };
    } catch (e) { return { success: false }; }
  }

  // Calcula e registra comissão automaticamente usando regras inteligentes
  static async calculateAndLogCommission(tenantId: string, item: any, type: 'sale' | 'service_order', userId: string) {
    if (!tenantId || !userId) return { success: false, message: 'Dados incompletos' };
    try {
      // 1. Busca o funcionário vinculado ao usuário (por user_id, id, email ou nome)
      let employee: any = null;
      
      const { data: empById } = await supabase
        .from('employees')
        .select('*')
        .eq('tenant_id', tenantId)
        .or(`user_id.eq.${userId},id.eq.${userId},email.eq.${userId}`)
        .maybeSingle();

      employee = empById;

      if (!employee) {
        // Tenta buscar por nome do vendedor
        const { data: empByName } = await supabase
          .from('employees')
          .select('*')
          .eq('tenant_id', tenantId)
          .ilike('name', userId)
          .maybeSingle();
        employee = empByName;
      }

      // Se não encontrou em employees, verifica se existe na tabela users para criar o registro
      if (!employee) {
        const { data: userRec } = await supabase
          .from('users')
          .select('*')
          .eq('tenant_id', tenantId)
          .or(`id.eq.${userId},username.eq.${userId},name.eq.${userId}`)
          .maybeSingle();

        if (userRec) {
          const newEmpPayload = {
            tenant_id: tenantId,
            user_id: userRec.id,
            name: userRec.name || userRec.username,
            email: userRec.username,
            role: userRec.specialty === 'Técnico' ? 'tecnico' : 'vendedor',
            status: 'active',
            admission_date: new Date().toISOString().split('T')[0],
            salary_base: 0,
            commission_type: 'sales_percent',
            default_commission_percent: 5,
            service_commission_percent: 10,
            goal_monthly: 10000
          };

          const { data: createdEmp } = await supabase
            .from('employees')
            .insert([newEmpPayload])
            .select()
            .maybeSingle();

          employee = createdEmp || newEmpPayload;
        }
      }

      if (!employee) {
        // Cria um employee temporário para não perder o log
        employee = {
          id: userId,
          tenant_id: tenantId,
          name: item.sellerName || 'Vendedor',
          commission_type: 'sales_percent',
          default_commission_percent: 5,
          service_commission_percent: 10,
          goal_monthly: 10000
        };
      }

      // 2. Busca todas as regras ativas para este tenant
      const rules = await this.fetchCommissionRules(tenantId);
      const activeRules = rules.filter(r => r.isActive);

      // 2.1 Calcula vendas do mês para verificar se bateu a meta (se houver regras que dependam disso)
      let monthlySales = 0;
      const hasGoalDependentRules = activeRules.some(r => r.requiresGoalMet);
      if (hasGoalDependentRules || employee.goal_monthly > 0) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const { data: monthlyLogs } = await supabase
          .from('commissions_log')
          .select('sale_amount')
          .eq('employee_id', employee.id)
          .neq('status', 'cancelled')
          .gte('created_at', startOfMonth.toISOString());
        
        monthlySales = (monthlyLogs || []).reduce((acc, curr) => acc + curr.sale_amount, 0);
      }

      let saleAmount = 0;
      let profitAmount = 0;
      let description = '';

      if (type === 'sale') {
        saleAmount = item.finalPrice;
        const cost = item.costAtSale || 0;
        profitAmount = saleAmount - cost;
        description = `Venda: ${item.productName}`;
      } else {
        saleAmount = item.total;
        profitAmount = item.total - (item.partsCost || 0);
        description = `OS #${item.id} - ${item.deviceModel}`;
      }

      const isGoalMet = (monthlySales + saleAmount) >= (employee.goal_monthly || 0);

      let commissionAmount = 0;

      // 3. Tenta encontrar a regra mais específica (maior prioridade)
      // Ordem de prioridade: Produto/Serviço específico > Categoria > Global
      const applicableRules = activeRules.filter(rule => {
        // Filtra por funcionário se a regra for específica
        if (rule.employeeId && rule.employeeId !== employee.id) return false;
        
        // Filtra por valor mínimo da venda
        if (rule.minAmount && saleAmount < rule.minAmount) return false;

        // Filtra por meta batida
        if (rule.requiresGoalMet && !isGoalMet) return false;

        // Filtra por tipo de alvo
        if (type === 'sale') {
          if (rule.targetType === 'product' && rule.targetId === item.productId) return true;
          if (rule.targetType === 'category' && rule.targetId === item.category) return true;
          if (rule.targetType === 'global') return true;
        } else {
          if (rule.targetType === 'service') return true;
          if (rule.targetType === 'global') return true;
        }
        return false;
      }).sort((a, b) => b.priority - a.priority);

      if (applicableRules.length > 0) {
        const rule = applicableRules[0];
        const base = rule.calculationBase === 'net_profit' ? profitAmount : saleAmount;
        
        if (rule.ruleType === 'percent') {
          commissionAmount = base * (rule.value / 100);
        } else {
          commissionAmount = rule.value;
        }
      } else {
        // Fallback para comissão padrão do funcionário
        const base = employee.commission_type === 'profit_percent' ? profitAmount : saleAmount;
        const percent = type === 'sale' ? employee.default_commission_percent : (employee.service_commission_percent || employee.default_commission_percent);
        commissionAmount = base * (Number(percent) / 100);
      }

      // 4. Registra no log
      if (commissionAmount > 0) {
        await this.logCommission(tenantId, {
          employeeId: employee.id,
          originType: type,
          originId: item.id,
          description,
          saleAmount,
          profitAmount,
          commissionAmount,
          status: 'pending'
        });
      }

      // 5. Verifica Metas de Bônus (GoalTiers)
      const tiers = await this.fetchGoalTiers(tenantId);
      const applicableTiers = tiers.filter(t => {
        if (t.employeeId && t.employeeId !== employee.id) return false;
        const totalWithCurrent = monthlySales + saleAmount;
        const totalWithoutCurrent = monthlySales;
        // Verifica se esta venda fez o funcionário ultrapassar o limite da meta
        return totalWithCurrent >= t.minAmount && totalWithoutCurrent < t.minAmount;
      });

      for (const tier of applicableTiers) {
        let bonusAmount = 0;
        const base = tier.calculationBase === 'net_profit' ? profitAmount : saleAmount;
        
        if (tier.bonusType === 'percent') {
          bonusAmount = base * (tier.bonusValue / 100);
        } else {
          bonusAmount = tier.bonusValue;
        }

        if (bonusAmount > 0) {
          await this.logCommission(tenantId, {
            employeeId: employee.id,
            originType: 'bonus',
            originId: `${item.id}_bonus_${tier.id}`,
            description: `Bônus Atingido: ${tier.name}`,
            saleAmount: 0,
            profitAmount: 0,
            commissionAmount: bonusAmount,
            status: 'pending'
          });
        }
      }

      return { success: true };
    } catch (e: any) {
      console.error("Erro ao calcular comissão:", e);
      return { success: false, message: e.message };
    }
  }

  // Busca fornecedores do tenant
  static async fetchSuppliers(tenantId: string) {
    if (!tenantId) return [];

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });
      
      if (!error && data) {
        return data.map(d => ({
          id: d.id,
          tenantId: d.tenant_id,
          name: d.name,
          phone: d.phone || '',
          email: d.email || '',
          createdAt: d.created_at
        }));
      }
    } catch {
      // Ignora e tenta fallback via API abaixo
    }

    // Fallback via API do servidor (caso Supabase direto falhe ou bloqueio de rede)
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch(`/api/suppliers?tenantId=${encodeURIComponent(tenantId)}`);
        if (response.ok) {
          const apiData = await response.json();
          if (Array.isArray(apiData)) {
            return apiData.map(d => ({
              id: d.id,
              tenantId: d.tenant_id || d.tenantId,
              name: d.name,
              phone: d.phone || '',
              email: d.email || '',
              createdAt: d.created_at || d.createdAt
            }));
          }
        }
      } catch {
        // Fallback silencioso
      }
    }

    return [];
  }

  // Insere ou atualiza fornecedor
  static async upsertSupplier(tenantId: string, supplier: any) {
    if (!tenantId) return { success: false, message: 'ID da loja inválido' };

    try {
      const payload = {
        id: supplier.id || undefined,
        tenant_id: tenantId,
        name: supplier.name,
        phone: supplier.phone || '',
        email: supplier.email || '',
        created_at: supplier.createdAt || new Date().toISOString()
      };
      const { error } = await supabase.from('suppliers').upsert(payload, { onConflict: 'id' });
      if (!error) return { success: true };
    } catch {
      // Tenta fallback via API abaixo
    }

    if (typeof window !== 'undefined') {
      try {
        const response = await fetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, supplier })
        });
        if (response.ok) {
          return await response.json();
        }
      } catch {
        // Ignora
      }
    }

    return { success: true };
  }

  // Deleta fornecedor
  static async deleteSupplier(id: string) {
    if (!id) return { success: false, message: 'ID inválido' };

    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);
      if (!error) return { success: true };
    } catch {
      // Tenta fallback via API abaixo
    }

    if (typeof window !== 'undefined') {
      try {
        const response = await fetch(`/api/suppliers/${encodeURIComponent(id)}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          return await response.json();
        }
      } catch {
        // Ignora
      }
    }

    return { success: true };
  }

  // Busca clientes do tenant
  static async fetchCustomers(tenantId: string): Promise<Customer[]> {
    if (!tenantId) return [];
    try {
      // 1. Tenta buscar de cloud_data (preserva todos os dados, observações e histórico de notas)
      const cloudData = await this.syncPull(tenantId, 'customers');
      if (Array.isArray(cloudData) && cloudData.length > 0) {
        return cloudData.map(c => ({
          ...c,
          notesHistory: c.notesHistory || []
        }));
      }

      // 2. Tenta buscar da tabela customers caso exista
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });
      
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(d => ({
          id: d.id,
          tenantId: d.tenant_id,
          name: d.name,
          phoneNumber: d.phone_number || d.phone || '',
          address: d.address || '',
          document: d.document || d.cpf || '',
          email: d.email || '',
          notes: d.notes || '',
          notesHistory: d.notes_history || [],
          createdAt: d.created_at || new Date().toISOString(),
          updatedAt: d.updated_at,
          isDeleted: d.is_deleted || false
        }));
      }

      if (Array.isArray(cloudData)) {
        return cloudData;
      }
    } catch (e) {
      console.warn("fetchCustomers error:", e);
    }
    return [];
  }

  // Salva clientes do tenant
  static async upsertCustomers(tenantId: string, customers: Customer[]) {
    if (!tenantId || !customers.length) return { success: true };
    await this.ensureTenant(tenantId);
    try {
      // Salva de forma universal em cloud_data para total confiabilidade
      await this.syncPush(tenantId, 'customers', customers);

      // Tenta também sincronizar na tabela relacional customers se ela existir
      try {
        const payload = customers.map(c => ({
          id: c.id,
          tenant_id: tenantId,
          name: c.name,
          phone_number: c.phoneNumber,
          address: c.address || '',
          document: c.document || '',
          email: c.email || '',
          notes: c.notes || '',
          notes_history: c.notesHistory || [],
          created_at: c.createdAt || new Date().toISOString(),
          updated_at: c.updatedAt || new Date().toISOString(),
          is_deleted: c.isDeleted || false
        }));
        await supabase.from('customers').upsert(payload, { onConflict: 'id' });
      } catch {
        // Fallback garantido pelo cloud_data
      }

      return { success: true };
    } catch (e: any) {
      console.error("Erro ao salvar clientes:", e);
      return { success: false, message: e.message };
    }
  }

  // Deleta cliente (soft delete)
  static async deleteCustomer(tenantId: string, customerId: string) {
    if (!tenantId || !customerId) return { success: false };
    try {
      // Atualiza também na tabela relacional se existir
      try {
        await supabase
          .from('customers')
          .update({ is_deleted: true, updated_at: new Date().toISOString() })
          .eq('id', customerId);
      } catch {
        // Fallback
      }

      const customers = await this.fetchCustomers(tenantId);
      const updated = customers.filter(c => c.id !== customerId);
      await this.upsertCustomers(tenantId, updated);
      return { success: true };
    } catch (e) {
      return { success: false };
    }
  }

  // --- CRÉDITOS DE IA POR LOJA (LOJAS CLOUD AI) ---
  static async getAICredits(tenantId: string): Promise<number> {
    if (!tenantId) return 0;
    try {
      const { data, error } = await supabase
        .from('cloud_data')
        .select('data_json')
        .eq('tenant_id', tenantId)
        .eq('store_key', 'ai_credits')
        .maybeSingle();
      
      if (error) throw error;
      if (data?.data_json && typeof data.data_json.credits === 'number') {
        return Math.max(0, data.data_json.credits);
      }
      return 0;
    } catch (e) {
      return 0;
    }
  }

  static async addAICredits(tenantId: string, amount: number): Promise<{ success: boolean; credits: number }> {
    if (!tenantId || amount <= 0) return { success: false, credits: 0 };
    try {
      const current = await this.getAICredits(tenantId);
      const updatedCredits = current + amount;
      const { error } = await supabase
        .from('cloud_data')
        .upsert({
          tenant_id: tenantId,
          store_key: 'ai_credits',
          data_json: {
            credits: updatedCredits,
            last_recharge_amount: amount,
            last_recharged_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id,store_key' });

      if (error) throw error;
      return { success: true, credits: updatedCredits };
    } catch (e) {
      console.error('Erro ao adicionar créditos de IA:', e);
      return { success: false, credits: 0 };
    }
  }

  static async consumeAICredit(tenantId: string): Promise<{ success: boolean; remainingCredits: number }> {
    if (!tenantId) return { success: false, remainingCredits: 0 };
    try {
      const current = await this.getAICredits(tenantId);
      if (current <= 0) {
        return { success: false, remainingCredits: 0 };
      }
      const updatedCredits = Math.max(0, current - 1);
      await supabase
        .from('cloud_data')
        .upsert({
          tenant_id: tenantId,
          store_key: 'ai_credits',
          data_json: {
            credits: updatedCredits,
            last_used_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id,store_key' });

      return { success: true, remainingCredits: updatedCredits };
    } catch (e) {
      console.error('Erro ao consumir crédito de IA:', e);
      return { success: false, remainingCredits: 0 };
    }
  }
}

