import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://lawcmqsjhwuhogsukhbf.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_c2wQfanSj96FRWqoCq9KIw_2FhxuRBv';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CANDIDATE_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
];

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

function setCors(res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
}

function parseBody(req: any) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (_) {
      return {};
    }
  }
  return req.body;
}

async function getSystemAISettings() {
  let dbApiKey = '';
  let aiDisabledGlobally = false;

  try {
    const { data } = await supabase
      .from('cloud_data')
      .select('data_json')
      .eq('tenant_id', 'SYSTEM')
      .eq('store_key', 'global_plans')
      .maybeSingle();

    if (data?.data_json) {
      const json = data.data_json;
      if (json.aiDisabledGlobally === true || json.isAiDisabledGlobally === true) {
        aiDisabledGlobally = true;
      }
      if (typeof json.aiApiKey === 'string' && json.aiApiKey.trim().length > 5) {
        dbApiKey = json.aiApiKey.trim();
      } else if (typeof json.geminiApiKey === 'string' && json.geminiApiKey.trim().length > 5) {
        dbApiKey = json.geminiApiKey.trim();
      }
    }
  } catch (err) {
    console.error('Erro ao buscar configurações de IA no banco:', err);
  }

  const envKey = (
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ''
  ).trim();

  const effectiveKey = dbApiKey || envKey;
  const source: 'database' | 'env' | 'none' = dbApiKey ? 'database' : (envKey ? 'env' : 'none');

  let maskedKey = '';
  if (effectiveKey) {
    if (effectiveKey.length > 10) {
      maskedKey = `${effectiveKey.slice(0, 6)}...${effectiveKey.slice(-4)}`;
    } else {
      maskedKey = '••••••••';
    }
  }

  return {
    aiDisabledGlobally,
    apiKey: effectiveKey,
    source,
    maskedKey,
  };
}

export default async function handler(req: any, res: any) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Detect action from query param or URL path:
  // e.g. /api/ai?action=system-status, /api/ai/system-status, /api/ai/test-key, etc.
  const url = req.url || '';
  let action = req.query?.action;
  if (!action) {
    if (url.includes('system-status')) action = 'system-status';
    else if (url.includes('test-key')) action = 'test-key';
    else if (url.includes('analyze-product-image')) action = 'analyze-product-image';
    else if (req.method === 'GET') action = 'system-status';
    else action = 'analyze-product-image';
  }

  // 1. ACTION: SYSTEM-STATUS
  if (action === 'system-status') {
    try {
      const settings = await getSystemAISettings();
      return res.status(200).json({
        success: true,
        aiDisabledGlobally: settings.aiDisabledGlobally,
        hasApiKey: !!settings.apiKey,
        keySource: settings.source,
        maskedKey: settings.maskedKey,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Erro ao consultar status da IA.',
      });
    }
  }

  // 2. ACTION: TEST-KEY
  if (action === 'test-key') {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Método não permitido.' });
    }

    try {
      const body = parseBody(req);
      const { apiKey } = body || {};
      let keyToTest = typeof apiKey === 'string' && apiKey.trim().length > 5 ? apiKey.trim() : '';

      if (!keyToTest) {
        const currentSettings = await getSystemAISettings();
        keyToTest = currentSettings.apiKey;
      }

      if (!keyToTest) {
        return res.status(400).json({
          success: false,
          error: 'Nenhuma chave de API da IA fornecida para teste. Insira a chave do Google Gemini.',
        });
      }

      const testClient = new GoogleGenAI({
        apiKey: keyToTest,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      let success = false;
      let sampleResponse = '';
      let lastErr: any = null;

      for (const model of CANDIDATE_MODELS) {
        try {
          const response = await testClient.models.generateContent({
            model,
            contents: 'Teste de conexão com a API da IA. Responda apenas com: OK.',
          });
          if (response?.text) {
            success = true;
            sampleResponse = response.text.trim();
            break;
          }
        } catch (err: any) {
          lastErr = err;
        }
      }

      if (success) {
        return res.status(200).json({
          success: true,
          message: 'Chave de API validada com sucesso! Conexão ativa com o Google Gemini.',
          sampleResponse,
        });
      } else {
        let errMsg = lastErr?.message || String(lastErr || 'Erro desconhecido ao testar a chave.');
        try {
          const parsed = JSON.parse(errMsg);
          if (parsed?.error?.message) {
            errMsg = parsed.error.message;
          }
        } catch (_) {}

        return res.status(400).json({
          success: false,
          error: `Falha ao validar chave de API: ${errMsg}`,
        });
      }
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Erro ao processar teste da chave de API.',
      });
    }
  }

  // 3. ACTION: ANALYZE-PRODUCT-IMAGE
  if (action === 'analyze-product-image') {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Método não permitido.' });
    }

    try {
      const body = parseBody(req);
      const { imageBase64, mimeType, tenantId } = body || {};

      const { aiDisabledGlobally, apiKey } = await getSystemAISettings();

      if (aiDisabledGlobally) {
        return res.status(403).json({
          success: false,
          aiDisabledGlobally: true,
          error: 'A Inteligência Artificial está desativada em todo o sistema pelo Super Administrador.',
        });
      }

      if (!apiKey) {
        return res.status(400).json({
          success: false,
          missingApiKey: true,
          error: 'Chave de API da IA não configurada no sistema. O Super Administrador precisa definir a chave no painel Super Admin.',
        });
      }

      if (!imageBase64) {
        return res.status(400).json({
          success: false,
          error: 'Nenhuma imagem foi enviada para análise.',
        });
      }

      let creditsRemaining: number | null = null;
      if (tenantId) {
        try {
          const { data: tenantData } = await supabase
            .from('tenants')
            .select('enabled_features')
            .eq('id', tenantId)
            .maybeSingle();

          if (tenantData?.enabled_features && tenantData.enabled_features.aiFeature === false) {
            return res.status(403).json({
              success: false,
              error: 'O recurso de Inteligência Artificial está desativado para esta loja pelo administrador.',
            });
          }

          const { data: creditData } = await supabase
            .from('cloud_data')
            .select('data_json')
            .eq('tenant_id', tenantId)
            .eq('store_key', 'ai_credits')
            .maybeSingle();

          const currentCredits = creditData?.data_json?.credits;
          if (typeof currentCredits === 'number' && currentCredits > 0) {
            const updated = Math.max(0, currentCredits - 1);
            await supabase
              .from('cloud_data')
              .upsert({
                tenant_id: tenantId,
                store_key: 'ai_credits',
                data_json: {
                  credits: updated,
                  last_used_at: new Date().toISOString(),
                },
                updated_at: new Date().toISOString(),
              }, { onConflict: 'tenant_id,store_key' });
            creditsRemaining = updated;
          }
        } catch (e) {
          console.warn('Aviso ao checar créditos:', e);
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

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

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

      let lastError: any = null;
      let responseText: string | null = null;

      for (const model of CANDIDATE_MODELS) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
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
              break;
            }
          } catch (err: any) {
            lastError = err;
            const errMsg = String(err?.message || err || '');
            const isOverloaded = errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE') || errMsg.includes('429');
            console.warn(`Tentativa ${attempt} com modelo ${model} falhou: ${errMsg.slice(0, 150)}`);
            if (isOverloaded && attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            } else {
              break;
            }
          }
        }

        if (responseText) {
          break;
        }
      }

      if (!responseText) {
        const parsedErr = typeof lastError?.message === 'string' ? lastError.message : '';
        let userFriendlyMsg = 'O serviço de reconhecimento por IA está enfrentando alta demanda temporária nos servidores do Google. A foto foi salva e você pode tentar novamente em instantes ou preencher os dados manualmente.';
        
        try {
          const jsonErr = JSON.parse(parsedErr);
          if (jsonErr?.error?.message) {
            userFriendlyMsg = `Servidores de IA temporariamente ocupados (${jsonErr.error.status || 503}). A foto foi anexada ao formulário. Tente o reconhecimento novamente em instantes ou preencha manualmente.`;
          }
        } catch (_) {}

        return res.status(503).json({
          success: false,
          error: userFriendlyMsg,
          code: 503,
          canRetry: true,
        });
      }

      let cleanedJsonText = responseText.trim();
      if (cleanedJsonText.startsWith('```json')) {
        cleanedJsonText = cleanedJsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedJsonText.startsWith('```')) {
        cleanedJsonText = cleanedJsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const data = JSON.parse(cleanedJsonText);
      return res.status(200).json({ 
        success: true, 
        data,
        creditsRemaining: creditsRemaining !== null ? creditsRemaining : undefined
      });
    } catch (error: any) {
      console.error('Erro na análise de produto por IA (Vercel):', error);
      return res.status(500).json({
        success: false,
        error: error?.message || 'Falha ao analisar a foto do produto com Inteligência Artificial.',
      });
    }
  }

  return res.status(404).json({ success: false, error: 'Ação não encontrada.' });
}
