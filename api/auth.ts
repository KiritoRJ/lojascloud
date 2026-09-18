import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://lawcmqsjhwuhogsukhbf.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_c2wQfanSj96FRWqoCq9KIw_2FhxuRBv';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

const comparePassword = async (password: string, hash: string) => {
  if (!hash) return false;
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
    return await bcrypt.compare(password, hash);
  }
  return password === hash;
};

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const url = req.url || '';
  let action = req.query?.action;
  if (!action) {
    if (url.includes('register-tenant')) action = 'register-tenant';
    else if (url.includes('verify-admin')) action = 'verify-admin';
    else if (url.includes('change-super-password')) action = 'change-super-password';
    else if (url.includes('change-password')) action = 'change-password';
    else if (url.includes('upsert-user')) action = 'upsert-user';
    else action = 'login';
  }

  // 1. ACTION: LOGIN
  if (action === 'login') {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Usuário e senha são obrigatórios.' });
    }

    const cleanUser = String(username).trim().toLowerCase();

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, tenants(*, tenant_limits(*))')
        .eq('username', cleanUser)
        .maybeSingle();

      if (error) {
        console.error('Supabase error on login:', error);
        return res.status(500).json({ success: false, message: 'Erro ao consultar banco de dados: ' + error.message });
      }

      if (!data) {
        return res.status(401).json({ success: false, message: 'Usuário ou senha incorretos.' });
      }

      const isMatch = await comparePassword(String(password).trim(), data.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Usuário ou senha incorretos.' });
      }

      const tenant = data.tenants;
      const limits = tenant?.tenant_limits;
      const expiresAt = tenant?.subscription_expires_at;
      const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;

      return res.status(200).json({ 
        success: true, 
        type: data.role || 'admin', 
        tenant: data.tenant_id ? { 
          id: data.tenant_id, 
          username: data.username,
          name: data.name || data.username,
          role: data.role,
          subscriptionStatus: isExpired ? 'expired' : (tenant?.subscription_status || 'trial'),
          subscriptionExpiresAt: expiresAt,
          customMonthlyPrice: tenant?.custom_monthly_price,
          customQuarterlyPrice: tenant?.custom_quarterly_price,
          customYearlyPrice: tenant?.custom_yearly_price,
          lastPlanType: tenant?.last_plan_type,
          enabledFeatures: tenant?.enabled_features ? {
            customersTab: tenant.enabled_features.customersTab !== false,
            ...tenant.enabled_features
          } : {
            osTab: true,
            customersTab: true,
            stockTab: true,
            salesTab: true,
            financeTab: true,
            profiles: true,
            xmlExportImport: true,
            hideFinancialReports: false
          },
          maxUsers: tenant?.max_users || 999,
          maxOS: limits?.max_os || 999,
          maxProducts: limits?.max_products || 999,
          printerSize: tenant?.printer_size || 58,
          retentionMonths: tenant?.retention_months || 6
        } : null 
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ success: false, message: 'Erro interno ao realizar login: ' + (err?.message || err) });
    }
  }

  // 2. ACTION: VERIFY-ADMIN
  if (action === 'verify-admin') {
    const { tenantId, password } = req.body || {};

    try {
      const { data, error } = await supabase
        .from('users')
        .select('password')
        .eq('tenant_id', tenantId)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) throw error;
      if (!data) return res.status(401).json({ success: false, message: 'Senha de administrador incorreta.' });

      const isMatch = await comparePassword(String(password).trim(), data.password);
      if (!isMatch) return res.status(401).json({ success: false, message: 'Senha de administrador incorreta.' });

      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error('Verify admin error:', err);
      return res.status(500).json({ success: false, message: 'Erro ao verificar senha.' });
    }
  }

  // 3. ACTION: CHANGE-PASSWORD
  if (action === 'change-password') {
    const { tenantId, oldPassword, newPassword } = req.body || {};

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) throw error;
      if (!data) return res.status(404).json({ success: false, message: 'Usuário administrador não encontrado.' });

      const isMatch = await comparePassword(String(oldPassword).trim(), data.password);
      if (!isMatch) return res.status(401).json({ success: false, message: 'Senha atual incorreta.' });

      const hashedNewPassword = await hashPassword(String(newPassword).trim());

      const { error: updateError } = await supabase
        .from('users')
        .update({ password: hashedNewPassword })
        .eq('id', data.id);

      if (updateError) throw updateError;

      return res.status(200).json({ success: true, message: 'Senha alterada com sucesso!' });
    } catch (err: any) {
      console.error('Change password error:', err);
      return res.status(500).json({ success: false, message: 'Erro ao alterar senha: ' + (err?.message || err) });
    }
  }

  // 4. ACTION: CHANGE-SUPER-PASSWORD
  if (action === 'change-super-password') {
    const { oldPassword, newPassword } = req.body || {};

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'super')
        .maybeSingle();

      if (error) throw error;
      if (!data) return res.status(404).json({ success: false, message: 'Super Admin não encontrado.' });

      const isMatch = await comparePassword(String(oldPassword).trim(), data.password);
      if (!isMatch) return res.status(401).json({ success: false, message: 'Senha atual incorreta.' });

      const hashedNewPassword = await hashPassword(String(newPassword).trim());

      const { error: updateError } = await supabase
        .from('users')
        .update({ password: hashedNewPassword })
        .eq('id', data.id);

      if (updateError) throw updateError;

      return res.status(200).json({ success: true, message: 'Senha do Super Admin alterada com sucesso!' });
    } catch (err: any) {
      console.error('Change super password error:', err);
      return res.status(500).json({ success: false, message: 'Erro ao alterar senha do Super Admin.' });
    }
  }

  // 5. ACTION: REGISTER-TENANT
  if (action === 'register-tenant') {
    const { id, storeName, adminUsername, adminPasswordPlain, logoUrl, phoneNumber } = req.body || {};

    if (!id || !storeName || !adminUsername || !adminPasswordPlain) {
      return res.status(400).json({ success: false, message: 'Campos obrigatórios ausentes.' });
    }

    try {
      const hashedPassword = await hashPassword(String(adminPasswordPlain).trim());
      
      const trialDays = 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + trialDays);

      const trialLimits = { maxUsers: 1000, maxOS: 1000, maxProducts: 1000 };

      const { error: tError } = await supabase
        .from('tenants')
        .insert([{
          id: id,
          store_name: storeName,
          logo_url: logoUrl,
          created_at: new Date().toISOString(),
          subscription_status: 'trial',
          subscription_expires_at: expiresAt.toISOString(),
          phone_number: phoneNumber,
          enabled_features: {
            osTab: true,
            customersTab: true,
            stockTab: true,
            salesTab: true,
            financeTab: true,
            profiles: true,
            xmlExportImport: true,
            hideFinancialReports: false
          },
          max_users: trialLimits.maxUsers
        }]);

      if (tError) throw tError;

      await supabase
        .from('tenant_limits')
        .insert([{
          tenant_id: id,
          max_os: trialLimits.maxOS,
          max_products: trialLimits.maxProducts
        }]);

      const { error: uError } = await supabase
        .from('users')
        .insert([{
          username: String(adminUsername).trim().toLowerCase(),
          name: storeName,
          password: hashedPassword,
          role: 'admin',
          tenant_id: id,
          store_name: storeName
        }]);

      if (uError) throw uError;

      return res.status(200).json({ success: true, message: 'Loja registrada com sucesso!' });
    } catch (err: any) {
      console.error('Register tenant error:', err);
      return res.status(500).json({ success: false, message: 'Erro ao registrar loja: ' + (err?.message || err) });
    }
  }

  // 6. ACTION: UPSERT-USER
  if (action === 'upsert-user') {
    const { tenantId, storeName, user } = req.body || {};
    if (!user || !user.name) {
      return res.status(400).json({ success: false, message: 'Dados do usuário inválidos.' });
    }

    try {
      const baseName = user.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_');
      const username = (user.username || baseName + '_' + Math.random().toString(36).substr(2, 4)).trim().toLowerCase();
      
      let password = (user.password && user.password.trim() !== '') ? user.password : '123456';
      if (!password.startsWith('$2a$') && !password.startsWith('$2b$')) {
        password = await hashPassword(password.trim());
      }

      const payload: any = {
        id: user.id,
        username: username,
        name: user.name,
        role: user.role,
        tenant_id: tenantId,
        store_name: storeName,
        photo: user.photo,
        password: password,
        specialty: user.specialty
      };

      const { error } = await supabase
        .from('users')
        .upsert(payload, { onConflict: 'id' });

      if (error) throw error;
      return res.status(200).json({ success: true, username });
    } catch (e: any) {
      console.error('Upsert user error:', e);
      return res.status(500).json({ success: false, message: e.message || 'Erro ao salvar usuário' });
    }
  }

  return res.status(404).json({ success: false, message: 'Ação de autenticação não encontrada.' });
}
