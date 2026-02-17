
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lawcmqsjhwuhogsukhbf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_c2wQfanSj96FRWqoCq9KIw_2FhxuRBv';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export class OnlineDB {
  static async login(username: string, passwordPlain: string) {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = passwordPlain.trim();

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', cleanUser)
        .eq('password', cleanPass)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { success: false, message: "Usuário ou senha incorretos." };

      return { 
        success: true, 
        type: data.role || 'admin', 
        tenant: data.tenant_id ? { 
          id: data.tenant_id, 
          username: data.username,
          name: data.name || data.username,
          role: data.role
        } : null 
      };
    } catch (err: any) {
      return { success: false, message: "Erro ao conectar com o banco de dados." };
    }
  }

  static async verifyAdminPassword(tenantId: string, passwordPlain: string) {
    if (!tenantId) return { success: false, message: "ID da loja não encontrado." };
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('role', 'admin')
        .eq('password', passwordPlain.trim())
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return { success: false, message: "Senha de administrador incorreta." };
      
      return { success: true };
    } catch (err: any) {
        return { success: false, message: "Erro de comunicação com o banco de dados." };
    }
  }

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
          id: 'USR_ADM_' + Math.random().toString(36).substr(2, 5).toUpperCase(),
          username: tenantData.adminUsername.toLowerCase().trim(),
          password: tenantData.adminPasswordPlain.trim(),
          name: tenantData.storeName,
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
        password: user.password || '123456',
        specialty: user.specialty
      };

      const { error } = await supabase
        .from('users')
        .upsert(payload, { onConflict: 'id' });

      if (error) throw error;
      return { success: true, username };
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

  static async deleteOS(osId: string) {
    try {
      const { error } = await supabase.from('service_orders').delete().eq('id', osId);
      return { success: !error };
    } catch (e) { return { success: false }; }
  }

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
        date: d.created_at
      }));
    } catch (e) { 
      console.error("Erro ao buscar ordens do Supabase:", e);
      return []; 
    }
  }

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
        created_at: os.date || new Date().toISOString()
      }));
      const { error } = await supabase.from('service_orders').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      return { success: true };
    } catch (e) { 
      console.error("Erro ao salvar ordens no Supabase:", e);
      return { success: false }; 
    }
  }

  static async upsertProducts(tenantId: string, products: any[]) {
    if (!tenantId || !products.length) return { success: true };
    try {
      const payload = products.map(p => ({
        id: p.id,
        tenant_id: tenantId,
        name: p.name,
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

  static async deleteProduct(id: string) {
    try {
      await supabase.from('products').delete().eq('id', id);
      return { success: true };
    } catch (e) { return { success: false }; }
  }

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
}
