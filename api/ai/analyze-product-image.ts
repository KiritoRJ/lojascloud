import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://lawcmqsjhwuhogsukhbf.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_c2wQfanSj96FRWqoCq9KIw_2FhxuRBv';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Obtém chave da API do Gemini (procura em variáveis de ambiente e no banco de dados como fallback)
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

// Funções para manipulação de créditos de IA
const getAICreditsFromDB = async (tenantId: string): Promise<number> => {
  try {
    const { data } = await supabase
      .from('cloud_data')
      .select('data_json')
      .eq('tenant_id', tenantId)
      .eq('store_key', 'ai_credits')
      .maybeSingle();

    if (data?.data_json && typeof data.data_json.credits === 'number') {
      return Math.max(0, data.data_json.credits);
    }
  } catch (_) {}
  return 0;
};

const consumeAICreditInDB = async (tenantId: string): Promise<{ success: boolean; remainingCredits: number }> => {
  try {
    const current = await getAICreditsFromDB(tenantId);
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
          last_used_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id,store_key' });

    return { success: true, remainingCredits: updatedCredits };
  } catch (e) {
    console.error('Erro ao debitar crédito de IA:', e);
    return { success: false, remainingCredits: 0 };
  }
};

// Lista de modelos Gemini em cascata de versões mais recentes para as anteriores
const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
];

export default async function handler(req: any, res: any) {
  // Suporte a CORS para requisições Vercel
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { imageBase64, mimeType, tenantId } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'Nenhuma imagem foi enviada para análise.' });
    }

    let requirePaidCredits = false;

    // Se houver tenantId, verifica permissões da loja no SuperAdmin
    if (tenantId) {
      try {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('id, store_name, enabled_features')
          .eq('id', tenantId)
          .maybeSingle();

        if (tenantData) {
          // Verifica se a funcionalidade de IA está desativada para a loja
          if (tenantData.enabled_features && tenantData.enabled_features.aiFeature === false) {
            return res.status(403).json({
              success: false,
              error: 'O recurso de Inteligência Artificial está desativado para esta loja pelo administrador.',
            });
          }

          // Se aiRequirePaidCredits for true, a loja só usa créditos pagos
          // Se for false ou indefinido (padrão), o modo gratuito da IA permanece ativo!
          requirePaidCredits = tenantData.enabled_features?.aiRequirePaidCredits === true;
        }
      } catch (err) {
        console.warn('Aviso ao consultar tenant no Supabase:', err);
      }
    }

    // Se a opção de créditos pagos estiver ativada, valida se a loja tem saldo disponível
    if (tenantId && requirePaidCredits) {
      const currentCredits = await getAICreditsFromDB(tenantId);
      if (currentCredits <= 0) {
        return res.status(402).json({
          success: false,
          error: 'Seus créditos pagos de Inteligência Artificial acabaram. Adquira um novo pacote no painel de estoque ou solicite ao administrador a liberação do modo gratuito.',
          code: 'INSUFFICIENT_CREDITS',
          requirePaidCredits: true,
          currentCredits: 0,
        });
      }
    }

    const apiKey = await getGeminiApiKey();
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'Chave de API do Gemini não configurada no servidor. Configure a variável GEMINI_API_KEY ou defina no painel SuperAdmin.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    let cleanBase64 = imageBase64;
    let detectedMime = mimeType || 'image/jpeg';
    if (cleanBase64.includes(';base64,')) {
      const parts = cleanBase64.split(';base64,');
      cleanBase64 = parts[1];
      const match = parts[0].match(/data:(.*?)$/);
      if (match) detectedMime = match[1];
    }

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
    let parsedResult: any = null;
    let successfulModel: string | null = null;

    // Itera pela cascata de modelos: se o mais recente limitar, passa para a versão anterior sucessivamente
    for (const model of CANDIDATE_MODELS) {
      try {
        console.log(`[Gemini AI] Tentando modelo: ${model}...`);
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

        let responseText = response?.text || '';
        responseText = responseText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();

        if (responseText) {
          try {
            parsedResult = JSON.parse(responseText);
            successfulModel = model;
            console.log(`[Gemini AI] Sucesso com modelo: ${model}`);
            break;
          } catch (jsonErr) {
            console.warn(`[Gemini AI] Falha ao fazer parse do JSON do modelo ${model}:`, jsonErr);
          }
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err || '');
        console.warn(`[Gemini AI] Modelo ${model} atingiu limite ou erro: ${errMsg.slice(0, 160)}`);
        // Continua para a versão anterior da lista
      }
    }

    if (!parsedResult) {
      const parsedErr = typeof lastError?.message === 'string' ? lastError.message : '';
      let userFriendlyMsg = 'Os servidores de IA atingiram a cota temporária em todos os modelos disponíveis. Tente novamente em alguns instantes.';
      
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

    // Se o uso de créditos pagos estiver ativado para a loja, debita 1 crédito
    let creditsRemaining: number | undefined = undefined;
    if (tenantId && requirePaidCredits) {
      try {
        const consumeResult = await consumeAICreditInDB(tenantId);
        if (consumeResult.success) {
          creditsRemaining = consumeResult.remainingCredits;
        }
      } catch (e) {
        console.warn('Aviso ao debitar crédito de IA:', e);
      }
    } else if (tenantId) {
      // Modo Gratuito: apenas busca os créditos atuais sem gastar nada
      try {
        creditsRemaining = await getAICreditsFromDB(tenantId);
      } catch (_) {}
    }

    return res.status(200).json({
      success: true,
      data: parsedResult,
      modelUsed: successfulModel,
      isFreeMode: !requirePaidCredits,
      creditsRemaining,
    });

  } catch (err: any) {
    console.error('Erro interno na rota de IA:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Erro interno ao processar a imagem do produto.',
    });
  }
}
