
import { supabase } from './supabaseClient';

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
        trial: { maxUsers: 1000, maxOS: 1000, maxProducts: 1000 }
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

      return json;
    } catch (e) {
      return {
        monthly: { price: 49.90, maxUsers: 2, maxOS: 999, maxProducts: 999 },
        quarterly: { price: 129.90, maxUsers: 999, maxOS: 999, maxProducts: 999 },
        yearly: { price: 499.00, maxUsers: 999, maxOS: 999, maxProducts: 999 },
        trial: { maxUsers: 1000, maxOS: 1000, maxProducts: 1000 }
      };
    }
  }

  // Atualiza configurações globais do sistema
  static async updateGlobalSettings(plans: any) {
    try {
      const { error } = await supabase
        .from('cloud_data')
        .upsert({
          tenant_id: 'SYSTEM',
          store_key: 'global_plans',
          data_json: plans,
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id,store_key' });
      
      if (error) throw error;
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

  // Realiza o login do usuário verificando no banco SQL
  static async login(username: string, passwordPlain: string) {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = passwordPlain.trim();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanUser, // Supabase Auth usa 'email' como identificador, mesmo que seja um username
        password: cleanPass,
      });

      if (error) {
        console.error("Erro de autenticação Supabase:", error.message);
        return { success: false, message: "Usuário ou senha incorretos." };
      }

      if (!data.user) return { success: false, message: "Usuário não encontrado." };

      // Agora, buscamos os dados do usuário e do tenant na nossa tabela 'users'
      // usando o ID do usuário retornado pelo Supabase Auth.
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*, tenants(*, tenant_limits(*))')
        .eq('id', data.user.id)
        .maybeSingle();

      if (userError) throw userError;
      if (!userData) return { success: false, message: "Dados do usuário não encontrados no banco." };

      const tenant = userData.tenants;
      const limits = tenant?.tenant_limits;
      const expiresAt = tenant?.subscription_expires_at;
      const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;

      return { 
        success: true, 
        type: userData.role || 'admin', 
        tenant: userData.tenant_id ? { 
          id: userData.tenant_id, 
          username: userData.username,
          name: userData.name || userData.username,
          role: userData.role,
          subscriptionStatus: isExpired ? 'expired' : (tenant?.subscription_status || 'trial'),
          subscriptionExpiresAt: expiresAt, // Use a data de expiração do tenant
          customMonthlyPrice: tenant?.custom_monthly_price,
          customQuarterlyPrice: tenant?.custom_quarterly_price,
          customYearlyPrice: tenant?.custom_yearly_price,
          lastPlanType: tenant?.last_plan_type,
          enabledFeatures: tenant?.enabled_features || {
            osTab: true,
            stockTab: true,
            salesTab: true,
            financeTab: true,
            profiles: true,
            xmlExportImport: true
          },
          maxUsers: tenant?.max_users || 999,
          maxOS: limits?.max_os || 999,
          maxProducts: limits?.max_products || 999,
          printerSize: tenant?.printer_size || 58,
          retentionMonths: tenant?.retention_months || 6
        } : null 
      };
    } catch (err: any) {
      console.error("Erro no login:", err);
      return { success: false, message: "Erro de rede. Verifique sua conexão ou tente novamente." };
    }
  }

  // Verifica a senha do administrador para ações sensíveis
  static async verifyAdminPassword(tenantId: string, passwordPlain: string) {
    if (!tenantId) return { success: false, message: "ID da loja não encontrado." };
    const currentUser = await supabase.auth.getUser();
    if (!currentUser.data.user) return { success: false, message: "Nenhum usuário logado." };

    try {
      // Primeiro, tente fazer login com as credenciais fornecidas
      const { data, error } = await supabase.auth.signInWithPassword({
        email: currentUser.data.user.email || '', // Assumindo que o email do usuário logado é o username
        password: passwordPlain.trim(),
      });

      if (error) {
        console.error("Erro de autenticação para verificação de senha:", error.message);
        return { success: false, message: "Senha de administrador incorreta." };
      }

      if (!data.user) return { success: false, message: "Usuário não autenticado." };

      // Agora, verifique se o usuário autenticado é um administrador do tenant correto
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, tenant_id')
        .eq('id', data.user.id)
        .maybeSingle();

      if (userError) throw userError;
      if (!userData) return { success: false, message: "Dados do usuário não encontrados." };

      if (userData.role === 'admin' && userData.tenant_id === tenantId) {
        return { success: true };
      } else {
        return { success: false, message: "Permissão negada ou senha incorreta." };
      }
    } catch (err: any) {
      console.error("Erro na verificação de senha do administrador:", err);
      return { success: false, message: "Erro de comunicação com o banco de dados." };
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

  // Cria uma nova loja e seu usuário administrador
  static async createTenant(tenantData: { 
    id: string; 
    storeName: string; 
    adminUsername: string; 
    adminPasswordPlain: string; 
    logoUrl: string | null; 
    phoneNumber: string; 
  }) {
    try {
      const trialDays = 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + trialDays);

      const globalSettings = await this.getGlobalSettings();
      const trialLimits = globalSettings.trial || { maxUsers: 1000, maxOS: 1000, maxProducts: 1000 };

      // 1. Criar o usuário no Supabase Auth primeiro
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: tenantData.adminUsername.toLowerCase().trim(),
        password: tenantData.adminPasswordPlain.trim(),
      });

      if (authError) {
        console.error("Erro ao criar usuário no Supabase Auth:", authError.message);
        return { success: false, message: authError.message };
      }

      if (!authData.user) {
        return { success: false, message: "Usuário Auth não retornado." };
      }

      const userId = authData.user.id; // Usar o ID do usuário do Supabase Auth

      const { error: tError } = await supabase
        .from('tenants')
        .insert([{
          id: tenantData.id,
          store_name: tenantData.storeName,
          logo_url: tenantData.logoUrl,
          created_at: new Date().toISOString(),
          subscription_status: 'trial',
          subscription_expires_at: expiresAt.toISOString(),
          phone_number: tenantData.phoneNumber, // Adiciona o telefone
          enabled_features: {
            osTab: true,
            stockTab: true,
            salesTab: true,
            financeTab: true,
            profiles: true,
            xmlExportImport: true
          },
          max_users: trialLimits.maxUsers
        }]);
      if (tError) throw tError;

      const { error: limitsError } = await supabase
        .from('tenant_limits')
        .insert([{
          tenant_id: tenantData.id,
          max_os: trialLimits.maxOS,
          max_products: trialLimits.maxProducts
        }]);
      if (limitsError) throw limitsError;

      // 3. Inserir os dados do usuário na nossa tabela 'users' com o ID do Supabase Auth
      const { error: uError } = await supabase
        .from('users')
        .insert([{
          id: userId, // Usar o ID do usuário do Supabase Auth
          username: tenantData.adminUsername.toLowerCase().trim(),
          password: '', // Temporário: Define uma string vazia para satisfazer a restrição NOT NULL
          name: tenantData.storeName,
          role: 'admin',
          tenant_id: tenantData.id,
          store_name: tenantData.storeName,
          photo: tenantData.logoUrl // Opcional: define logo da loja como foto do admin
        }]);
      if (uError) throw uError;

      return { success: true };
    } catch (e: any) {
      console.error("Erro ao criar loja:", e.message);
      return { success: false, message: e.message };
    }
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
            stockTab: true,
            salesTab: true,
            financeTab: true,
            profiles: true,
            xmlExportImport: true
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
          stockTab: true,
          salesTab: true,
          financeTab: true,
          profiles: true,
          xmlExportImport: true
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

  // Remove uma loja do sistema
  static async deleteTenant(tenantId: string) {
    try {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenantId);
      
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  // Salva ou atualiza dados de um usuário
  static async upsertUser(tenantId: string, storeName: string, user: any) {
    if (!tenantId) return { success: false, message: "ID da Loja ausente." };
    try {
      const baseName = user.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_');
      const username = (user.username || baseName + '_' + Math.random().toString(36).substr(2, 4)).trim().toLowerCase();
      
      const payload: any = {
        id: user.id,
        username: username,
        name: user.name,
        role: user.role,
        tenant_id: tenantId,
        store_name: storeName,
        photo: user.photo,
        // A senha não é mais armazenada diretamente aqui após a autenticação via Supabase Auth.
        // Atualizações de senha devem ser feitas via supabase.auth.updateUser({ password: '...' })
        password: '', // Temporário: Define uma string vazia para satisfazer a restrição NOT NULL
        specialty: user.specialty
      };

      const { error } = await supabase
        .from('users')
        .upsert(payload, { onConflict: 'id' });

      if (error) throw error;
      return { success: true, username };
    } catch (e: any) {
      console.error("Erro ao salvar/atualizar usuário:", e.message);
      return { success: false, message: e.message };
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
      return data || [];
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
      
      if (error) throw error;
      return data || null;
    } catch (e) {
      console.error("Erro ao buscar loja por ID:", e);
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
      if (error) console.error("Erro ao deletar OS:", error);
      return { success: !error };
    } catch (e) { return { success: false }; }
  }

  // Busca as Ordens de Serviço e mapeia as novas colunas entry_date e exit_date
  static async fetchOrders(tenantId: string) {
    if (!tenantId) return [];
    try {
      const { data, error } = await supabase
        .from('service_orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(d => ({
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
        // MAPEAMENTO DAS NOVAS DATAS DO SQL PARA O APP
        entryDate: d.entry_date || '',
        exitDate: d.exit_date || '',
        isDeleted: d.is_deleted || false
      }));
    } catch (e) { 
      console.error("Erro ao buscar ordens do Supabase:", e);
      return []; 
    }
  }

  // Busca produtos em estoque
  static async fetchProducts(tenantId: string) {
    if (!tenantId) return [];
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('id', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(d => ({
        id: d.id,
        name: d.name,
        barcode: d.barcode,
        photo: d.photo,
        costPrice: Number(d.cost_price || 0),
        salePrice: Number(d.sale_price || 0),
        quantity: Number(d.quantity || 0)
      }));
    } catch (e) { 
      console.error("Erro ao buscar produtos do Supabase:", e);
      return []; 
    }
  }

  // Busca histórico de vendas
  static async fetchSales(tenantId: string) {
    if (!tenantId) return [];
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(d => ({
        id: d.id,
        productId: d.product_id,
        productName: d.product_name,
        date: d.date,
        quantity: d.quantity,
        originalPrice: Number(d.original_price || 0),
        discount: Number(d.discount || 0),
        finalPrice: Number(d.final_price || 0),
        costAtSale: Number(d.cost_at_sale || 0),
        paymentMethod: d.payment_method,
        sellerName: d.seller_name,
        transactionId: d.transaction_id,
        isDeleted: d.is_deleted || false
      }));
    } catch (e) {
      console.error("Erro ao buscar vendas do Supabase:", e);
      return [];
    }
  }

  // Busca transações manuais (entradas e saídas)
  static async fetchTransactions(tenantId: string) {
    if (!tenantId) return [];
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(d => ({
        id: d.id,
        type: d.type,
        description: d.description,
        amount: Number(d.amount || 0),
        date: d.date,
        category: d.category,
        paymentMethod: d.payment_method,
        isDeleted: d.is_deleted || false
      }));
    } catch (e) {
      console.error("Erro ao buscar transações do Supabase:", e);
      return [];
    }
  }

  // Salva Ordens de Serviço no Banco de Dados
  static async upsertOrders(tenantId: string, orders: any[]) {
    if (!tenantId || !orders.length) return { success: true };
    try {
      const payload = orders.map(os => ({
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
        is_deleted: os.isDeleted || false
      }));
      const { error } = await supabase.from('service_orders').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      return { success: true };
    } catch (e) { 
      console.error("Erro ao salvar ordens no Supabase:", e);
      return { success: false }; 
    }
  }

  // Salva produtos no Banco de Dados
  static async upsertProducts(tenantId: string, products: any[]) {
    if (!tenantId || !products.length) return { success: true };
    try {
      const payload = products.map(p => ({
        id: p.id,
        tenant_id: tenantId,
        name: p.name,
        barcode: p.barcode,
        photo: p.photo,
        cost_price: p.costPrice,
        sale_price: p.salePrice,
        quantity: p.quantity
      }));
      const { error } = await supabase.from('products').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      return { success: true };
    } catch (e) { 
      console.error("Erro ao salvar produtos no Supabase:", e);
      return { success: false }; 
    }
  }

  // Salva vendas no Banco de Dados
  static async upsertSales(tenantId: string, sales: any[]) {
    if (!tenantId || !sales.length) return { success: true };
    try {
      const payload = sales.map(s => ({
        id: s.id,
        tenant_id: tenantId,
        product_id: s.productId,
        product_name: s.productName,
        date: s.date,
        quantity: s.quantity,
        original_price: s.originalPrice,
        discount: s.discount,
        final_price: s.finalPrice,
        cost_at_sale: s.costAtSale,
        payment_method: s.paymentMethod,
        seller_name: s.sellerName,
        transaction_id: s.transactionId,
        is_deleted: s.isDeleted || false
      }));
      const { error } = await supabase.from('sales').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error("Erro ao salvar vendas no Supabase:", e);
      return { success: false };
    }
  }

  // Salva transações no Banco de Dados
  static async upsertTransactions(tenantId: string, transactions: any[]) {
    if (!tenantId || !transactions.length) return { success: true };
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
        is_deleted: t.isDeleted || false
      }));
      const { error } = await supabase.from('transactions').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error("Erro ao salvar transações no Supabase:", e);
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
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      console.error("Erro Delete User:", e);
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
}
