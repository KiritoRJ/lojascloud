
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lawcmqsjhwuhogsukhbf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_c2wQfanSj96FRWqoCq9KIw_2FhxuRBv';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export class OnlineDB {
  static async login(username: string, passwordPlain: string) {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = passwordPlain.trim();

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
      if (!data) return { success: false, message: "Usuário ou senha inválidos." };

      return { 
        success: true, 
        type: data.role || 'admin', 
        tenant: { id: data.tenant_id, username: data.username } 
      };
    } catch (err: any) {
      return { success: false, message: "Erro de conexão: " + err.message };
    }
  }

  static async createTenant(tenantData: any) {
    try {
      const { error: tError } = await supabase
        .from('tenants')
        .insert([{
          id: tenantData.id,
          store_name: tenantData.storeName,
          created_at: new Date().toISOString()
        }]);
      if (tError) throw tError;

      const { error: uError } = await supabase
        .from('users')
        .insert([{
          username: tenantData.adminUsername.toLowerCase().trim(),
          password: tenantData.adminPasswordPlain,
          role: 'admin',
          tenant_id: tenantData.id,
          store_name: tenantData.storeName
        }]);
      if (uError) throw uError;

      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  static async getTenants() {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  }

  /** ORDENS DE SERVIÇO **/
  static async upsertOrders(tenantId: string, orders: any[]) {
    if (!tenantId || !orders) return { success: false };
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
        parts_cost: parseFloat(os.partsCost?.toString() || '0'),
        service_cost: parseFloat(os.serviceCost?.toString() || '0'),
        total: parseFloat(os.total?.toString() || '0'),
        status: os.status,
        photos: os.photos || [],
        finished_photos: os.finishedPhotos || [],
        created_at: os.date || new Date().toISOString()
      }));

      const { error } = await supabase
        .from('service_orders')
        .upsert(payload, { onConflict: 'id' });
      
      if (error) {
        console.error("Erro Supabase OS:", error.message, error.details);
        return { success: false, error };
      }
      return { success: true };
    } catch (e) {
      console.error("Erro Crítico OS:", e);
      return { success: false, error: e };
    }
  }

  /** PRODUTOS (ESTOQUE) **/
  static async upsertProducts(tenantId: string, products: any[]) {
    if (!tenantId || !products) {
      console.warn("Sync: TenantId ou lista de produtos ausente.");
      return { success: false };
    }
    
    try {
      const payload = products.map(p => ({
        id: p.id,
        tenant_id: tenantId,
        name: p.name,
        photo: p.photo, // Base64 comprimido
        cost_price: parseFloat(p.costPrice?.toString() || '0'),
        sale_price: parseFloat(p.salePrice?.toString() || '0'),
        quantity: parseInt(p.quantity?.toString() || '0')
        // Removido updated_at para evitar erros caso a coluna não exista no schema do usuário
      }));

      console.log("Sincronizando produtos...", payload.length, "itens");

      const { error } = await supabase
        .from('products')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error("Erro Supabase Estoque:", error.message, error.details);
        return { success: false, error };
      }
      
      console.log("Estoque sincronizado com sucesso.");
      return { success: true };
    } catch (e) {
      console.error("Erro Crítico Estoque:", e);
      return { success: false, error: e };
    }
  }

  static async deleteProduct(productId: string) {
    try {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      return { success: !error, error };
    } catch (e) {
      return { success: false, error: e };
    }
  }

  static async fetchProducts(tenantId: string) {
    if (!tenantId) return null;
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('id', { ascending: false }); // Usando 'id' como fallback seguro de ordenação
      
      if (error) throw error;
      
      return (data || []).map(d => ({
        id: d.id,
        name: d.name || '',
        photo: d.photo || null,
        costPrice: Number(d.cost_price) || 0,
        salePrice: Number(d.sale_price) || 0,
        quantity: Number(d.quantity) || 0
      }));
    } catch (e) {
      console.error("Erro ao buscar estoque:", e);
      return null;
    }
  }

  static async deleteOS(osId: string) {
    try {
      const { error } = await supabase.from('service_orders').delete().eq('id', osId);
      return { success: !error, error };
    } catch (e) {
      return { success: false, error: e };
    }
  }

  static async fetchOrders(tenantId: string) {
    if (!tenantId) return null;
    try {
      const { data, error } = await supabase
        .from('service_orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(d => ({
        id: d.id,
        customerName: d.customer_name || '',
        phoneNumber: d.phone_number || '',
        address: d.address || '',
        deviceBrand: d.device_brand || '',
        deviceModel: d.device_model || '',
        defect: d.defect || '',
        repairDetails: d.repair_details || '',
        partsCost: Number(d.parts_cost) || 0,
        serviceCost: Number(d.service_cost) || 0,
        total: Number(d.total) || 0,
        status: d.status || 'Pendente',
        photos: d.photos || [],
        finishedPhotos: d.finished_photos || [],
        date: d.created_at || d.date
      }));
    } catch (e) {
      return null;
    }
  }

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
    } catch (e) {
      return null;
    }
  }
}
