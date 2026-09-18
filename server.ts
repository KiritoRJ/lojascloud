import express from 'express';
import { createServer as createViteServer } from 'vite';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { GoogleGenAI, Type } from '@google/genai';
import { OnlineDB, supabase } from './utils/api';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// Helper to hash password
const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Helper to compare password
const comparePassword = async (password: string, hash: string) => {
  // If it's a bcrypt hash, it starts with $2a$ or $2b$
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
    return await bcrypt.compare(password, hash);
  }
  // Fallback for plain text passwords (legacy)
  return password === hash;
};

const getMPAccessToken = async () => {
  // 1. Variável de ambiente direta (com trim para ignorar espaços ou quebras de linha)
  const envToken = 
    process.env.MERCADO_PAGO_ACCESS_TOKEN || 
    process.env.MP_ACCESS_TOKEN ||
    process.env.VITE_MERCADO_PAGO_ACCESS_TOKEN;

  if (envToken && typeof envToken === 'string' && envToken.trim().length > 10) {
    return envToken.trim();
  }

  // 2. Fallback: buscar na tabela cloud_data configurada pelo SuperAdmin
  try {
    const { data } = await supabase
      .from('cloud_data')
      .select('data_json')
      .eq('tenant_id', 'SYSTEM')
      .eq('store_key', 'global_plans')
      .maybeSingle();

    const dbToken = data?.data_json?.mercadoPagoAccessToken;
    if (dbToken && typeof dbToken === 'string' && dbToken.trim().length > 10) {
      return dbToken.trim();
    }
  } catch (err) {
    console.error('Erro ao buscar token do Mercado Pago no banco:', err);
  }

  return null;
};

const getMPClient = async () => {
  const token = await getMPAccessToken();
  if (!token) {
    throw new Error('Token do Mercado Pago não configurado. Adicione a variável MERCADO_PAGO_ACCESS_TOKEN ou configure o Access Token no painel SuperAdmin.');
  }
  return new MercadoPagoConfig({ accessToken: token });
};

const getGeminiApiKey = async (): Promise<string | null> => {
  const envKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim().length > 10) {
    return envKey.trim();
  }

  try {
    const { data } = await supabase
      .from('cloud_data')
      .select('data_json')
      .eq('tenant_id', 'SYSTEM')
      .eq('store_key', 'global_plans')
      .maybeSingle();

    const dbKey = data?.data_json?.geminiApiKey;
    if (dbKey && typeof dbKey === 'string' && dbKey.trim().length > 10) {
      return dbKey.trim();
    }
  } catch (err) {
    console.warn('Aviso ao buscar chave Gemini no Supabase:', err);
  }

  return null;
};

const getGenAI = async () => {
  const apiKey = await getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Chave de API Gemini (GEMINI_API_KEY) não configurada nas variáveis de ambiente nem no painel SuperAdmin.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());

// AI Intelligent Product Scanner endpoint
app.post('/api/ai/analyze-product-image', async (req, res) => {
  try {
    const { imageBase64, mimeType, tenantId } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Nenhuma imagem foi enviada para análise.' });
    }

    let requirePaidCredits = false;

    // Se o lojista tiver permissões configuradas pelo SuperAdmin
    if (tenantId) {
      try {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('id, store_name, enabled_features')
          .eq('id', tenantId)
          .maybeSingle();

        if (tenantData) {
          // Verifica se a função de IA está desabilitada para esta loja pelo SuperAdmin
          if (tenantData.enabled_features && tenantData.enabled_features.aiFeature === false) {
            return res.status(403).json({
              success: false,
              error: 'O recurso de Inteligência Artificial está desativado para esta loja pelo administrador.',
            });
          }

          // Se a opção de exigir créditos pagos estiver ativada no SuperAdmin
          // Se for false ou indefinido (padrão), o modo gratuito da IA permanece ativo!
          requirePaidCredits = tenantData.enabled_features?.aiRequirePaidCredits === true;
        }
      } catch (e) {
        console.warn('Aviso ao checar permissões do lojista:', e);
      }
    }

    // Se a cobrança de créditos pagos estiver ativada, valida saldo da loja
    if (tenantId && requirePaidCredits) {
      const currentCredits = await OnlineDB.getAICredits(tenantId);
      if (currentCredits <= 0) {
        return res.status(402).json({
          success: false,
          error: 'Seus créditos de Inteligência Artificial acabaram. Adquira um novo pacote de créditos de IA ou solicite ao administrador a liberação do modo gratuito.',
          code: 'INSUFFICIENT_CREDITS',
          requirePaidCredits: true,
          currentCredits: 0,
        });
      }
    }

    let cleanBase64 = imageBase64;
    let detectedMime = mimeType || 'image/jpeg';
    if (cleanBase64.includes(';base64,')) {
      const parts = cleanBase64.split(';base64,');
      cleanBase64 = parts[1];
      const match = parts[0].match(/data:(.*?)$/);
      if (match) detectedMime = match[1];
    }

    const ai = await getGenAI();

    const prompt = `Você é um assistente de inteligência artificial de elite especializado em catalogação e automação de cadastro de produtos para varejo, comércio e assistência técnica.
Analise detalhadamente a foto do produto/embalagem/caixa/rótulo fornecida e identifique o máximo de informações disponíveis:

1. Nome comercial do produto (name): Nome claro, objetivo e completo (ex: "Fone de Ouvido Bluetooth JBL Tune 510BT Preto" ou "Película de Vidro 3D iPhone 14 Pro").
2. Marca (brand): Marca do produto se legível ou identificável na caixa (ex: Apple, JBL, Samsung, Xiaomi, Baseus, etc.).
3. Modelo (model): Código ou nome do modelo especificado.
4. Categoria (category): Categoria apropriada (ex: "Acessórios", "Áudio", "Cabos e Carregadores", "Capas e Películas", "Periféricos", "Peças e Componentes", "Eletrônicos", "Baterias", etc.).
5. Código de barras (barcode): Extraia com precisão os números do código de barras EAN-13, GTIN ou UPC impresso na caixa ou etiqueta. Retorne SOMENTE dígitos numéricos. Se não houver código de barras visível, retorne string vazia.
6. Preço de venda (salePrice): Se houver etiqueta de preço colada ou impressa na caixa (ex: "R$ 39,90" ou etiqueta de loja), extraia o valor numérico em reais (ex: 39.9). Se não houver, retorne 0.
7. Preço de custo (costPrice): Se houver menção de preço de custo ou atacado, extraia o valor numérico. Caso contrário, retorne 0.
8. Descontos e Promoções: Se houver indicação de desconto (ex: "De R$ 100 por R$ 79", "30% OFF", "Leve mais por menos"), extraia ou calcule o valor/percentual do desconto (discount), o preço promocional (promotionalPrice) e defina isPromotion como true.
9. Informações Fiscais no Brasil:
   - NCM (Nomenclatura Comum do Mercosul): Se constar na etiqueta fiscal ou caixa, ou sugira o NCM padrão de 8 dígitos para esse tipo de item (ex: 85183000 para fones, 85444200 para cabos, 85044010 para carregadores/fontes, 39269090 para capas plásticas).
   - CEST: Código CEST se aplicável ou se constar na caixa.
   - CFOP: CFOP padrão sugerido (ex: "5102").
10. Descrição completa (description): Elabore uma descrição profissional e detalhada com as principais características e especificações técnicas impressas na embalagem (dimensões, conectividade, voltagem, compatibilidade, cor, material, conteúdo da embalagem).
11. Quantidade (quantity): Se a embalagem for um kit ou pacote com múltiplas unidades (ex: "Kit com 5 peças"), retorne esse número. Caso seja item individual, retorne 1.

Retorne estritamente um objeto JSON com as chaves:
{
  "name": string,
  "brand": string,
  "model": string,
  "category": string,
  "barcode": string,
  "salePrice": number,
  "costPrice": number,
  "promotionalPrice": number,
  "discount": number,
  "isPromotion": boolean,
  "description": string,
  "ncm": string,
  "cest": string,
  "cfop": string,
  "quantity": number
}`;

    // Cascata inteligente: começa na versão mais recente (3.8) e se limitar passa para a versão anterior sucessivamente
    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash-lite',
    ];

    let lastError: any = null;
    let responseText: string | null = null;
    let successfulModel: string | null = null;

    for (const model of candidateModels) {
      try {
        console.log(`[Express Gemini] Analisando imagem com modelo: ${model}...`);
        const response = await ai.models.generateContent({
          model,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: detectedMime,
                  data: cleanBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        if (response?.text) {
          responseText = response.text;
          successfulModel = model;
          console.log(`[Express Gemini] Sucesso obtido com o modelo: ${model}`);
          break;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err || '');
        console.warn(`[Express Gemini] Modelo ${model} atingiu limite ou erro: ${errMsg.slice(0, 160)}`);
        // Se este modelo atingiu cota ou indisponibilidade, continua automaticamente para a versão anterior da lista
        continue;
      }
    }

    if (!responseText) {
      const parsedErr = typeof lastError?.message === 'string' ? lastError.message : '';
      let userFriendlyMsg = 'O serviço de reconhecimento por IA atingiu temporariamente o limite de consultas em todos os modelos. Tente novamente em instantes ou preencha manualmente.';
      
      try {
        const jsonErr = JSON.parse(parsedErr);
        if (jsonErr?.error?.message) {
          userFriendlyMsg = `Servidores de IA temporariamente ocupados (${jsonErr.error.status || 'Limite excedido'}). A foto foi anexada ao formulário. Tente o reconhecimento em instantes ou preencha manualmente.`;
        }
      } catch (_) {}

      return res.status(503).json({
        success: false,
        error: userFriendlyMsg,
        code: 503,
        canRetry: true,
      });
    }

    // Limpar possíveis delimitadores de markdown json caso o modelo os adicione
    let cleanedJsonText = responseText.trim();
    if (cleanedJsonText.startsWith('```json')) {
      cleanedJsonText = cleanedJsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedJsonText.startsWith('```')) {
      cleanedJsonText = cleanedJsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const data = JSON.parse(cleanedJsonText);

    // Se o uso de créditos pagos estiver ativado para a loja no SuperAdmin, consome 1 crédito
    let creditsRemaining: number | null = null;
    if (tenantId && requirePaidCredits) {
      try {
        const consumeResult = await OnlineDB.consumeAICredit(tenantId);
        if (consumeResult.success) {
          creditsRemaining = consumeResult.remainingCredits;
        }
      } catch (e) {
        console.warn('Aviso ao debitar crédito de IA:', e);
      }
    } else if (tenantId) {
      // Modo gratuito ativo: busca apenas o saldo para exibir na interface sem debitar
      try {
        creditsRemaining = await OnlineDB.getAICredits(tenantId);
      } catch (e) {}
    }

    return res.json({ 
      success: true, 
      data,
      modelUsed: successfulModel,
      isFreeMode: !requirePaidCredits,
      creditsRemaining: creditsRemaining !== null ? creditsRemaining : undefined
    });
  } catch (error: any) {
    console.error('Erro na análise de produto por IA:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Falha ao analisar a foto do produto com Inteligência Artificial.',
    });
  }
});

// Explicit route for legacy iPad 1 Safari 5.1 / iOS 5.1.1
app.get('/ipad', (req, res) => {
  res.sendFile(path.join(__dirname, 'legacy-ipad1.html'));
});

// Auth Routes
app.get('/api/resolve-tiktok', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const finalUrl = response.url;
    const match = finalUrl.match(/\/video\/(\d+)/);
    const videoId = match ? match[1] : null;

    res.json({ finalUrl, videoId });
  } catch (err) {
    console.error('Error resolving TikTok URL:', err);
    res.status(500).json({ error: 'Failed to resolve URL' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const cleanUser = username.trim().toLowerCase();

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*, tenants(*, tenant_limits(*))')
      .eq('username', cleanUser)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(401).json({ success: false, message: "Usuário ou senha incorretos." });

    const isMatch = await comparePassword(password.trim(), data.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Usuário ou senha incorretos." });

    const tenant = data.tenants;
    const limits = tenant?.tenant_limits;
    const expiresAt = tenant?.subscription_expires_at;
    const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;

    res.json({ 
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
    res.status(500).json({ success: false, message: "Erro ao realizar login." });
  }
});

app.post('/api/auth/register-tenant', async (req, res) => {
  const { id, storeName, adminUsername, adminPasswordPlain, logoUrl, phoneNumber } = req.body;
  
  try {
    const hashedPassword = await hashPassword(adminPasswordPlain.trim());
    
    const trialDays = 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + trialDays);

    const globalSettings = await OnlineDB.getGlobalSettings();
    const trialLimits = globalSettings.trial || { maxUsers: 1000, maxOS: 1000, maxProducts: 1000 };

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

    const { error: limitsError } = await supabase
      .from('tenant_limits')
      .insert([{
        tenant_id: id,
        max_os: trialLimits.maxOS,
        max_products: trialLimits.maxProducts
      }]);
    if (limitsError) throw limitsError;

    const { error: uError } = await supabase
      .from('users')
      .insert([{
        id: 'USR_ADM_' + Math.random().toString(36).substr(2, 5).toUpperCase(),
        username: adminUsername.toLowerCase().trim(),
        password: hashedPassword,
        name: storeName,
        role: 'admin',
        tenant_id: id,
        store_name: storeName,
        photo: logoUrl
      }]);
    if (uError) throw uError;

    res.json({ success: true });
  } catch (e: any) {
    console.error('Register tenant error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/auth/upsert-user', async (req, res) => {
  const { tenantId, storeName, user } = req.body;
  
  try {
    const baseName = user.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_');
    const username = (user.username || baseName + '_' + Math.random().toString(36).substr(2, 4)).trim().toLowerCase();
    
    let password = (user.password && user.password.trim() !== '') ? user.password : '123456';
    console.log('Upsert user:', { username, password, userPassword: user.password });
    // Only hash if it's not already hashed (though in upsert it's usually plain text from the form)
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
    res.json({ success: true, username });
  } catch (e: any) {
    console.error('Upsert user error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/auth/verify-admin', async (req, res) => {
  const { tenantId, password } = req.body;
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('password')
      .eq('tenant_id', tenantId)
      .eq('role', 'admin')
      .maybeSingle();
    
    if (error) throw error;
    if (!data) return res.status(401).json({ success: false, message: "Senha de administrador incorreta." });
    
    const isMatch = await comparePassword(password.trim(), data.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Senha de administrador incorreta." });
    
    res.json({ success: true });
  } catch (err: any) {
    console.error('Verify admin error:', err);
    res.status(500).json({ success: false, message: "Erro ao verificar senha." });
  }
});

app.post('/api/auth/change-password', async (req, res) => {
  const { tenantId, oldPassword, newPassword } = req.body;
  const isSuper = req.query?.isSuper === 'true' || req.body?.isSuper === true || !tenantId;
  
  try {
    let query = supabase.from('users').select('*');
    if (isSuper) {
      query = query.eq('role', 'super');
    } else {
      query = query.eq('tenant_id', tenantId).eq('role', 'admin');
    }
    
    const { data, error } = await query.maybeSingle();
    
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: isSuper ? "Super Admin não encontrado." : "Usuário administrador não encontrado." });
    
    // 2. Verify old password
    const isMatch = await comparePassword(oldPassword.trim(), data.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Senha atual incorreta." });
    
    // 3. Hash new password
    const hashedNewPassword = await hashPassword(newPassword.trim());
    
    // 4. Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedNewPassword })
      .eq('id', data.id);
    
    if (updateError) throw updateError;
    
    res.json({ success: true, message: isSuper ? "Senha do Super Admin alterada com sucesso!" : "Senha alterada com sucesso!" });
  } catch (err: any) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, message: "Erro ao alterar senha." });
  }
});

app.post('/api/auth/change-super-password', async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  
  try {
    // 1. Get the super admin user (role = 'super')
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'super')
      .maybeSingle();
    
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: "Super Admin não encontrado." });
    
    // 2. Verify old password
    const isMatch = await comparePassword(oldPassword.trim(), data.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Senha atual incorreta." });
    
    // 3. Hash new password
    const hashedNewPassword = await hashPassword(newPassword.trim());
    
    // 4. Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedNewPassword })
      .eq('id', data.id);
    
    if (updateError) throw updateError;
    
    res.json({ success: true, message: "Senha do Super Admin alterada com sucesso!" });
  } catch (err: any) {
    console.error('Change super password error:', err);
    res.status(500).json({ success: false, message: "Erro ao alterar senha do Super Admin." });
  }
});

// Exclusão completa de uma loja em cascata (Super Admin)
app.post('/api/super/delete-tenant', async (req, res) => {
  const { tenantId } = req.body;
  if (!tenantId) {
    return res.status(400).json({ success: false, message: 'ID da loja obrigatório.' });
  }

  try {
    // 1. Obter IDs dos usuários da loja
    const { data: tenantUsers } = await supabase
      .from('users')
      .select('id')
      .eq('tenant_id', tenantId);
    const userIds = (tenantUsers || []).map((u: any) => u.id).filter(Boolean);

    // 2. Obter IDs dos funcionários da loja
    const { data: tenantEmployees } = await supabase
      .from('employees')
      .select('id')
      .eq('tenant_id', tenantId);
    const employeeIds = (tenantEmployees || []).map((e: any) => e.id).filter(Boolean);

    // Se houver funcionários vinculados aos userIds da loja com outro tenant_id
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

    // 3. Deletar dependências de comissão e metas (apontam para employees)
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

    // 4. Deletar employees (resolve violação de foreign key 'employees_user_id_fkey' em users!)
    await supabase.from('employees').delete().eq('tenant_id', tenantId);
    if (userIds.length > 0) {
      await supabase.from('employees').delete().in('user_id', userIds);
    }
    if (employeeIds.length > 0) {
      await supabase.from('employees').delete().in('id', employeeIds);
    }

    // 5. Deletar sessões ativas
    await supabase.from('active_sessions').delete().eq('tenant_id', tenantId);
    if (userIds.length > 0) {
      await supabase.from('active_sessions').delete().in('user_id', userIds);
    }

    // 6. Deletar dados operacionais da loja
    await supabase.from('service_orders').delete().eq('tenant_id', tenantId);
    await supabase.from('sales').delete().eq('tenant_id', tenantId);
    await supabase.from('products').delete().eq('tenant_id', tenantId);
    await supabase.from('transactions').delete().eq('tenant_id', tenantId);
    await supabase.from('customers').delete().eq('tenant_id', tenantId);
    await supabase.from('suppliers').delete().eq('tenant_id', tenantId);
    await supabase.from('cloud_data').delete().eq('tenant_id', tenantId);
    await supabase.from('tenant_limits').delete().eq('tenant_id', tenantId);

    // 7. Deletar usuários da loja
    await supabase.from('users').delete().eq('tenant_id', tenantId);
    if (userIds.length > 0) {
      await supabase.from('users').delete().in('id', userIds);
    }

    // 8. Deletar o tenant
    const { error: tenantErr } = await supabase
      .from('tenants')
      .delete()
      .eq('id', tenantId);

    if (tenantErr) throw tenantErr;

    res.json({ success: true, message: 'Loja e todos os seus dados excluídos com sucesso.' });
  } catch (err: any) {
    console.error('Delete tenant error:', err);
    res.status(500).json({ success: false, message: err.message || 'Erro ao deletar loja.' });
  }
});

// Tracking API
app.get('/api/os-tracking/:token', async (req, res) => {
  const { token } = req.params;
  const cleanToken = (token || '').trim();
  console.log('Fetching tracking for token:', cleanToken);

  try {
    // 1. Try finding by tracking_token first
    let { data: order, error } = await supabase
      .from('service_orders')
      .select('id, tenant_id, customer_name, phone_number, device_brand, device_model, defect, repair_details, status, public_notes, created_at, entry_date, exit_date, total, photos, finished_photos, is_tracking_enabled, checklist')
      .eq('tracking_token', cleanToken)
      .maybeSingle();

    // 2. Fallback: if not found, try finding by OS ID directly
    if (!order) {
      const { data: fallbackOrder, error: fallbackError } = await supabase
        .from('service_orders')
        .select('id, tenant_id, customer_name, phone_number, device_brand, device_model, defect, repair_details, status, public_notes, created_at, entry_date, exit_date, total, photos, finished_photos, is_tracking_enabled, checklist')
        .eq('id', cleanToken)
        .maybeSingle();

      if (fallbackError) {
        console.error('Supabase fallback error:', fallbackError);
      } else if (fallbackOrder) {
        order = fallbackOrder;
      }
    }

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    if (!order) {
      console.log('No order found for token:', cleanToken);
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }

    if (order.is_tracking_enabled === false) {
      return res.status(403).json({ error: 'O acompanhamento online para esta O.S. está temporariamente desativado.' });
    }

    // Extract diagnostic tests if stored in checklist
    let diagData: any = null;
    if (Array.isArray(order.checklist)) {
      for (const item of order.checklist) {
        if (typeof item === 'string' && item.startsWith('__DIAG_JSON__:')) {
          try {
            diagData = JSON.parse(item.substring(14));
          } catch (e) {}
        }
      }
    }

    // Fetch store / tenant information
    let storeInfo: { name: string; phone?: string; logo?: string } = {
      name: 'TICCELL Assistência Técnica'
    };

    if (order.tenant_id) {
      const [tenantRes, settingsRes] = await Promise.all([
        supabase.from('tenants').select('name, username').eq('id', order.tenant_id).maybeSingle(),
        supabase.from('cloud_data').select('data_json').eq('tenant_id', order.tenant_id).eq('store_key', 'settings').maybeSingle()
      ]);

      if (tenantRes.data) {
        storeInfo.name = tenantRes.data.name || tenantRes.data.username || storeInfo.name;
      }
      if (settingsRes.data?.data_json) {
        const s = settingsRes.data.data_json;
        if (s.storeName) storeInfo.name = s.storeName;
        if (s.phoneNumber) storeInfo.phone = s.phoneNumber;
        if (s.logo) storeInfo.logo = s.logo;
      }
    }

    res.json({
      id: order.id,
      customerName: order.customer_name,
      phoneNumber: order.phone_number,
      deviceBrand: order.device_brand,
      deviceModel: order.device_model,
      defect: order.defect,
      repairDetails: order.repair_details,
      status: order.status || 'Pendente',
      publicNotes: order.public_notes,
      createdAt: order.created_at,
      entryDate: order.entry_date,
      exitDate: order.exit_date,
      total: order.total,
      photos: order.photos || [],
      finishedPhotos: order.finished_photos || [],
      diagnosticTests: diagData,
      store: storeInfo
    });
  } catch (err: any) {
    console.error('Error fetching OS tracking:', err);
    res.status(500).json({ error: 'Erro ao buscar dados do acompanhamento' });
  }
});

// Endpoint para buscar dados e testes de hardware da O.S. (via QR Code / link externo)
app.options('/api/device-test/:idOrToken', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res.status(200).end();
});

app.get('/api/device-test/:idOrToken', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  const { idOrToken } = req.params;
  const cleanParam = decodeURIComponent(idOrToken || '').trim().replace(/^#/, '');

  try {
    let { data: order, error } = await supabase
      .from('service_orders')
      .select('id, tenant_id, customer_name, phone_number, device_brand, device_model, defect, repair_details, status, checklist, public_notes, created_at, entry_date, tracking_token')
      .eq('tracking_token', cleanParam)
      .maybeSingle();

    if (!order) {
      const { data: fallbackOrder, error: fallbackError } = await supabase
        .from('service_orders')
        .select('id, tenant_id, customer_name, phone_number, device_brand, device_model, defect, repair_details, status, checklist, public_notes, created_at, entry_date, tracking_token')
        .eq('id', cleanParam)
        .maybeSingle();

      if (fallbackError) console.error('Error in fallback order query:', fallbackError);
      if (fallbackOrder) order = fallbackOrder;
    }

    if (error) throw error;
    if (!order) return res.status(404).json({ success: false, error: 'Ordem de Serviço não encontrada.' });

    // Extrair diagnósticos existentes se houver
    let existingDiagnostics = null;
    let cleanChecklist: string[] = [];
    if (Array.isArray(order.checklist)) {
      for (const item of order.checklist) {
        if (typeof item === 'string' && item.startsWith('__DIAG_JSON__:')) {
          try {
            existingDiagnostics = JSON.parse(item.substring(14));
          } catch (e) {}
        } else {
          cleanChecklist.push(item);
        }
      }
    }

    let storeName = 'Assistência Técnica';
    if (order.tenant_id) {
      try {
        const { data: tenant } = await supabase.from('tenants').select('name, username').eq('id', order.tenant_id).maybeSingle();
        if (tenant) storeName = tenant.name || tenant.username || storeName;
      } catch (e) {}
    }

    res.json({
      success: true,
      order: {
        id: order.id,
        tenantId: order.tenant_id,
        customerName: order.customer_name,
        phoneNumber: order.phone_number,
        deviceBrand: order.device_brand,
        deviceModel: order.device_model,
        defect: order.defect,
        status: order.status,
        entryDate: order.entry_date,
        createdAt: order.created_at,
        checklist: cleanChecklist,
        diagnosticTests: existingDiagnostics,
        storeName
      }
    });
  } catch (err: any) {
    console.error('Error fetching device test data:', err);
    res.status(500).json({ success: false, error: 'Erro ao buscar dados do teste de hardware.' });
  }
});

// Endpoint para salvar resultados dos testes de hardware diretamente na O.S. do cliente
app.post('/api/device-test/:idOrToken', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  const { idOrToken } = req.params;
  const { diagnosticResults } = req.body;
  const cleanParam = decodeURIComponent(idOrToken || '').trim().replace(/^#/, '');

  if (!diagnosticResults || !diagnosticResults.tests) {
    return res.status(400).json({ success: false, error: 'Resultados dos testes são obrigatórios.' });
  }

  try {
    let { data: order, error } = await supabase
      .from('service_orders')
      .select('id, tenant_id, customer_name, checklist')
      .eq('tracking_token', cleanParam)
      .maybeSingle();

    if (!order) {
      const { data: fallbackOrder } = await supabase
        .from('service_orders')
        .select('id, tenant_id, customer_name, checklist')
        .eq('id', cleanParam)
        .maybeSingle();
      if (fallbackOrder) order = fallbackOrder;
    }

    if (error) throw error;
    if (!order) return res.status(404).json({ success: false, error: 'Ordem de Serviço não encontrada.' });

    // Manter checklist anterior do usuário, removendo apenas entradas antigas de diagnóstico
    let currentChecklist: string[] = Array.isArray(order.checklist) ? [...order.checklist] : [];
    currentChecklist = currentChecklist.filter(item => {
      if (typeof item !== 'string') return false;
      if (item.startsWith('__DIAG_JSON__:')) return false;
      if (item.startsWith('🔍 [TESTE]')) return false;
      if (item.startsWith('📱 Touch:') || item.startsWith('✌️ Multi-touch:') || item.startsWith('🎤 Microfone:')) return false;
      if (item.startsWith('🔊 Alto-falante:') || item.startsWith('📞 Fone Auricular:') || item.startsWith('📶 Wi-Fi:')) return false;
      if (item.startsWith('👁️ Sensor de Presença:') || item.startsWith('🔐 Biometria:')) return false;
      return true;
    });

    const tests = diagnosticResults.tests;
    const testChecklistItems: string[] = [];

    const getStatusLabel = (s: string) => s === 'passed' ? 'Aprovado' : s === 'failed' ? 'Reprovado' : 'Não Testado';

    if (tests.touch) {
      testChecklistItems.push(`📱 Touch: ${getStatusLabel(tests.touch.status)} (${tests.touch.details || '100% grade'})`);
    }
    if (tests.multitouch) {
      testChecklistItems.push(`✌️ Multi-touch: ${getStatusLabel(tests.multitouch.status)} (${tests.multitouch.details || 'Múltiplos toques'})`);
    }
    if (tests.mic) {
      testChecklistItems.push(`🎤 Microfone: ${getStatusLabel(tests.mic.status)}`);
    }
    if (tests.speaker) {
      testChecklistItems.push(`🔊 Alto-falante: ${getStatusLabel(tests.speaker.status)}`);
    }
    if (tests.earpiece) {
      testChecklistItems.push(`📞 Fone Auricular: ${getStatusLabel(tests.earpiece.status)}`);
    }
    if (tests.wifi) {
      testChecklistItems.push(`📶 Wi-Fi / Rede: ${getStatusLabel(tests.wifi.status)} (${tests.wifi.details || 'Conectado'})`);
    }
    if (tests.proximity) {
      testChecklistItems.push(`👁️ Sensor de Presença: ${getStatusLabel(tests.proximity.status)}`);
    }
    if (tests.biometrics) {
      testChecklistItems.push(`🔐 Biometria: ${getStatusLabel(tests.biometrics.status)} (${tests.biometrics.details || 'Sensor biométrico'})`);
    }

    // Montar checklist atualizado
    const updatedChecklist = [
      ...currentChecklist,
      ...testChecklistItems,
      `__DIAG_JSON__:${JSON.stringify(diagnosticResults)}`
    ];

    const { error: updateError } = await supabase
      .from('service_orders')
      .update({ checklist: updatedChecklist })
      .eq('id', order.id);

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: 'Resultados dos testes de hardware salvos com sucesso na O.S.!',
      orderId: order.id,
      updatedChecklist: updatedChecklist.filter(i => !i.startsWith('__DIAG_JSON__:')),
      diagnosticResults
    });
  } catch (err: any) {
    console.error('Error saving device test results:', err);
    res.status(500).json({ success: false, error: 'Erro ao salvar resultados dos testes na O.S.' });
  }
});

app.post('/api/suppliers', async (req, res) => {
  const { tenantId, supplier } = req.body;
  if (!tenantId) {
    return res.status(400).json({ error: 'tenantId is required' });
  }

  try {
    const result = await OnlineDB.upsertSupplier(tenantId, supplier);
    res.json(result);
  } catch (err: any) {
    console.error('Error saving supplier:', err);
    res.status(500).json({ success: false, message: err.message || 'Error saving supplier' });
  }
});

app.delete('/api/suppliers/:id', async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'id is required' });
  }

  try {
    const result = await OnlineDB.deleteSupplier(id);
    res.json(result);
  } catch (err: any) {
    console.error('Error deleting supplier:', err);
    res.status(500).json({ success: false, message: err.message || 'Error deleting supplier' });
  }
});

app.post('/api/create-preference', async (req, res) => {
  try {
    const { title, unit_price, quantity, tenantId, planType } = req.body;

    const token = await getMPAccessToken();
    if (!token) {
      return res.status(500).json({ 
        error: 'Token do Mercado Pago não configurado.',
        details: 'Adicione a variável MERCADO_PAGO_ACCESS_TOKEN nas configurações ou configure o Access Token do Mercado Pago no painel SuperAdmin.'
      });
    }

    const origin = req.get('origin') || (req.get('referer') ? new URL(req.get('referer') as string).origin : null);
    const host = req.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const fallbackUrl = `${protocol}://${host}`;
    const baseUrl = origin || fallbackUrl;

    const preference = {
      items: [
        {
          id: planType,
          title: title,
          unit_price: Number(unit_price),
          quantity: Number(quantity),
        },
      ],
      back_urls: {
        success: `${baseUrl}/`,
        failure: `${baseUrl}/`,
        pending: `${baseUrl}/`
      },
      auto_return: 'approved' as 'approved',
      external_reference: `${tenantId}|${planType}`
    };

    const client = await getMPClient();
    const preferenceClient = new Preference(client);
    console.log('Creating preference for:', { tenantId, planType, unit_price });
    
    const response = await preferenceClient.create({ body: preference });
    console.log('Preference created successfully:', response.id);
    
    res.json({ id: response.id, init_point: response.init_point });

  } catch (error: any) {
    console.error('Error creating Mercado Pago preference:', error);
    const errorMessage = error.message || 'Failed to create payment preference.';
    res.status(500).json({ error: errorMessage, details: error });
  }
});

app.post(['/api/webhook', '/api/webhook/'], async (req, res) => {
  try {
    const payment = req.body;

    if (payment?.type === 'payment' || payment?.action === 'payment.updated') {
      const client = await getMPClient();
      const paymentClient = new Payment(client);
      const paymentId = payment?.data?.id || payment?.id;
      
      if (paymentId) {
        const data = await paymentClient.get({ id: paymentId });
        const externalReference = data.external_reference;
        const status = data.status;

        if (externalReference && status === 'approved') {
          const [tenantId, planType] = externalReference.split('|');
          
          // Verifica se é pacote de créditos de IA (ex: ai_credits_50, ai_credits_150, etc.)
          if (planType && planType.startsWith('ai_credits_')) {
            const amount = parseInt(planType.replace('ai_credits_', ''), 10);
            if (!isNaN(amount) && amount > 0) {
              await OnlineDB.addAICredits(tenantId, amount);
              console.log(`IA Credits updated successfully for tenant ${tenantId}: +${amount} credits`);
            }
          } else {
            const plans = {
              monthly: 1,
              quarterly: 3,
              yearly: 12
            };

            const months = plans[planType as keyof typeof plans];

            if (months) {
              const expiresAt = new Date();
              expiresAt.setMonth(expiresAt.getMonth() + months);

              // Update tenant subscription in your database
              await OnlineDB.updateSubscription(tenantId, months, planType as any);
              console.log(`Subscription updated successfully for tenant ${tenantId}`);
            }
          }
        } else {
          console.log(`Payment ${paymentId} status is ${status}, not updating subscription/credits.`);
        }
      }
    }
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Always return 200 to MercadoPago to acknowledge receipt, even if processing fails
    res.status(200).send('OK');
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    // Serve a basic service worker in dev to prevent MIME type errors if the plugin fails
    app.get('/sw.js', (req, res) => {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Service-Worker-Allowed', '/');
      res.send(`
        self.addEventListener('install', (event) => {
          self.skipWaiting();
          console.log('Dev SW installed');
        });
        self.addEventListener('activate', (event) => {
          event.waitUntil(self.clients.claim());
          console.log('Dev SW activated');
        });
        self.addEventListener('fetch', (event) => {
          // Pass through requests in dev
        });
      `);
    });

    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        proxy: {}
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: Serve static files from dist
    const distPath = path.join(__dirname, 'dist');
    console.log('Production mode: Serving static files from', distPath);

    // Serve service worker and manifest explicitly to ensure correct MIME types and no caching issues
    // Defined BEFORE express.static to ensure headers are applied
    app.get('/sw.js', (req, res) => {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Service-Worker-Allowed', '/');
      
      const swPath = path.join(distPath, 'sw.js');
      if (fs.existsSync(swPath)) {
        res.sendFile(swPath, (err) => {
          if (err) {
            console.error('Error serving sw.js:', err);
            res.status(404).end();
          }
        });
      } else {
        // Fallback to a no-op service worker if the file is missing in dist
        res.send(`
          self.addEventListener('install', (event) => {
            self.skipWaiting();
          });
          self.addEventListener('activate', (event) => {
            event.waitUntil(self.clients.claim());
          });
          self.addEventListener('fetch', (event) => {
            // No-op fetch handler
          });
        `);
      }
    });

    app.get('/manifest.webmanifest', (req, res) => {
      console.log('Serving manifest.webmanifest');
      res.setHeader('Content-Type', 'application/manifest+json');
      res.sendFile(path.join(distPath, 'manifest.webmanifest'), (err) => {
        if (err) {
          console.error('Error serving manifest.webmanifest:', err);
          res.status(404).end();
        }
      });
    });

    app.use(express.static(distPath));

    // SPA fallback for production
    app.get(/(.*)/, (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
